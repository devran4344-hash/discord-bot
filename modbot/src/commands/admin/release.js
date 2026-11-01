'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getManagerTeam, getPlayerTeam, TRANSFER_LOG_CHANNEL, UYE_ROLU } = require('../../utils/transferConfig');
const { getPlayer, releasePlayer } = require('../../utils/transferDB');

module.exports = {
    name: 'release',
    data: new SlashCommandBuilder()
        .setName('release')
        .setDescription('Oyuncuyu takımdan çıkarır (onay gerekmez)')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Release edilecek oyuncu')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('sebep')
            .setDescription('Release sebebi (opsiyonel)')
            .setRequired(false)
            .setMaxLength(200)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild  = interaction.guild;
        const exec   = interaction.member;
        const target = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const sebep  = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!target) {
            return interaction.editReply({ embeds: [errEmbed('Oyuncu Bulunamadı', 'Bu kullanıcı sunucuda bulunamadı.')] });
        }

        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({
                embeds: [errEmbed('Yetki Yetersiz', 'Bu komutu kullanmak için bir takımın **Başkanı** veya **Başkan Yardımcısı** olman gerekiyor.')],
            });
        }

        const playerTeam = getPlayerTeam(target);
        if (!playerTeam) {
            return interaction.editReply({
                embeds: [errEmbed('Oyuncu Takımda Değil', `**${target.user.username}** herhangi bir takımda kayıtlı değil.`)],
            });
        }
        if (playerTeam.id !== managerTeam.id) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Yetki Yetersiz',
                    `**${target.user.username}** senin takımında (**${managerTeam.name}**) değil.\n` +
                    `> Oyuncu şu an **${playerTeam.name}** takımında.`,
                )],
            });
        }

        // Oyuncu verilerini al (maç bilgisi için)
        const playerData = await getPlayer(guild.id, target.id);
        const matchCount = playerData?.matchesPlayed || 0;
        const isLoaned   = playerData?.isLoaned || false;

        // ── Rol işlemleri ────────────────────────────────────────────────────
        try {
            await target.roles.remove(managerTeam.playerRole).catch(() => {});
            await target.roles.remove(managerTeam.viceRole).catch(() => {});
            if (isLoaned && playerData?.loanData?.toTeamId) {
                const { getTeamById } = require('../../utils/transferConfig');
                const loanTeam = getTeamById(playerData.loanData.toTeamId);
                if (loanTeam) await target.roles.remove(loanTeam.playerRole).catch(() => {});
            }
            await target.roles.add(UYE_ROLU).catch(() => {});
        } catch (e) {
            return interaction.editReply({
                embeds: [errEmbed('Rol Hatası', `Rol işlemi başarısız: \`${e.message}\`\n> Bot rol hiyerarşisini kontrol et.`)],
            });
        }

        // ── Firebase ─────────────────────────────────────────────────────────
        await releasePlayer(guild.id, target.id);

        // ── Oyuncuya DM ──────────────────────────────────────────────────────
        try {
            await target.user.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle('📋 Transfer Bildirimi — Release')
                    .setDescription(
                        `**${managerTeam.name}** takımından release edildin.\n\n` +
                        `> **Sebep:** ${sebep}\n` +
                        `> **Bu takımda oynadığın maç:** ${matchCount}\n\n` +
                        `Artık serbest ajansın. Yeni bir takımdan teklif bekleyebilirsin.`
                    )
                    .setFooter({ text: `${guild.name} Transfer Sistemi` })
                    .setTimestamp()],
            });
        } catch { /* DM kapalı, devam et */ }

        // ── Onay yanıtı ──────────────────────────────────────────────────────
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('✅ Release Başarılı')
                .setDescription(`**${target.user.username}** → **${managerTeam.name}**'ndan release edildi.`)
                .addFields(
                    { name: '👤 Oyuncu',         value: `<@${target.id}>`,       inline: true },
                    { name: '⚽ Takımdaki Maç',  value: `\`${matchCount}\``,      inline: true },
                    { name: '📋 Sebep',           value: sebep,                   inline: false },
                )
                .setTimestamp()],
        });

        // ── Transfer log ──────────────────────────────────────────────────────
        const logCh = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
        if (!logCh) return;

        await logCh.send({
            embeds: [new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle('📋 TRANSFER | RELEASE')
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`**${target.user.username}** serbest ajana dönüştü.`)
                .addFields(
                    { name: '👤 Oyuncu',         value: `<@${target.id}>\n\`${target.user.username}\``, inline: true  },
                    { name: '🏟️ Eski Takım',    value: `**${managerTeam.name}**`,                      inline: true  },
                    { name: '⚽ Takımdaki Maç',  value: `\`${matchCount}\``,                            inline: true  },
                    { name: '📋 Sebep',           value: sebep,                                         inline: false },
                    { name: '👮 İşlemi Yapan',   value: `<@${exec.id}>\n\`${exec.user.username}\``,    inline: true  },
                    { name: '🔄 Durum',          value: isLoaned ? '⚠️ Loan devam ediyordu' : '✅ Normal release', inline: true },
                )
                .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
                .setTimestamp()],
        }).catch(() => {});
    },
};

function errEmbed(title, desc) {
    return new EmbedBuilder().setColor(0xed4245).setTitle(`❌ ${title}`).setDescription(desc).setTimestamp();
}
