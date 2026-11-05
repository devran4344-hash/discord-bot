'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GUILD SETTINGS — Her sunucunun kendi ayarları                     ║
// ║  Firebase: guild_settings/{guildId}                                ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { initFirebase } = require('./database');
const COL = 'guild_settings';
const db  = () => initFirebase();

// ── Varsayılan ayarlar ────────────────────────────────────────────────
const DEFAULTS = {
    // Roller
    roles: {
        admin:     null,   // Admin rol ID
        moderator: null,   // Moderatör rol ID
        muted:     null,   // Susturulan rol ID
        member:    null,   // Üye rol ID
    },

    // Log kanalları
    channels: {
        modLog:       null,   // Moderasyon log kanalı
        serverLog:    null,   // Sunucu log kanalı
        ticketLog:    null,   // Ticket log kanalı
        welcomeChannel: null, // Hoşgeldin kanalı
        botLog:       null,   // Bot log kanalı
    },

    // Aktif sistemler
    systems: {
        antiSpam:     true,
        antiLink:     true,
        antiRaid:     false,
        wordFilter:   true,
        ticket:       false,
        welcomeMsg:   false,
        leaveMsg:     false,
        reactionRole: false,
        autoMod:      true,
    },

    // Anti-spam ayarları
    antiSpam: {
        enabled:     true,
        maxMessages: 5,
        timeWindow:  5000,
    },

    // Anti-link ayarları
    antiLink: {
        enabled:   true,
        whitelist: ['discord.com', 'discord.gg', 'youtube.com', 'twitch.tv'],
    },

    // Küfür filtresi
    wordFilter: {
        enabled:    true,
        warnBefore: 3,
    },

    // Kayıt sistemi
    kayit: {
        enabled:       false,
        memberRoller:  [],
        logKanalId:    null,
        isimFormati:   '{isim} | {yas}',
    },

    // Ticket sistemi
    ticket: {
        enabled:          false,
        categoryId:       null,
        logChannelId:     null,
        maxTicketsPerUser: 1,
        askRating:        true,
    },

    // Hoşgeldin/Veda
    welcome: {
        enabled:   false,
        channelId: null,
        message:   'Hoşgeldin {user}! 🎉',
        bannerUrl: null,
    },
    leave: {
        enabled:   false,
        channelId: null,
        message:   '{user} sunucudan ayrıldı.',
    },

    // Kurulum tamamlandı mı?
    setupDone: false,
    setupAt:   null,
};

// ── Ayarları oku ──────────────────────────────────────────────────────
async function getSettings(guildId) {
    try {
        const doc = await db().collection(COL).doc(guildId).get();
        if (!doc.exists) return { ...DEFAULTS };
        // Varsayılanlarla birleştir — eksik alanlar default'tan gelsin
        return deepMerge(DEFAULTS, doc.data());
    } catch (e) {
        console.error('[guildSettings] getSettings hatası:', e.message);
        return { ...DEFAULTS };
    }
}

// ── Ayarları kaydet ───────────────────────────────────────────────────
async function saveSettings(guildId, data) {
    try {
        await db().collection(COL).doc(guildId).set(
            { ...data, updatedAt: Date.now() },
            { merge: true }
        );
    } catch (e) {
        console.error('[guildSettings] saveSettings hatası:', e.message);
    }
}

// ── Tek bir alan güncelle ─────────────────────────────────────────────
async function updateSetting(guildId, path, value) {
    try {
        // path: 'systems.antiSpam' → { 'systems.antiSpam': value }
        await db().collection(COL).doc(guildId).set(
            { [path]: value, updatedAt: Date.now() },
            { merge: true }
        );
    } catch (e) {
        console.error('[guildSettings] updateSetting hatası:', e.message);
    }
}

// ── Sunucu ilk kez kuruluyorsa default ayarlarla oluştur ──────────────
async function initGuild(guildId) {
    try {
        const doc = await db().collection(COL).doc(guildId).get();
        if (doc.exists) return false; // zaten var
        await db().collection(COL).doc(guildId).set({
            ...DEFAULTS,
            guildId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return true;
    } catch (e) {
        console.error('[guildSettings] initGuild hatası:', e.message);
        return false;
    }
}

// ── Sunucu silinince temizle ──────────────────────────────────────────
async function deleteGuildSettings(guildId) {
    try {
        await db().collection(COL).doc(guildId).delete();
    } catch (e) {
        console.error('[guildSettings] deleteGuildSettings hatası:', e.message);
    }
}

// ── Derin birleştirme yardımcısı ──────────────────────────────────────
function deepMerge(defaults, overrides) {
    const result = { ...defaults };
    for (const key of Object.keys(overrides || {})) {
        if (
            typeof overrides[key] === 'object' &&
            overrides[key] !== null &&
            !Array.isArray(overrides[key]) &&
            typeof defaults[key] === 'object' &&
            defaults[key] !== null &&
            !Array.isArray(defaults[key])
        ) {
            result[key] = deepMerge(defaults[key], overrides[key]);
        } else {
            result[key] = overrides[key];
        }
    }
    return result;
}

module.exports = {
    getSettings,
    saveSettings,
    updateSetting,
    initGuild,
    deleteGuildSettings,
    DEFAULTS,
};
