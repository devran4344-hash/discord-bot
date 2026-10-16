const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('saril').setDescription('Sevgiline saril'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        await db.addSevgi(interaction.user.id, config.sevgi.saril);
        await db.ekleGecmis(interaction.user.id, 'user', '*sana sarildi*');

        const mesajlar = [
            `*sana sımsıkı sarıldı* Seni cok seviyorum ${user.karakter.hitap} 🥰`,
            `*basini omzuna koydu* Bu an hic bitmesin istiyorum... 💕`,
            `*seni kucakladi* Guvenli ve mutlu hissediyorum seninleyken 💗`
        ];
        const cevap = mesajlar[Math.floor(Math.random() * mesajlar.length)];
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({ embeds: [ask(`${user.karakter.isim} Sana Sariliyor`, cevap)] });
    }
};
