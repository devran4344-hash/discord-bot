const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const { error, success, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('sifirla').setDescription('Tum verilerini sifirla'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user) return interaction.reply({ embeds: [error('Kayitli verin yok.')], ephemeral: true });

        const embed = baseEmbed(config.colors.error)
            .setTitle('⚠️ Emin misin?')
            .setDescription('Karakterin, sevgi puanin, anilarin ve cuzdanin **tamamen** silinecek!\n\nBu islem **geri alinamaz**.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sifirla_onayla').setLabel('Evet, Sifirla').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('sifirla_iptal').setLabel('Hayir, Iptal').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const cevap = await msg.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        }).catch(() => null);

        if (!cevap) return msg.edit({ components: [] }).catch(() => {});
        await cevap.deferUpdate();

        if (cevap.customId === 'sifirla_iptal') {
            return msg.edit({ embeds: [success('Sifirlama iptal edildi.')], components: [] });
        }

        await db.createUser(interaction.user.id, interaction.user.username);
        return msg.edit({ embeds: [success('Tum verilerin sifirlandi. Yeni bir baslangic! 💕')], components: [] });
    }
};
