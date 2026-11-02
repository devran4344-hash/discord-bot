'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY MANAGER — Timer, bitiş, DM, canlı güncelleme             ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { getAllActive, getGiveaway, updateGiveaway, pickWinners } = require('../utils/giveawayDB');

// Aktif timer'lar: `${guildId}_${messageId}` → Timeout
const timers = new Map();

// ── Çekilişi bitir ────────────────────────────────────────────────────
async function end(guildId, messageId, client) {
    // Timer'ı temizle
    const key = `${guildId}_${messageId}`;
    if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key); }

    const gw = await getGiveaway(guildId, messageId);
    if (!gw || gw.status !== 'active') return;

    // Kazananları seç
    const winners = pickWinners(gw.entries || [], gw.winnerCount);
    await updateGiveaway(guildId, messageId, { status: 'ended', winners });

    // Mesajı güncelle
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const ch = guild.channels.cache.get(gw.channelId)
        || await guild.channels.fetch(gw.channelId).catch(() => null);
    if (!ch) return;

    const msg = await ch.messages.fetch(messageId).catch(() => null);

    const { makeEndedEmbed, makeRerollRow } = require('../commands/admin/giveaway');
    const endEmbed  = makeEndedEmbed(gw, winners);
    const rerollRow = makeRerollRow();

    if (msg) {
        await msg.edit({ embeds: [endEmbed], components: [rerollRow] }).catch(() => {});
    } else {
        await ch.send({ embeds: [endEmbed], components: [rerollRow] }).catch(() => {});
    }

    // Kazananları mention
    if (winners.length) {
        await ch.send({
            content: `🎉 Tebrikler! **${gw.prize}** çekilişini kazananlar: ${winners.map(id => `<@${id}>`).join(', ')}`,
        }).catch(() => {});
    }

    // Kazananlara DM
    for (const wId of winners) {
        try {
            const user = await client.users.fetch(wId);
            await user.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('🎉 Tebrikler! Çekilişi Kazandın!')
                    .setDescription(
                        `> **Ödül:** ${gw.prize}\n` +
                        `> **Sunucu:** ${guild.name}\n\n` +
                        `Ödülünü almak için sunucu yetkililerine ulaş!`
                    )
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .setTimestamp()],
            }).catch(() => { /* DM kapalı */ });
        } catch { /* kullanıcı bulunamadı */ }
    }

    console.log(`[GiveawayManager] ✅ Bitti: ${gw.prize} (${winners.length} kazanan)`);
}

// ── Zamanlayıcı kur ───────────────────────────────────────────────────
function schedule(guildId, messageId, endsAt, client) {
    const key       = `${guildId}_${messageId}`;
    const remaining = endsAt - Date.now();

    if (timers.has(key)) { clearTimeout(timers.get(key)); }

    if (remaining <= 0) {
        // Zaten bitmişse hemen bitir
        setImmediate(() => end(guildId, messageId, client));
        return;
    }

    // JS max timeout ~24.8 gün, daha uzunsa tekrar schedule ederiz
    const delay = Math.min(remaining, 2_147_483_647);
    const t = setTimeout(async () => {
        timers.delete(key);
        // Süre doldu ama gerçekten bitmesi gerekiyor mu kontrol et
        if (Date.now() < endsAt) {
            // Hâlâ bitmemiş (float hata), 1s sonra tekrar dene
            setTimeout(() => end(guildId, messageId, client), 1000);
        } else {
            await end(guildId, messageId, client);
        }
    }, delay);

    timers.set(key, t);
    console.log(`[GiveawayManager] ⏰ ${guildId}/${messageId} — ${Math.floor(remaining / 1000)}s sonra biter`);
}

// ── Bot başlarken aktif çekilişleri yükle ─────────────────────────────
async function restore(client) {
    try {
        const actives = await getAllActive();
        if (!actives.length) { console.log('[GiveawayManager] Aktif çekiliş yok.'); return; }
        console.log(`[GiveawayManager] ${actives.length} çekiliş restore ediliyor...`);
        for (const gw of actives) {
            schedule(gw.guildId, gw.messageId, gw.endsAt, client);
        }
    } catch (e) {
        console.error('[GiveawayManager] Restore hatası:', e.message);
    }
}

// ── Canlı embed güncelleme (30 saniyede bir) ──────────────────────────
let liveInterval = null;

function startLive(client) {
    if (liveInterval) return;
    liveInterval = setInterval(async () => {
        try {
            const actives = await getAllActive();
            for (const gw of actives) {
                const guild = client.guilds.cache.get(gw.guildId);
                if (!guild) continue;
                const ch = guild.channels.cache.get(gw.channelId);
                if (!ch) continue;
                const msg = await ch.messages.fetch(gw.messageId).catch(() => null);
                if (!msg) continue;
                const { makeEmbed } = require('../commands/admin/giveaway');
                await msg.edit({ embeds: [makeEmbed(gw)] }).catch(() => {});
            }
        } catch { /* sessizce devam */ }
    }, 30_000);
    console.log('[GiveawayManager] 🔄 Canlı güncelleme başlatıldı (30s)');
}

function stopLive() {
    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
}

const GiveawayManager = { end, schedule, restore, startLive, stopLive };
module.exports = { GiveawayManager };
