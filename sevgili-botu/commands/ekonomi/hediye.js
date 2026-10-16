const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, success, ask } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hediye')
        .setDescription('Sevgiline hediye al')
        .addStringOption(opt =>
            opt.setName('hediye')
                .setDescription('Ne almak istersin? (cicek, kolye, cikolata...)')
                .setRequired(true)
                .setMaxLength(100)
        ),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const hediye = interaction.options.getString('hediye');
        const fiyat = 100;

        if ((user.cuzdan || 0) < fiyat) {
            return interaction.reply({ embeds: [error(`Yeterli kalbin yok! **${fiyat} 💎** gerekli, sende **${user.cuzdan || 0} 💎** var.`)], ephemeral: true });
        }

        await db.addPara(interaction.user.id, -fiyat);
        await db.addSevgi(interaction.user.id, config.sevgi.hediye);
        await db.istatistikArttir(interaction.user.id, 'hediye');
        await db.ekleGecmis(interaction.user.id, 'user', `Hediye aldi: ${hediye}`);

        const cevap = `*gozleri parladı* Gercekten mi?! Bana **${hediye}** aldin! 🥰\n\n*kucakladi seni* Seni cok seviyorum ${user.karakter.hitap}! 💕`;
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({
            embeds: [ask(`Hediye Verdin: ${hediye}`, cevap + `\n\n💰 Kalan: ${(user.cuzdan || 0) - fiyat} 💎`)]
        });
    }
};
