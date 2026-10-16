const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const dateUtil = require('../../utils/date');
const { error, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('date_devam')
        .setDescription('Aktif date e devam et')
        .addStringOption(opt =>
            opt.setName('secim').setDescription('Ne yapmak istersin?').setRequired(true).setMaxLength(300)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const secim = interaction.options.getString('secim');

        const user = await db.getUser(userId);
        if (!user || !user.aktifDate) return interaction.editReply({ embeds: [error('Aktif date yok!')] });

        const mekan = dateUtil.mekanBul(user.aktifDate.mekanId);
        const sahne = await dateUtil.dateDevam(user, secim);

        await db.setDate(userId, {
            ...user.aktifDate,
            adim: user.aktifDate.adim + 1,
            baglam: sahne
        });

        const embed = baseEmbed(config.colors.date)
            .setAuthor({ name: `${mekan.emoji} ${mekan.isim} | Adim ${user.aktifDate.adim + 1}` })
            .setDescription(sahne)
            .setFooter({ text: 'Date i bitirmek icin /date bitir' });

        return interaction.editReply({ embeds: [embed] });
    }
};
