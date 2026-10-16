const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, success } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('gunluk').setDescription('Gunluk kalp odulunu al'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const bugun = new Date().toISOString().split('T')[0];
        if (user.sonGunluk === bugun) {
            return interaction.reply({ embeds: [error('Bugun zaten odulunu aldin! Yarin tekrar gel 💕')], ephemeral: true });
        }

        await db.updateUser(interaction.user.id, { sonGunluk: bugun });
        await db.addPara(interaction.user.id, config.gunluk.girisOdulu);

        return interaction.reply({
            embeds: [success(`Gunluk odulun: **+${config.gunluk.girisOdulu} 💎**\nYeni cuzdanin: **${(user.cuzdan || 0) + config.gunluk.girisOdulu} 💎**`)]
        });
    }
};
