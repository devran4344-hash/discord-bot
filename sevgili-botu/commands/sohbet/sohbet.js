const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { sohbet } = require('../../utils/ai');
const { error, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sohbet')
        .setDescription('Sevgilinle konus')
        .addStringOption(opt =>
            opt.setName('mesaj').setDescription('Ne soylemek istersin?').setRequired(true).setMaxLength(500)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const mesaj = interaction.options.getString('mesaj');

        let user = await db.getUser(userId) || await db.createUser(userId, interaction.user.username);
        if (!user.karakter) {
            return interaction.editReply({ embeds: [error('Once karakter olustur! `/karakter olustur`')] });
        }

        try {
            const cevap = await sohbet(mesaj, user.karakter, user.iliski, user.hatiralar, user.gecmis);
            await db.ekleGecmis(userId, 'user', mesaj);
            await db.ekleGecmis(userId, 'assistant', cevap);
            await db.guncelleSonMesaj(userId);
            await db.istatistikArttir(userId, 'mesaj');
            await db.addSevgi(userId, config.sevgi.guzelMesaj);

            const embed = baseEmbed(config.colors.ask)
                .setAuthor({ name: user.karakter.isim })
                .setDescription(cevap);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ embeds: [error('Bir hata oldu, tekrar dener misin?')] });
        }
    }
};
