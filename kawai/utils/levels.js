// Level ve kota hesaplama yardimcilari
const config = require('../config');

function getUserLevel(xp) {
    let current = config.levels[0];
    for (const lvl of config.levels) {
        if (xp >= lvl.minXp) current = lvl;
    }
    return current;
}

function getNextLevel(xp) {
    const current = getUserLevel(xp);
    const next = config.levels.find(l => l.level === current.level + 1);
    return next || null;
}

function createXpBar(currentXp, currentLevelXp, nextLevelXp) {
    if (!nextLevelXp) return '[■■■■■■■■■■] MAX';

    const total = nextLevelXp - currentLevelXp;
    const progress = currentXp - currentLevelXp;
    const percent = Math.min(1, Math.max(0, progress / total));
    const filled = Math.round(percent * 10);
    const empty = 10 - filled;

    return `[${'■'.repeat(filled)}${'□'.repeat(empty)}] ${currentXp}/${nextLevelXp} XP`;
}

function getDailyLimits(level) {
    const lvl = config.levels.find(l => l.level === level) || config.levels[0];
    return {
        aiLimit: lvl.aiLimit,
        visionLimit: lvl.visionLimit,
        imageLimit: lvl.imageLimit
    };
}

function getXpForNextLevel(xp) {
    const next = getNextLevel(xp);
    return next ? next.minXp : null;
}

module.exports = {
    getUserLevel,
    getNextLevel,
    createXpBar,
    getDailyLimits,
    getXpForNextLevel
};
