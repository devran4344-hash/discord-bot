const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('anilar').setDescription('Tum anilarinizi listele'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const anilar = user.anilar || [];
        if (anilar.length === 0) {
            return interaction.reply({ embeds: [baseEmbed(config.colors.info).setTitle('📖 Ani Defteri').setDescription('Henuz aniniz yok. Date yaparak ani biriktirin!')] });
        }

        let liste = '';
        for (let i = Math.max(0, anilar.length - 10); i < anilar.length; i++) {
            const a = anilar[i];
            const tarih = new Date(a.tarih).toLocaleDateString('tr-TR');
            liste += `**${tarih}** - ${a.baslik}\n> ${a.detay.substring(0, 100)}...\n\n`;
        }

        const embed = baseEmbed(config.colors.ask)
            .setTitle(`📖 Ani Defteri (${anilar.length} ani)`)
            .setDescription(liste || 'Ani yok.')
            .setFooter({ text: 'Son 10 ani gosteriliyor' });

        return interaction.reply({ embeds: [embed] });
    }
};
