// Kawai - Tum Embed Tasarimlari
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getUserLevel, getNextLevel, createXpBar } = require('./levels');

const FOOTER = config.footerText;
const ICON = config.botEmoji;

function baseEmbed(color) {
    return new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: FOOTER })
        .setTimestamp();
}

function success(title, description) {
    return baseEmbed(config.colors.success)
        .setTitle(`${ICON} ${title}`)
        .setDescription(description);
}

function error(description) {
    return baseEmbed(config.colors.error)
        .setTitle(`❌ Hata`)
        .setDescription(description);
}

function info(title, description) {
    return baseEmbed(config.colors.info)
        .setTitle(`${ICON} ${title}`)
        .setDescription(description);
}

function owner(title, description) {
    return baseEmbed(config.colors.owner)
        .setTitle(`👑 ${title}`)
        .setDescription(description);
}

function profile(userData, discordUser) {
    const levelData = getUserLevel(userData.xp);
    const nextLevel = getNextLevel(userData.xp);
    const nextXp = nextLevel ? nextLevel.minXp : levelData.minXp;

    const xpBar = createXpBar(userData.xp, levelData.minXp, nextLevel ? nextLevel.minXp : null);

    const limits = userData.daily_limits || { ai_chat_used: 0, screenshot_used: 0, image_gen_used: 0 };

    const embed = baseEmbed(config.colors.main)
        .setTitle(`${ICON} Kawai Profili — ${discordUser.username}`)
        .setThumbnail(discordUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '📊 Level', value: `**${levelData.level}** — ${levelData.name}`, inline: true },
            { name: '✨ XP', value: xpBar, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '🎯 Bugunku Kotan',
                value:
                    `🤖 Soru: **${limits.ai_chat_used}/${levelData.aiLimit}**\n` +
                    `📸 SS Analiz: **${limits.screenshot_used}/${levelData.visionLimit}**\n` +
                    `🖼️ Fotograf: **${limits.image_gen_used}/${levelData.imageLimit}**`,
                inline: false
            }
        )
        .setDescription(`Toplam **${userData.xp} XP** kazandin! ${nextLevel ? `Level **${nextLevel.level}** icin **${nextXp - userData.xp} XP** kaldi.` : 'Maksimum leveldesin! 🏆'}`);

    return embed;
}

function levelUp(levelData) {
    return baseEmbed(config.colors.levelup)
        .setTitle(`${ICON} LEVEL ATLADIN! 🎉`)
        .setDescription(
            `Tebrikler kanka! **Level ${levelData.level}** oldun ve **${levelData.name}** unvanini kazandin!\n\n` +
            `**Yeni Gunluk Limitlerin:**\n` +
            `🤖 Soru: **${levelData.aiLimit}**\n` +
            `📸 SS: **${levelData.visionLimit}**\n` +
            `🖼️ Fotograf: **${levelData.imageLimit}**`
        );
}

function errorEmbed(desc) { return error(desc); }
function successEmbed(title, desc) { return success(title, desc); }
function infoEmbed(title, desc) { return info(title, desc); }
function ownerEmbed(title, desc) { return owner(title, desc); }
function profileEmbed(userData, discordUser) { return profile(userData, discordUser); }
function levelUpEmbed(levelData) { return levelUp(levelData); }

module.exports = {
    baseEmbed,
    successEmbed,
    errorEmbed,
    infoEmbed,
    ownerEmbed,
    profileEmbed,
    levelUpEmbed
};
