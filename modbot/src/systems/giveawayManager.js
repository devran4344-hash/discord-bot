'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY MANAGER — Zamanlayıcı, canlı güncelleme, bitiş sistemi   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { getAllActiveGiveaways, getGiveaway, updateGiveaway, pickWinners } = require('../utils/giveawayDB');

// Aktif zamanlayıcılar (messageId → timeout)
const timers = new Map();

// ── Embed güncelle ────────────────────────────────────────────────────
async function updateEmbed(guild, messageId, client) {
    try {
        const giveaway = await getGiveaway(guild.id, messageId);
        if (!giveaway || giveaway.status !== 'active') return;

        const channel = guild.channels.cache.get(giveaway.channelId)
            || await guild.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) return;

        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (!msg) return;

        const { buildGiveawayEmbed, buildGiveawayButtons } = require('../commands/admin/giveaway');
        const embed = buildGiveawayEmbed(giveaway);
        await msg.edit({ embeds: [embed], components: buildGiveawayButtons() }).catch(() => {});
    } catch (e) {
        console.error('[GiveawayManager] updateEmbed hatası:', e.message);
    }
}

// ── Çekilişi bitir ────────────────────────────────────────────────────
async function endGiveaway(guildId, messageId, client) {
    try {
        const giveaway = await getGiveaway(guildId, messageId);
        if (!giveaway || giveaway.status !== 'active') return;

        // Durumu ended yap
        await updateGiveaway(guildId, messageId, { status: 'ended' });

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(giveaway.channelId)
            || await guild.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) return;

        const msg = await channel.messages.fetch(messageId).catch(() => null);

        // Kazananları seç
        const winners = pickWinners(giveaway.participants || [], giveaway.winnerCount);
        await updateGiveaway(guildId, messageId, { winners });

        const { buildEndedEmbed } = require('../commands/admin/giveaway');
        const endEmbed = buildEndedEmbed(giveaway, winners);

        // Reroll butonu (admin only — setDefaultMemberPermissions)
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const rerollRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('gw_reroll')
                .setLabel('🔄 Reroll (Yeniden Çek)')
                .setStyle(ButtonStyle.Primary),
        );

        if (msg) {
            await msg.edit({ embeds: [endEmbed], components: [rerollRow] }).catch(() => {});
        } else {
            await channel.send({ embeds: [endEmbed], components: [rerollRow] }).catch(() => {});
        }

        // Kazananları mention
        if (winners.length) {
            const mentionStr = winners.map(id => `<@${id}>`).join(', ');
            await channel.send({
                content: `🎉 Tebrikler! **${giveaway.prize}** çekilişinin kazananları: ${mentionStr}`,
            }).catch(() => {});
        }

        // Kazananlara DM
        for (const winnerId of winners) {
            try {
                const user = await client.users.fetch(winnerId);
                await user.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle('🎉 Tebrikler! Çekilişi Kazandın!')
                        .setDescription(
                            `> **Ödül:** ${giveaway.prize}\n` +
                            `> **Sunucu:** ${guild.name}\n\n` +
                            `Ödülünü almak için sunucu yetkililerine ulaşabilirsin!`
                        )
                        .setThumbnail(guild.iconURL({ dynamic: true }))
                        .setTimestamp()],
                }).catch(() => { /* DM kapalı, devam */ });
            } catch { /* ignore */ }
        }

        timers.delete(messageId);
        console.log(`[GiveawayManager] ✅ Çekiliş bitti: ${giveaway.prize} (${winners.length} kazanan)`);
    } catch (e) {
        console.error('[GiveawayManager] endGiveaway hatası:', e.message);
    }
}

// ── Çekilişi zamanla ──────────────────────────────────────────────────
function schedule(giveaway, client) {
    const remaining = giveaway.endsAt - Date.now();
    if (remaining <= 0) {
        // Zaten bitmişse hemen bitir
        endGiveaway(giveaway.guildId, giveaway.messageId, client);
        return;
    }

    // Mevcut zamanlayıcı varsa temizle
    if (timers.has(giveaway.messageId)) {
        clearTimeout(timers.get(giveaway.messageId));
    }

    const timer = setTimeout(() => {
        endGiveaway(giveaway.guildId, giveaway.messageId, client);
    }, Math.min(remaining, 2147483647)); // JS max timeout ~24.8 gün

    timers.set(giveaway.messageId, timer);
    console.log(`[GiveawayManager] ⏰ Zamanlayıcı: ${giveaway.prize} — ${Math.floor(remaining / 1000)}s sonra biter`);
}

// ── Bot başlarken aktif çekilişleri yükle ─────────────────────────────
async function restoreGiveaways(client) {
    try {
        const actives = await getAllActiveGiveaways();
        if (!actives.length) {
            console.log('[GiveawayManager] Aktif çekiliş yok.');
            return;
        }

        console.log(`[GiveawayManager] ${actives.length} çekiliş yükleniyor...`);
        for (const g of actives) {
            schedule(g, client);
        }
    } catch (e) {
        console.error('[GiveawayManager] restoreGiveaways hatası:', e.message);
    }
}

// ── 30 saniyede bir embed güncelleme (canlı geri sayım için) ──────────
let updateInterval = null;

function startLiveUpdater(client) {
    if (updateInterval) return;
    updateInterval = setInterval(async () => {
        try {
            const actives = await getAllActiveGiveaways();
            for (const g of actives) {
                const guild = client.guilds.cache.get(g.guildId);
                if (guild) await updateEmbed(guild, g.messageId, client);
            }
        } catch (e) {
            console.error('[GiveawayManager] Live updater hatası:', e.message);
        }
    }, 30_000); // 30 saniyede bir güncelle
    console.log('[GiveawayManager] 🔄 Canlı güncelleme başlatıldı (30sn)');
}

function stopLiveUpdater() {
    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
}

const GiveawayManager = { schedule, restoreGiveaways, updateEmbed, endGiveaway, startLiveUpdater, stopLiveUpdater };
module.exports = { GiveawayManager };
