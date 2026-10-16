const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, success, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hatira')
        .setDescription('Karakterine bir sey ogret')
        .addStringOption(opt =>
            opt.setName('anahtar').setDescription('Ne ogretmek istersin? (ornek: dogum_gunum)').setRequired(true).setMaxLength(50)
        )
        .addStringOption(opt =>
            opt.setName('deger').setDescription('Degeri (ornek: 12 Mayis)').setRequired(true).setMaxLength(200)
        ),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const anahtar = interaction.options.getString('anahtar').replace(/\s+/g, '_').toLowerCase();
        const deger = interaction.options.getString('deger');

        await db.ekleHatura(interaction.user.id, anahtar, deger);

        return interaction.reply({
            embeds: [success(`**${user.karakter.isim}** artik sunu biliyor:\n**${anahtar}**: ${deger}`)]
        });
    }
};
