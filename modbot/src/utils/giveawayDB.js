'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY DB — Firebase Firestore                                   ║
// ║  Koleksiyon: "giveaways"                                            ║
// ║  Her çekiliş → giveaways/{guildId}_{messageId}                     ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { initFirebase } = require('./database');

const COL = 'giveaways';

function db() { return initFirebase(); }

// ── Çekiliş oluştur ───────────────────────────────────────────────────
async function createGiveaway(data) {
    // data: { guildId, channelId, messageId, hostId, prize, winnerCount,
    //         endsAt, requirements, boostRoleId, boostMultiplier, status }
    const key = `${data.guildId}_${data.messageId}`;
    const doc = {
        ...data,
        participants: [],   // [{ userId, entries }]
        winners:      [],
        createdAt:    Date.now(),
        status:       'active', // active | ended | cancelled
    };
    await db().collection(COL).doc(key).set(doc);
    return doc;
}

// ── Çekiliş oku ───────────────────────────────────────────────────────
async function getGiveaway(guildId, messageId) {
    try {
        const doc = await db().collection(COL).doc(`${guildId}_${messageId}`).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        console.error('[giveawayDB] getGiveaway hatası:', e.message);
        return null;
    }
}

// ── Çekiliş güncelle ──────────────────────────────────────────────────
async function updateGiveaway(guildId, messageId, data) {
    try {
        await db().collection(COL).doc(`${guildId}_${messageId}`).set(
            { ...data, updatedAt: Date.now() },
            { merge: true }
        );
    } catch (e) {
        console.error('[giveawayDB] updateGiveaway hatası:', e.message);
    }
}

// ── Sunucudaki aktif çekilişleri getir ────────────────────────────────
async function getActiveGiveaways(guildId) {
    try {
        const snap = await db().collection(COL)
            .where('guildId', '==', guildId)
            .where('status', '==', 'active')
            .get();
        return snap.docs.map(d => d.data());
    } catch (e) {
        console.error('[giveawayDB] getActiveGiveaways hatası:', e.message);
        return [];
    }
}

// ── Tüm aktif çekilişleri getir (cron için) ───────────────────────────
async function getAllActiveGiveaways() {
    try {
        const snap = await db().collection(COL)
            .where('status', '==', 'active')
            .get();
        return snap.docs.map(d => d.data());
    } catch (e) {
        console.error('[giveawayDB] getAllActiveGiveaways hatası:', e.message);
        return [];
    }
}

// ── Katılımcı ekle ────────────────────────────────────────────────────
// entries: boost çarpanı (1 normal, 2/3/4 boost)
async function addParticipant(guildId, messageId, userId, entries = 1) {
    try {
        const key = `${guildId}_${messageId}`;
        const doc = await db().collection(COL).doc(key).get();
        if (!doc.exists) return { success: false, error: 'Çekiliş bulunamadı.' };

        const data         = doc.data();
        const participants = data.participants || [];

        // Zaten katılmış mı?
        if (participants.some(p => p.userId === userId)) {
            return { success: false, alreadyJoined: true };
        }

        participants.push({ userId, entries, joinedAt: Date.now() });
        await db().collection(COL).doc(key).update({ participants });
        return { success: true, count: participants.length };
    } catch (e) {
        console.error('[giveawayDB] addParticipant hatası:', e.message);
        return { success: false, error: e.message };
    }
}

// ── Katılımcı çıkar ───────────────────────────────────────────────────
async function removeParticipant(guildId, messageId, userId) {
    try {
        const key  = `${guildId}_${messageId}`;
        const doc  = await db().collection(COL).doc(key).get();
        if (!doc.exists) return { success: false };

        const data         = doc.data();
        const participants = (data.participants || []).filter(p => p.userId !== userId);
        await db().collection(COL).doc(key).update({ participants });
        return { success: true, count: participants.length };
    } catch (e) {
        console.error('[giveawayDB] removeParticipant hatası:', e.message);
        return { success: false };
    }
}

// ── Ağırlıklı kazanan seç ────────────────────────────────────────────
// Her katılımcının entries sayısı kadar havuza eklenir
function pickWinners(participants, count) {
    if (!participants.length) return [];

    // Ağırlıklı havuz oluştur
    const pool = [];
    for (const p of participants) {
        for (let i = 0; i < (p.entries || 1); i++) {
            pool.push(p.userId);
        }
    }

    const winners = new Set();
    const shuffled = pool.sort(() => Math.random() - 0.5);

    for (const uid of shuffled) {
        if (winners.size >= count) break;
        winners.add(uid);
    }

    // Havuzdan az kişi varsa herkesi al
    if (winners.size < count) {
        for (const p of participants) winners.add(p.userId);
    }

    return [...winners].slice(0, count);
}

module.exports = {
    createGiveaway,
    getGiveaway,
    updateGiveaway,
    getActiveGiveaways,
    getAllActiveGiveaways,
    addParticipant,
    removeParticipant,
    pickWinners,
};
