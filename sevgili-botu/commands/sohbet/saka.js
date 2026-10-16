const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { saka } = require('../../utils/ai');
const { error, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('saka').setDescription('Sevgilin sana saka yapsin'),

    async execute(interaction) {
        await interaction.deferReply();
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.editReply({ embeds: [error('Once karakter olustur!')] });

        try {
            const cevap = await saka(user.karakter);
            await db.addSevgi(interaction.user.id, config.sevgi.saka);
            await db.ekleGecmis(interaction.user.id, 'assistant', cevap);
            await interaction.editReply({ embeds: [ask(`${user.karakter.isim} Saka Yapiyor`, cevap)] });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Saka yapamadim, tekrar dener misin?')] });
        }
    }
};
