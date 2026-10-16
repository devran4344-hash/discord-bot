const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('cuzdan').setDescription('Kalp cuzdanini goster'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const embed = baseEmbed(config.colors.main)
            .setTitle('💎 Kalp Cuzdanin')
            .setDescription(`**${user.cuzdan || 0} 💎**\n\nKalp kazanmak icin:\n• Gunluk giris: +${config.gunluk.girisOdulu}\n• Mesaj atma: +${config.gunluk.mesajOdulu} (10 mesajda)\n• Date yapma: +${config.gunluk.dateOdulu}`);

        return interaction.reply({ embeds: [embed] });
    }
};
