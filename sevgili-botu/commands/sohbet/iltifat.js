const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iltifat')
        .setDescription('Sevgiline iltifat et')
        .addStringOption(opt => opt.setName('mesaj').setDescription('Iltifatin').setRequired(true).setMaxLength(200)),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const mesaj = interaction.options.getString('mesaj');
        await db.addSevgi(interaction.user.id, config.sevgi.iltifat);
        await db.ekleGecmis(interaction.user.id, 'user', `Iltifat: ${mesaj}`);

        const cevap = `*kizardi ve utangac bir sekilde gulumsedi* Ay sen boyle konusunca ne diyecegimi bilemiyorum... 🥰\n\n"${mesaj}" demen kalbimi eritti ${user.karakter.hitap} 💕`;
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({ embeds: [ask('Kalbi Eridi', cevap)] });
    }
};
