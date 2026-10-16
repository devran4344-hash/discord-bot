const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('surpriz').setDescription('Sevgilin sana surpriz yapsin'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const surprizler = [
            `*arkasindan bir hediye kutusu cikardi* Bu senin icin ${user.karakter.hitap}! 🎁`,
            `*kucuk bir not uzatti* Uzerinde "Seni cok seviyorum" yaziyor 💌`,
            `*elini arkana goturdu ve bir cicek cikardi* Bu cicek senin gibi guzel 🌹`,
            `*sana bir bileklik uzatti* Bunu gorunce seni hatirladim, takmak ister misin? 💫`,
            `*surpriz bir opucuk kondurdu yanagina* Yakaladin beni! 😘`
        ];
        const cevap = surprizler[Math.floor(Math.random() * surprizler.length)];
        await db.addSevgi(interaction.user.id, 12);
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({ embeds: [ask(`${user.karakter.isim} Surpriz Yapti!`, cevap)] });
    }
};
