// ╔═══════════════════════════════════════════════════════════════╗
// ║         MODBOT - VERİTABANI (Firebase Firestore)             ║
// ║   Veriler bulutta kalıcı — restart'ta SİLİNMEZ              ║
// ╚═══════════════════════════════════════════════════════════════╝

const admin = require('firebase-admin');

// ─── Firebase başlatma ──────────────────────────────────────────
let _db = null;
let _initError = null;

function initFirebase() {
    if (_db) return _db;
    if (_initError) throw _initError;
    try {
        const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT env değişkeni yok');

        const sa = JSON.parse(saRaw);
        // private_key satır sonları bozulmuşsa düzelt
        if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');

        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(sa) });
        }
        _db = admin.firestore();
        console.log('[firebase] ✅ Bağlantı başarılı');
        return _db;
    } catch (e) {
        _initError = e;
        console.error('[firebase] ❌ Bağlantı hatası:', e.message);
        throw e;
    }
}

function fs() {
    return _db || initFirebase();
}

// ─── Temel okuma/yazma/silme ────────────────────────────────────
async function _get(name, key) {
    try {
        const doc = await fs().collection(name).doc(key).get();
        if (!doc.exists) return null;
        return doc.data().value ?? null;
    } catch (e) {
        console.error(`[db] _get(${name}/${key}) hatası:`, e.message);
        return null;
    }
}

async function _set(name, key, value) {
    try {
        await fs().collection(name).doc(key).set({ value, updatedAt: Date.now() });
    } catch (e) {
        console.error(`[db] _set(${name}/${key}) hatası:`, e.message);
    }
}

async function _del(name, key) {
    try {
        await fs().collection(name).doc(key).delete();
    } catch (e) {
        console.error(`[db] _del(${name}/${key}) hatası:`, e.message);
    }
}

// ════════════════════════════════════════
//  UYARI SİSTEMİ
// ════════════════════════════════════════

async function addWarning(guildId, userId, warning) {
    const key = `${guildId}_${userId}`;
    const warns = (await _get('warnings', key)) || [];
    warns.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        reason: warning.reason || 'Sebep belirtilmedi',
        moderatorId: warning.moderatorId,
        moderatorTag: warning.moderatorTag,
        timestamp: Date.now(),
    });
    await _set('warnings', key, warns);
    return warns;
}

async function getWarnings(guildId, userId) {
    return (await _get('warnings', `${guildId}_${userId}`)) || [];
}

async function removeWarning(guildId, userId, warnId) {
    const key = `${guildId}_${userId}`;
    const warns = ((await _get('warnings', key)) || []).filter((w) => w.id !== warnId);
    await _set('warnings', key, warns);
    return warns;
}

async function clearWarnings(guildId, userId) {
    await _del('warnings', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  SPAM SAYACI
// ════════════════════════════════════════

async function getSpamCount(guildId, userId) {
    return (await _get('spamcount', `${guildId}_${userId}`)) || 0;
}

async function incrementSpamCount(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const count = ((await _get('spamcount', key)) || 0) + 1;
    await _set('spamcount', key, count);
    return count;
}

async function resetSpamCount(guildId, userId) {
    await _del('spamcount', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  KÜFÜR SAYACI
// ════════════════════════════════════════

async function getBadwordCount(guildId, userId) {
    return (await _get('badword', `${guildId}_${userId}`)) || 0;
}

async function incrementBadwordCount(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const count = ((await _get('badword', key)) || 0) + 1;
    await _set('badword', key, count);
    return count;
}

async function resetBadwordCount(guildId, userId) {
    await _del('badword', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  TİCKET SİSTEMİ
// ════════════════════════════════════════

async function createTicket(guildId, userId, channelId, ticketNumber) {
    const ticketData = {
        channelId, userId, ticketNumber,
        status: 'open',
        createdAt: Date.now(),
        claimedBy: null,
        closedAt: null,
        closedBy: null,
    };
    await _set('tickets', `${guildId}_${channelId}`, ticketData);

    const userKey = `user_${guildId}_${userId}`;
    const userTickets = (await _get('tickets', userKey)) || [];
    userTickets.push(channelId);
    await _set('tickets', userKey, userTickets);

    return ticketData;
}

async function getTicket(guildId, channelId) {
    return _get('tickets', `${guildId}_${channelId}`);
}

async function updateTicket(guildId, channelId, data) {
    const key = `${guildId}_${channelId}`;
    const ticket = await _get('tickets', key);
    if (!ticket) return null;
    const updated = { ...ticket, ...data };
    await _set('tickets', key, updated);
    return updated;
}

async function closeTicket(guildId, channelId, closedBy) {
    const key = `${guildId}_${channelId}`;
    const ticket = await _get('tickets', key);
    if (!ticket) return null;
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.closedBy = closedBy;
    await _set('tickets', key, ticket);

    const userKey = `user_${guildId}_${ticket.userId}`;
    const userTickets = ((await _get('tickets', userKey)) || []).filter((id) => id !== channelId);
    await _set('tickets', userKey, userTickets);

    return ticket;
}

async function getUserActiveTickets(guildId, userId) {
    return (await _get('tickets', `user_${guildId}_${userId}`)) || [];
}

async function getTicketNumber(guildId) {
    const key = `counter_${guildId}`;
    const num = ((await _get('tickets', key)) || 0) + 1;
    await _set('tickets', key, num);
    return num;
}

// ════════════════════════════════════════
//  MUTE KAYITLARI
// ════════════════════════════════════════

async function saveMute(guildId, userId, data) {
    await _set('mutes', `${guildId}_${userId}`, { ...data, timestamp: Date.now() });
}

async function getMute(guildId, userId) {
    return _get('mutes', `${guildId}_${userId}`);
}

async function removeMute(guildId, userId) {
    await _del('mutes', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  MOD GEÇMİŞİ
// ════════════════════════════════════════

async function addModAction(guildId, userId, action) {
    const key = `${guildId}_${userId}`;
    const history = (await _get('modhistory', key)) || [];
    history.push({ ...action, timestamp: Date.now(), id: Date.now().toString(36) });
    if (history.length > 50) history.splice(0, history.length - 50);
    await _set('modhistory', key, history);
    return history;
}

async function getModHistory(guildId, userId) {
    return (await _get('modhistory', `${guildId}_${userId}`)) || [];
}

// ════════════════════════════════════════
//  SUNUCU AYARLARI
// ════════════════════════════════════════

async function getGuildSetting(guildId, key) {
    return _get('guild_settings', `${guildId}_${key}`);
}

async function setGuildSetting(guildId, key, value) {
    await _set('guild_settings', `${guildId}_${key}`, value);
}

module.exports = {
    // Uyarılar
    addWarning, getWarnings, removeWarning, clearWarnings,
    // Spam
    getSpamCount, incrementSpamCount, resetSpamCount,
    // Küfür
    getBadwordCount, incrementBadwordCount, resetBadwordCount,
    // Ticket
    createTicket, getTicket, updateTicket, closeTicket,
    getUserActiveTickets, getTicketNumber,
    // Mute
    saveMute, getMute, removeMute,
    // Mod geçmişi
    addModAction, getModHistory,
    // Sunucu ayarları
    getGuildSetting, setGuildSetting,
    // Firebase init (test için dışa aktarıldı)
    initFirebase,
};
