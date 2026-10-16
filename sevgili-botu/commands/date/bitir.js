const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const dateUtil = require('../../utils/date');
const { error, dateOzeti } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('date-bitir').setDescription('Date i bitir ve ozeti gor'),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const user = await db.getUser(userId);
        if (!user || !user.aktifDate) return interaction.editReply({ embeds: [error('Aktif date yok!')] });

        const ozet = await dateUtil.dateBitir(user);
        if (!ozet) return interaction.editReply({ embeds: [error('Date ozeti olusturulamadi.')] });

        await db.addSevgi(userId, ozet.kazanilanSevgi);
        await db.istatistikArttir(userId, 'date');
        await db.ekleAni(userId, `${ozet.mekan.isim} Date`, ozet.ozelAn);
        await db.addPara(userId, config.gunluk.dateOdulu);
        await db.clearDate(userId);

        return interaction.editReply({ embeds: [dateOzeti(ozet.mekan, ozet.kazanilanSevgi, ozet.ozelAn, ozet.harcama)] });
    }
};
