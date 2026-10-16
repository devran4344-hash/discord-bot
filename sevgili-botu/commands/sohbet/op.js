const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('op').setDescription('Sevgilini op'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        await db.addSevgi(interaction.user.id, config.sevgi.op);
        await db.ekleGecmis(interaction.user.id, 'user', '*seni optu*');

        const mesajlar = [
            `*kizardi ve gulumsedi* Ben de seni optum ${user.karakter.hitap} 💋`,
            `*ellerini yuzune kapatti* Ay utanıyorum! 😳💕`,
            `*sana sarildi ve yanagina bir opucuk kondurdu* 💋✨`
        ];
        const cevap = mesajlar[Math.floor(Math.random() * mesajlar.length)];
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({ embeds: [ask(`${user.karakter.isim} Seni Opuyor`, cevap)] });
    }
};
