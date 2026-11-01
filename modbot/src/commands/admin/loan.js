'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
    getManagerTeam, getPlayerTeam, getTeamById,
    TRANSFER_LOG_CHANNEL, KADRO_LIMITI, TEAMS,
} = require('../../utils/transferConfig');
const { getPlayer, loanPlayer, getTeamPlayers } = require('../../utils/transferDB');

module.exports = {
    name: 'loan',
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Oyuncuyu başka bir takıma geçici loan eder (Kural 1: Maks 3 maç)')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Loan edilecek oyuncu')
            .setRequired(true)
        )
        .addIntegerOption(o => o
            .setName('kac_mac')
            .setDescription('Kaç maç oynatılacak? (1-3, Kural 1: Maks 3)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3)
        )
        .addStringOption(o => {
            const opt = o
                .setName('hedef_takim')
                .setDescription('Hangi takıma loan gidecek?')
                .setRequired(true);
            for (const t of TEAMS) opt.addChoices({ name: t.name, value: t.id });
            return opt;
        }),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild   = interaction.guild;
        const exec    = interaction.member;
        const target  = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const kacMac  = interaction.options.getInteger('kac_mac');
        const hedefId = interaction.options.getString('hedef_takim');

        if (!target) {
            return interaction.editReply({ embeds: [errEmbed('Oyuncu Bulunamadı', 'Bu kullanıcı sunucuda bulunamadı.')] });
        }
        if (target.id === exec.id) {
            return interaction.editReply({ embeds: [errEmbed('Geçersiz İşlem', 'Kendini loan edemezsin.')] });
        }

        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({
                embeds: [errEmbed('Yetki Yetersiz', 'Bu komutu kullanmak için bir takımın **Başkanı** veya **Başkan Yardımcısı** olman gerekiyor.')],
            });
        }

        const playerTeam = getPlayerTeam(target);
        if (!playerTeam || playerTeam.id !== managerTeam.id) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Oyuncu Takımında Değil',
                    `**${target.user.username}** senin takımında (**${managerTeam.name}**) değil.`,
                )],
            });
        }

        const playerData = await getPlayer(guild.id, target.id);
        if (playerData?.isLoaned) {
            const loanTeam = getTeamById(playerData.loanData?.toTeamId);
            return interaction.editReply({
                embeds: [errEmbed(
                    'Zaten Loanlanmış',
                    `**${target.user.username}** zaten **${loanTeam?.name || '?'}** takımında loan durumunda.\n` +
                    `> Kalan maç: **${playerData.loanData?.matchesLeft || '?'}**`,
                )],
            });
        }

        const hedefTeam = getTeamById(hedefId);
        if (!hedefTeam) {
            return interaction.editReply({ embeds: [errEmbed('Takım Bulunamadı', 'Hedef takım bulunamadı.')] });
        }
        if (hedefTeam.id === managerTeam.id) {
            return interaction.editReply({ embeds: [errEmbed('Geçersiz İşlem', 'Kendi takımına loan edemezsin.')] });
        }

        const hedefPlayers = await getTeamPlayers(guild.id, hedefTeam.id);
        if (hedefPlayers.length >= KADRO_LIMITI) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Hedef Takım Limiti Dolu',
                    `**${hedefTeam.name}** kadro limiti dolu (**${KADRO_LIMITI}/${KADRO_LIMITI}**).`,
                )],
            });
        }

        // ── Rol işlemleri ─────────────────────────────────────────────────────
        try {
            await target.roles.add(hedefTeam.playerRole);
        } catch (e) {
            return interaction.editReply({
                embeds: [errEmbed('Rol Hatası', `Rol verilemedi: \`${e.message}\``)],
            });
        }

        await loanPlayer(guild.id, target.id, managerTeam.id, hedefTeam.id, kacMac);

        // ── Oyuncuya DM ───────────────────────────────────────────────────────
        try {
            await target.user.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xfee75c)
                    .setTitle('📋 Transfer Bildirimi — Loan')
                    .setDescription(
                        `**${managerTeam.name}** takımı seni **${hedefTeam.name}** takımına loan etti!\n\n` +
                        `> **Asıl Takım:** ${managerTeam.name}\n` +
                        `> **Loan Takımı:** ${hedefTeam.name}\n` +
                        `> **Maç Sayısı:** ${kacMac} maç\n\n` +
                        `⚠️ Loan süren dolunca otomatik olarak asıl takımına dönersin.\n` +
                        `Her maçtan sonra \`/macoynadim\` komutunu kullanmayı unutma!`
                    )
                    .setFooter({ text: `${guild.name} Transfer Sistemi` })
                    .setTimestamp()],
            });
        } catch { /* DM kapalı */ }

        // ── Onay yanıtı ───────────────────────────────────────────────────────
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle('✅ Loan Başarılı')
                .setDescription(`**${target.user.username}** → **${hedefTeam.name}**'na **${kacMac} maçlık** loan edildi.`)
                .addFields(
                    { name: '👤 Oyuncu',         value: `<@${target.id}>`,         inline: true },
                    { name: '🏠 Asıl Takım',     value: `**${managerTeam.name}**`, inline: true },
                    { name: '🏟️ Loan Takımı',   value: `**${hedefTeam.name}**`,   inline: true },
                    { name: '⚽ Maç Sayısı',     value: `**${kacMac}** maç`,       inline: true },
                    { name: '📊 Hedef Kadro',    value: `\`${hedefPlayers.length + 1}/${KADRO_LIMITI}\``, inline: true },
                )
                .setFooter({ text: 'Kural 1: Maks 3 maç loan' })
                .setTimestamp()],
        });

        // ── Transfer log ──────────────────────────────────────────────────────
        const logCh = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
        if (!logCh) return;

        await logCh.send({
            embeds: [new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle('📋 TRANSFER | LOAN')
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 Oyuncu',         value: `<@${target.id}>\n\`${target.user.username}\``,  inline: true  },
                    { name: '🏠 Asıl Takım',     value: `**${managerTeam.name}**`,                       inline: true  },
                    { name: '🏟️ Loan Takımı',   value: `**${hedefTeam.name}**`,                          inline: true  },
                    { name: '⚽ Maç Sayısı',     value: `**${kacMac}** maç`,                             inline: true  },
                    { name: '👮 İşlemi Yapan',   value: `<@${exec.id}>\n\`${exec.user.username}\``,      inline: true  },
                    { name: '📊 Hedef Kadro',    value: `\`${hedefPlayers.length + 1}/${KADRO_LIMITI}\``, inline: true  },
                )
                .setFooter({ text: `Transfer Sistemi • Kural 1: Maks 3 maç loan • ${new Date().toLocaleString('tr-TR')}` })
                .setTimestamp()],
        }).catch(() => {});
    },
};

function errEmbed(title, desc) {
    return new EmbedBuilder().setColor(0xed4245).setTitle(`❌ ${title}`).setDescription(desc).setTimestamp();
}
