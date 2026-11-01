'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  TRANSFER DB — Firebase Firestore CRUD                               ║
// ║  Koleksiyon: "transfers"                                             ║
// ║  Her oyuncu → transfers/{guildId}_{userId}                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { initFirebase } = require('./database');

function db() { return initFirebase(); }

const COL = 'transfers';

// ── Oyuncu kaydını oku ────────────────────────────────────────────────
// Döner: null | { teamId, signedAt, matchesPlayed, isLoaned, loanData }
async function getPlayer(guildId, userId) {
    try {
        const doc = await db().collection(COL).doc(`${guildId}_${userId}`).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        console.error('[transferDB] getPlayer hatası:', e.message);
        return null;
    }
}

// ── Oyuncu kaydını yaz / güncelle ─────────────────────────────────────
async function setPlayer(guildId, userId, data) {
    try {
        await db().collection(COL).doc(`${guildId}_${userId}`).set(
            { ...data, updatedAt: Date.now() },
            { merge: true }
        );
    } catch (e) {
        console.error('[transferDB] setPlayer hatası:', e.message);
    }
}

// ── Oyuncu kaydını sil ────────────────────────────────────────────────
async function deletePlayer(guildId, userId) {
    try {
        await db().collection(COL).doc(`${guildId}_${userId}`).delete();
    } catch (e) {
        console.error('[transferDB] deletePlayer hatası:', e.message);
    }
}

// ── Takımdaki tüm oyuncuları listele ──────────────────────────────────
async function getTeamPlayers(guildId, teamId) {
    try {
        const snap = await db().collection(COL)
            .where('guildId', '==', guildId)
            .where('teamId', '==', teamId)
            .get();
        return snap.docs.map(d => ({ userId: d.data().userId, ...d.data() }));
    } catch (e) {
        console.error('[transferDB] getTeamPlayers hatası:', e.message);
        return [];
    }
}

// ── Oyuncuyu bir takıma sign et ───────────────────────────────────────
async function signPlayer(guildId, userId, teamId) {
    await setPlayer(guildId, userId, {
        guildId,
        userId,
        teamId,
        signedAt:      Date.now(),
        matchesPlayed: 0,       // bu takımda oynadığı maç
        isLoaned:      false,
        loanData:      null,
    });
}

// ── Oyuncuyu takımdan release et ──────────────────────────────────────
async function releasePlayer(guildId, userId) {
    await deletePlayer(guildId, userId);
}

// ── Oyuncuyu loan et ──────────────────────────────────────────────────
// loanMatchCount: kaç maç oynatılacak (max 3)
async function loanPlayer(guildId, userId, fromTeamId, toTeamId, loanMatchCount) {
    const existing = await getPlayer(guildId, userId);
    await setPlayer(guildId, userId, {
        guildId,
        userId,
        teamId:        existing?.teamId || fromTeamId, // asıl takım değişmez
        signedAt:      existing?.signedAt || Date.now(),
        matchesPlayed: existing?.matchesPlayed || 0,
        isLoaned:      true,
        loanData: {
            fromTeamId,
            toTeamId,
            matchesLeft:  loanMatchCount,
            loanedAt:     Date.now(),
        },
    });
}

// ── Maç oynadı: sayaç artır + loan kontrolü ───────────────────────────
// Döner: { done, loanEnded, matchesPlayed }
async function recordMatch(guildId, userId) {
    const p = await getPlayer(guildId, userId);
    if (!p) return { done: false, error: 'Kayıt bulunamadı' };

    const newMatches = (p.matchesPlayed || 0) + 1;
    const update     = { matchesPlayed: newMatches };

    let loanEnded = false;

    if (p.isLoaned && p.loanData) {
        const newLeft = (p.loanData.matchesLeft || 1) - 1;
        if (newLeft <= 0) {
            // Loan bitti — asıl takıma dön
            update.isLoaned  = false;
            update.loanData  = null;
            loanEnded        = true;
        } else {
            update.loanData = { ...p.loanData, matchesLeft: newLeft };
        }
    }

    await setPlayer(guildId, userId, update);
    return { done: true, loanEnded, matchesPlayed: newMatches, player: { ...p, ...update } };
}

module.exports = {
    getPlayer,
    setPlayer,
    deletePlayer,
    getTeamPlayers,
    signPlayer,
    releasePlayer,
    loanPlayer,
    recordMatch,
};
