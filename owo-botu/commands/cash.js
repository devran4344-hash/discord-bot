const { getUser, saveDB, getDB } = require('../utils/db');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'cash',
    async execute(message, args, E) {
        const user = getUser(message.author.id);
        message.reply(`${E.cowoncy} | **${message.author.username}**, you currently have **${user.cash.toLocaleString()}** cowoncy!`);
    }
};
