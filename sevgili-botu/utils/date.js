// Date Sahne Yonetimi
const config = require('../config');
const ai = require('./ai');

function mekanBul(mekanId) {
    return config.mekanlar.find(m => m.id === mekanId);
}

function mekanlarListesi() {
    return config.mekanlar.map(m =>
        `${m.emoji} **${m.isim}** - ${m.fiyat === 0 ? 'Ucretsiz' : m.fiyat + ' 💎'} (Seviye ${m.minSeviye}+)`
    ).join('\n');
}

function mekanAcikMi(mekan, seviye) {
    return seviye >= mekan.minSeviye;
}

// Date baslat
async function dateBaslat(user, mekan, interaction) {
    const sahne = await ai.dateSahnesi(
        `${mekan.isim} (${mekan.emoji})`,
        user.karakter,
        user.iliski,
        null,
        'Date yeni basliyor, karsilama sahnesi yaz. Mekana vardiginizi ve ilk bakisleri anlat.'
    );
    return sahne;
}

// Date devam (kullanici secim yapti)
async function dateDevam(user, kullaniciSecim) {
    const date = user.aktifDate;
    if (!date) return null;

    const mekan = mekanBul(date.mekanId);
    if (!mekan) return null;

    const sahne = await ai.dateSahnesi(
        `${mekan.isim} (${mekan.emoji}) - Adim ${date.adim + 1}`,
        user.karakter,
        user.iliski,
        kullaniciSecim,
        date.baglam || 'Date devam ediyor.'
    );

    return sahne;
}

// Date bitir ve ozet olustur
async function dateBitir(user) {
    const date = user.aktifDate;
    if (!date) return null;

    const mekan = mekanBul(date.mekanId);
    if (!mekan) return null;

    // Sevgi bonusunu hesapla
    const sevgiBonus = mekan.sevgiBonus + Math.floor(date.adim * 2);
    const ozelAn = await ai.dateSahnesi(
        `${mekan.isim} - Date bitisi`,
        user.karakter,
        user.iliski,
        'Date bitiyor',
        'Date bitiyor, ayrilik sahnesi yaz. Kisa ve duygusal olsun, ozel bir an yarat.'
    );

    return {
        mekan,
        kazanilanSevgi: sevgiBonus,
        harcama: mekan.fiyat,
        ozelAn
    };
}

module.exports = {
    mekanBul,
    mekanlarListesi,
    mekanAcikMi,
    dateBaslat,
    dateDevam,
    dateBitir
};
