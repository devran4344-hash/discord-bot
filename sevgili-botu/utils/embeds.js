// Tum Embed Tasarimlari
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getIliskiSeviyesi, getSonrakiSeviye, createSevgiBar, ruhHaliEmoji } = require('./sevgi');

const FOOTER = config.footerText;

function baseEmbed(color) {
    return new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: FOOTER })
        .setTimestamp();
}

function success(desc) {
    return baseEmbed(config.colors.success)
        .setTitle(`${config.botEmoji} Basarili`)
        .setDescription(desc);
}

function error(desc) {
    return baseEmbed(config.colors.error)
        .setTitle(`❌ Hata`)
        .setDescription(desc);
}

function info(title, desc) {
    return baseEmbed(config.colors.info)
        .setTitle(`${config.botEmoji} ${title}`)
        .setDescription(desc);
}

function ask(title, desc) {
    return baseEmbed(config.colors.ask)
        .setTitle(`💕 ${title}`)
        .setDescription(desc);
}

function owner(title, desc) {
    return baseEmbed(config.colors.owner)
        .setTitle(`👑 ${title}`)
        .setDescription(desc);
}

// Karakter Profili
function karakterProfil(karakter, iliski) {
    const seviyeData = getIliskiSeviyesi(iliski.sevgiPuani);
    const sonraki = getSonrakiSeviye(iliski.sevgiPuani);
    const sevgiBar = createSevgiBar(
        iliski.sevgiPuani,
        seviyeData.minSevgi,
        sonraki ? sonraki.minSevgi : null
    );
    const ruh = ruhHaliEmoji(iliski.ruhHali);

    return baseEmbed(config.colors.main)
        .setTitle(`${config.botEmoji} ${karakter.isim} - Karakter Profili`)
        .addFields(
            { name: '👤 Isim', value: karakter.isim, inline: true },
            { name: '🎂 Yas', value: `${karakter.yas}`, inline: true },
            { name: '💝 Hitap', value: karakter.hitap, inline: true },
            { name: '🎭 Kisilik', value: karakter.kisilik, inline: true },
            { name: '👗 Gorunum', value: karakter.gorunum || 'Belirtilmemis', inline: true },
            { name: '🎨 Hobiler', value: (karakter.hobiler || []).join(', ') || 'Yok', inline: false },
            { name: `${ruh} Ruh Hali`, value: iliski.ruhHali || 'mutlu', inline: true },
            { name: '💕 Sevgi Puani', value: sevgiBar, inline: false },
            { name: '📈 Iliski Seviyesi', value: `**${seviyeData.seviye}** - ${seviyeData.isim}`, inline: true },
            { name: '📅 Iliski Suresi', value: hesaplaSure(iliski.baslangic), inline: true }
        );
}

function hesaplaSure(baslangic) {
    if (!baslangic) return 'Bilinmiyor';
    const fark = Date.now() - new Date(baslangic).getTime();
    const gun = Math.floor(fark / (1000 * 60 * 60 * 24));
    if (gun === 0) return 'Bugun tanistiniz';
    if (gun < 30) return `${gun} gun`;
    const ay = Math.floor(gun / 30);
    return `${ay} ay ${gun % 30} gun`;
}

// Iliski Durumu
function iliskiDurumu(karakter, iliski, istatistik) {
    const seviyeData = getIliskiSeviyesi(iliski.sevgiPuani);
    const sonraki = getSonrakiSeviye(iliski.sevgiPuani);
    const sevgiBar = createSevgiBar(
        iliski.sevgiPuani,
        seviyeData.minSevgi,
        sonraki ? sonraki.minSevgi : null
    );
    const ruh = ruhHaliEmoji(iliski.ruhHali);

    let kavgaText = iliski.kavgaSebebi
        ? `⚠️ Kizgin! Sebep: ${iliski.kavgaSebebi}\n/ozur yazarak ozur dile.`
        : '✅ Araniz iyi!';

    return baseEmbed(config.colors.ask)
        .setTitle(`💕 ${karakter.isim} ile Iliskiniz`)
        .addFields(
            { name: `${ruh} Ruh Hali`, value: iliski.ruhHali || 'mutlu', inline: true },
            { name: '📈 Seviye', value: `${seviyeData.seviye} - ${seviyeData.isim}`, inline: true },
            { name: '💕 Sevgi Puani', value: sevgiBar, inline: false },
            { name: '📊 Istatistikler', value: `Toplam mesaj: **${istatistik.toplamMesaj || 0}**\nToplam date: **${istatistik.toplamDate || 0}**\nKavga sayisi: **${istatistik.kavgaSayisi || 0}**`, inline: false },
            { name: '💌 Durum', value: kavgaText, inline: false }
        );
}

// Date Ozeti
function dateOzeti(mekan, kazanilanSevgi, ozelAn, harcama) {
    return baseEmbed(config.colors.date)
        .setTitle(`${mekan.emoji} ${mekan.isim} Date Bitti`)
        .setDescription(`**Ozel An:** ${ozelAn}`)
        .addFields(
            { name: '💰 Harcama', value: `${harcama} 💎`, inline: true },
            { name: '❤️ Kazanilan Sevgi', value: `+${kazanilanSevgi}`, inline: true }
        );
}

// Date Basladi
function dateBasladi(mekan) {
    return baseEmbed(config.colors.date)
        .setTitle(`${mekan.emoji} ${mekan.isim} Date Basliyor!`)
        .setDescription(`Kapi acilir, ${config.botName} seni gorur ve gulumsemesiyle karsilar...`)
        .setFooter({ text: `${mekan.isim} | ${mekan.fiyat} 💎` });
}

module.exports = {
    baseEmbed,
    success,
    error,
    info,
    ask,
    owner,
    karakterProfil,
    iliskiDurumu,
    dateOzeti,
    dateBasladi,
    hesaplaSure
};
