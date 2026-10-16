const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tum Kawai komutlarini listeler'),

    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setTitle('🌸 Kawai — Komut Rehberi')
            .setDescription('Kawai, RSS kocun! Iste tum komutlar:')
            .addFields(
                {
                    name: '🤖 AI Komutlari',
                    value:
                        '`/sor` — RSS hakkinda soru sor\n' +
                        '`/ss` — Ekran goruntusu at, taktik al\n' +
                        '`/resim` — AI ile gorsel uret\n' +
                        '`/wiki` — RSS wiki bilgisi al\n' +
                        '`/ara` — Internette arastirma yap\n' +
                        '`/taktik` — Anlik taktik onerisi\n' +
                        '`/analiz` — Mac istatistigi yorumlat',
                    inline: false
                },
                {
                    name: '📊 Profil',
                    value:
                        '`/profil` — Profilini gor\n' +
                        '`/gorevler` — Gunluk gorevlerini gor\n' +
                        '`/liderlik` — Sunucu liderlik tablosu\n' +
                        '`/seviye` — Kisa seviye gosterimi',
                    inline: false
                },
                {
                    name: 'ℹ️ Bilgi',
                    value:
                        '`/yardim` — Bu mesaj\n' +
                        '`/kawai` — Kawai kendini tanitir\n' +
                        '`/ping` — Bot gecikmesi',
                    inline: false
                }
            )
            .setFooter({ text: config.footerText })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
