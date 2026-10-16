// Kullanici CRUD islemleri, XP, kota, ban
const { db, admin } = require('./firebase');
const config = require('../config');
const { getUserLevel } = require('./levels');

const usersCol = db.collection('kawai_users');
const bannedCol = db.collection('kawai_banned');
const campaignsCol = db.collection('kawai_campaigns');

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

async function getUser(userId) {
    const ref = usersCol.doc(userId);
    const doc = await ref.get();

    if (!doc.exists) {
        const fresh = {
            xp: 0,
            level: 1,
            daily_limits: {
                ai_chat_used: 0,
                screenshot_used: 0,
                image_gen_used: 0,
                last_reset: todayStr()
            },
            daily_tasks: {},
            cooldowns: { last_xp_time: 0 },
            memory_summary: 'Yeni oyuncu.',
            stats: { total_messages: 0, total_questions: 0, total_screenshots: 0, total_images: 0 },
            created_at: new Date().toISOString()
        };
        await ref.set(fresh);
        return fresh;
    }

    let data = doc.data();

    // Gunluk reset
    if (!data.daily_limits || data.daily_limits.last_reset !== todayStr()) {
        await ref.update({
            'daily_limits.ai_chat_used': 0,
            'daily_limits.screenshot_used': 0,
            'daily_limits.image_gen_used': 0,
            'daily_limits.last_reset': todayStr(),
            'daily_tasks': {}
        });
        data = (await ref.get()).data();
    }

    return data;
}

async function saveUser(userId, data) {
    await usersCol.doc(userId).update(data);
}

async function addXp(userId, amount) {
    const ref = usersCol.doc(userId);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const data = doc.data();
    const oldLevel = getUserLevel(data.xp).level;
    const newXp = data.xp + amount;
    const newLevelData = getUserLevel(newXp);
    const leveledUp = newLevelData.level > oldLevel;

    await ref.update({
        xp: newXp,
        level: newLevelData.level
    });

    return { newXp, leveledUp, newLevelData };
}

async function incrementUsage(userId, field, amount = 1) {
    const map = {
        ai: 'daily_limits.ai_chat_used',
        vision: 'daily_limits.screenshot_used',
        image: 'daily_limits.image_gen_used'
    };
    const key = map[field];
    if (!key) return;
    await usersCol.doc(userId).update({
        [key]: admin.firestore.FieldValue.increment(amount)
    });
}

async function updateCooldown(userId, timestamp) {
    await usersCol.doc(userId).update({ 'cooldowns.last_xp_time': timestamp });
}

async function incrementStat(userId, stat) {
    const map = {
        message: 'stats.total_messages',
        question: 'stats.total_questions',
        screenshot: 'stats.total_screenshots',
        image: 'stats.total_images'
    };
    const key = map[stat];
    if (!key) return;
    await usersCol.doc(userId).update({
        [key]: admin.firestore.FieldValue.increment(1)
    });
}

async function getLeaderboard(limit = 10) {
    const snap = await usersCol.orderBy('xp', 'desc').limit(limit).get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
}

// Ban sistemi
async function isBanned(userId) {
    const doc = await bannedCol.doc(userId).get();
    return doc.exists;
}

async function banUser(userId, reason, byId) {
    await bannedCol.doc(userId).set({
        reason: reason || 'Sebep yok',
        banned_by: byId,
        banned_at: new Date().toISOString()
    });
}

async function unbanUser(userId) {
    await bannedCol.doc(userId).delete();
}

// Kampanyalar (owner bedava/foto)
async function setCampaign(type, count, byId) {
    await campaignsCol.doc('active').set({
        type, // 'bedava_soru' veya 'bedava_foto'
        count,
        used: 0,
        started_by: byId,
        started_at: new Date().toISOString()
    });
}

async function getCampaign() {
    const doc = await campaignsCol.doc('active').get();
    return doc.exists ? doc.data() : null;
}

async function useCampaign() {
    await campaignsCol.doc('active').update({
        used: admin.firestore.FieldValue.increment(1)
    });
}

async function clearCampaign() {
    await campaignsCol.doc('active').delete();
}

// Owner kota artirma (tum kullanicilar icin bonus)
async function addGlobalBonus(amount, byId) {
    const snap = await usersCol.get();
    const batch = db.batch();
    snap.forEach(doc => {
        const data = doc.data();
        const bonus = (data.daily_limits.bonus_ai || 0) + amount;
        batch.update(doc.ref, { 'daily_limits.bonus_ai': bonus });
    });
    await batch.commit();
}

module.exports = {
    getUser,
    saveUser,
    addXp,
    incrementUsage,
    updateCooldown,
    incrementStat,
    getLeaderboard,
    isBanned,
    banUser,
    unbanUser,
    setCampaign,
    getCampaign,
    useCampaign,
    clearCampaign,
    addGlobalBonus
};
