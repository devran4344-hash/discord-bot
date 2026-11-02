'use strict';
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY DB — Firebase Firestore                                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { initFirebase } = require('./database');
const COL = 'giveaways';
const db  = () => initFirebase();

async function createGiveaway(data) {
    const key = `${data.guildId}_${data.messageId}`;
    await db().collection(COL).doc(key).set({ ...data, createdAt: Date.now() });
}

async function getGiveaway(guildId, messageId) {
    try {
        const doc = await db().collection(COL).doc(`${guildId}_${messageId}`).get();
        return doc.exists ? doc.data() : null;
    } catch { return null; }
}

async function updateGiveaway(guildId, messageId, patch) {
    try {
        await db().collection(COL).doc(`${guildId}_${messageId}`)
            .set({ ...patch, updatedAt: Date.now() }, { merge: true });
    } catch (e) { console.error('[giveawayDB]', e.message); }
}

async function getAllActive() {
    try {
        const snap = await db().collection(COL).where('status', '==', 'active').get();
        return snap.docs.map(d => d.data());
    } catch { return []; }
}

// Katılım: sadece userId listesi tut (basit, hızlı)
async function addEntry(guildId, messageId, userId, entries = 1) {
    try {
        const ref  = db().collection(COL).doc(`${guildId}_${messageId}`);
        const doc  = await ref.get();
        if (!doc.exists) return { ok: false, reason: 'notfound' };
        const data = doc.data();
        if (data.status !== 'active') return { ok: false, reason: 'ended' };

        const list = data.entries || [];
        if (list.includes(userId)) return { ok: false, reason: 'already' };

        // Boost: userId'yi entries kez ekle
        const add = Array(entries).fill(userId);
        await ref.update({ entries: [...list, ...add] });
        return { ok: true, count: list.length + 1 };
    } catch (e) { return { ok: false, reason: e.message }; }
}

async function removeEntry(guildId, messageId, userId) {
    try {
        const ref  = db().collection(COL).doc(`${guildId}_${messageId}`);
        const doc  = await ref.get();
        if (!doc.exists) return false;
        const list = (doc.data().entries || []).filter(id => id !== userId);
        await ref.update({ entries: list });
        return true;
    } catch { return false; }
}

// Ağırlıklı kazanan seç (userId birden fazla kez varsa şansı yüksek)
function pickWinners(entries, count) {
    if (!entries?.length) return [];
    const pool     = [...entries].sort(() => Math.random() - 0.5);
    const winners  = new Set();
    for (const id of pool) {
        if (winners.size >= count) break;
        winners.add(id);
    }
    // Yeterli yoksa herkesi al
    for (const id of entries) {
        if (winners.size >= count) break;
        winners.add(id);
    }
    return [...winners].slice(0, count);
}

module.exports = { createGiveaway, getGiveaway, updateGiveaway, getAllActive, addEntry, removeEntry, pickWinners };
