// Sevgi Puani ve Iliski Seviyesi Hesaplama
const config = require('../config');

function getIliskiSeviyesi(sevgiPuani) {
    let current = config.iliskiSeviyeleri[0];
    for (const s of config.iliskiSeviyeleri) {
        if (sevgiPuani >= s.minSevgi) current = s;
    }
    return current;
}

function getSonrakiSeviye(sevgiPuani) {
    const current = getIliskiSeviyesi(sevgiPuani);
    return config.iliskiSeviyeleri.find(s => s.seviye === current.seviye + 1) || null;
}

function createSevgiBar(mevcut, min, max) {
    if (!max) return '[■■■■■■■■■■] MAX';
    const total = max - min;
    const progress = mevcut - min;
    const yuzde = Math.min(1, Math.max(0, progress / total));
    const dolu = Math.round(yuzde * 10);
    const bos = 10 - dolu;
    return `[${'■'.repeat(dolu)}${'□'.repeat(bos)}] ${mevcut}/${max}`;
}

function ruhHaliHesapla(sevgiPuani, sonMesajZaman, kavgaSebebi) {
    if (kavgaSebebi) return 'kizgin';
    if (!sonMesajZaman) return 'mutlu';

    const gun = (Date.now() - sonMesajZaman) / (1000 * 60 * 60 * 24);
    if (gun >= 3) return 'uzgun';
    if (gun >= 1) return 'kirgin';
    if (sevgiPuani > 500) return 'romantik';
    return 'mutlu';
}

function ruhHaliEmoji(ruh) {
    const map = {
        mutlu: '😊',
        romantik: '🥰',
        kizgin: '😤',
        uzgun: '🥺',
        kirgin: '😔'
    };
    return map[ruh] || '😊';
}

module.exports = {
    getIliskiSeviyesi,
    getSonrakiSeviye,
    createSevgiBar,
    ruhHaliHesapla,
    ruhHaliEmoji
};
