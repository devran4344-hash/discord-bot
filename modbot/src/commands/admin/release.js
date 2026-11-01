'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManagerTeam, getPlayerTeam, TRANSFER_LOG_CHANNEL, UYE_ROLU } = require('../../utils/transferConfig');
const { getPlayer, releasePlayer } = require('../../utils/transferDB');

module.exports = {
    name: 'release',
    data: new SlashCommandBuilder()
        .setName('release')
        .setDescription('Oyuncuyu takımdan çıkarır')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Release edilecek oyuncu')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('sebep')
            .setDescription('Release sebebi')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild  = interaction.guild;
        const exec   = interaction.member;
        const target = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const sebep  = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!target) return interaction.editReply({ content: '❌ Oyuncu sunucuda bulunamadı.' });

        // ── Komutu kullanan kişinin takımını bul ──
        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({ content: '❌ Bu komutu kullanmak için bir takımın Başkanı veya Başkan Yardımcısı olman gerekiyor.' });
        }

        // ── Hedef oyuncunun bu takımda olup olmadığını kontrol et ──
        const playerTeam = getPlayerTeam(target);
        if (!playerTeam || playerTeam.id !== managerTeam.id) {
            return interaction.editReply({ content: `❌ **${target.user.username}** senin takımında (**${managerTeam.name}**) değil.` });
        }

        // ── Rol işlemleri ──
        try {
            // Takım oyuncu rolünü al
            await target.roles.remove(managerTeam.playerRole).catch(() => {});
            // Eğer BY ise BY rolünü de al
            await target.roles.remove(managerTeam.viceRole).catch(() => {});
            // Üye rolünü geri ver
            await target.roles.add(UYE_ROLU).catch(() => {});
        } catch (e) {
            return interaction.editReply({ content: `❌ Rol işlemi başarısız: \`${e.message}\`` });
        }

        // ── Firebase'den sil ──
        await releasePlayer(guild.id, target.id);

        // ── Onay yanıtı ──
        await interaction.editReply({ content: `✅ **${target.user.username}** → **${managerTeam.name}**'ndan release edildi.` });

        // ── Transfer log embed ──
        const logChannel = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('📋 TRANSFER | RELEASE')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Oyuncu',       value: `<@${target.id}>\n\`${target.user.username}\``, inline: true },
                { name: '🏟️ Takım',       value: `**${managerTeam.name}**`,                       inline: true },
                { name: '📋 Sebep',        value: sebep,                                           inline: false },
                { name: '👮 İşlemi Yapan', value: `<@${exec.id}>\n\`${exec.user.username}\``,     inline: true },
            )
            .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    },
};
