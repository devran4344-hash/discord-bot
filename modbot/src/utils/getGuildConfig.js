'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  getGuildConfig — config.js + guildSettings birleştirici            ║
// ║  Sistemler önce guildSettings'ten okur, yoksa config.js'e döner    ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { getSettings } = require('./guildSettings');
const baseConfig = require('../config');

// Cache: guildId → { settings, fetchedAt }
const cache = new Map();
const CACHE_TTL = 30_000; // 30 saniye

async function getGuildConfig(guildId) {
    // Cache'den sun
    const cached = cache.get(guildId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.config;
    }

    const gs = await getSettings(guildId);

    // config.js ile birleştir — guildSettings öncelikli
    const merged = {
        ...baseConfig,

        // Roller — guildSettings'ten gelen öncelikli
        roles: {
            admin:     gs.roles.admin     || baseConfig.roles?.admin     || null,
            moderator: gs.roles.moderator || baseConfig.roles?.moderator || null,
            muted:     gs.roles.muted     || baseConfig.roles?.muted     || null,
            member:    gs.roles.member    || baseConfig.roles?.member    || null,
        },

        // Kanallar
        channels: {
            modLog:         gs.channels.modLog         || baseConfig.channels?.modLog         || null,
            serverLog:      gs.channels.serverLog      || baseConfig.channels?.serverLog      || null,
            ticketLog:      gs.channels.ticketLog      || baseConfig.channels?.ticketLog      || null,
            welcomeChannel: gs.channels.welcomeChannel || baseConfig.channels?.welcomeChannel || null,
            botLog:         gs.channels.botLog         || baseConfig.channels?.botLog         || null,
        },

        // Aktif sistemler
        systems: gs.systems,

        // Anti-spam ayarları
        antiSpam: {
            ...baseConfig.antiSpam,
            enabled:     gs.systems.antiSpam,
            maxMessages: gs.antiSpam?.maxMessages || baseConfig.antiSpam?.maxMessages || 5,
        },

        // Anti-link
        antiLink: {
            ...baseConfig.antiLink,
            enabled:   gs.systems.antiLink,
            whitelist: gs.antiLink?.whitelist || baseConfig.antiLink?.whitelist || [],
        },

        // Küfür filtresi
        wordFilter: {
            ...baseConfig.wordFilter,
            enabled:    gs.systems.wordFilter,
            warnBefore: gs.wordFilter?.warnBefore || baseConfig.wordFilter?.warnBefore || 3,
        },

        // Ticket
        ticket: {
            ...baseConfig.ticket,
            enabled:           gs.systems.ticket,
            categoryId:        gs.ticket?.categoryId        || baseConfig.ticket?.categoryId        || null,
            maxTicketsPerUser: gs.ticket?.maxTicketsPerUser || baseConfig.ticket?.maxTicketsPerUser || 1,
            askRating:         gs.ticket?.askRating         ?? baseConfig.ticket?.askRating         ?? true,
        },

        // Hoşgeldin
        welcome: {
            ...baseConfig.welcome,
            enabled:   gs.systems.welcomeMsg,
            channelId: gs.channels.welcomeChannel || baseConfig.channels?.welcomeChannel || null,
            message:   gs.welcome?.message || 'Hoşgeldin {user}! 🎉',
        },

        // Kayıt
        kayit: {
            ...baseConfig.kayit,
            enabled:      gs.kayit?.enabled || false,
            memberRoller: gs.kayit?.memberRoller || baseConfig.kayit?.memberRoller || [],
            logKanalId:   gs.kayit?.logKanalId   || null,
            isimFormati:  gs.kayit?.isimFormati  || '{isim} | {yas}',
        },

        // Raw guild settings (sistemlerin ihtiyacı olursa)
        _guildSettings: gs,
    };

    cache.set(guildId, { config: merged, fetchedAt: Date.now() });
    return merged;
}

// Cache'i temizle (ayar değişince çağır)
function clearConfigCache(guildId) {
    if (guildId) {
        cache.delete(guildId);
    } else {
        cache.clear();
    }
}

module.exports = { getGuildConfig, clearConfigCache };
