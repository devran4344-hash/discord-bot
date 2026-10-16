const { Events } = require('discord.js');
const config = require('../config');
const db = require('../utils/database');
const { getUserLevel } = require('../utils/levels');
const { levelUpEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const userId = message.author.id;

        // Ban kontrolu
        try {
            if (await db.isBanned(userId)) return;
        } catch (err) {
            console.error('Ban kontrolu hatasi:', err.message);
            return;
        }

        // Kullanici verisini cek (yoksa olusturur)
        let userData;
        try {
            userData = await db.getUser(userId);
        } catch (err) {
            console.error('getUser hatasi:', err.message);
            return;
        }

        // XP sistemi (cooldown ile)
        const now = Date.now();
        const lastXp = userData.cooldowns?.last_xp_time || 0;

        if (now - lastXp >= config.xp.cooldownMs) {
            try {
                const result = await db.addXp(userId, config.xp.messageXp);
                await db.updateCooldown(userId, now);
                await db.incrementStat(userId, 'message');

                if (result && result.leveledUp) {
                    message.channel.send({
                        content: `<@${userId}>`,
                        embeds: [levelUpEmbed(result.newLevelData)]
                    }).catch(() => {});
                }
            } catch (err) {
                console.error('XP ekleme hatasi:', err.message);
            }
        }
    }
};
