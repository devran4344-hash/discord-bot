const { getDB } = require('../utils/db');
const fs = require('fs');

module.exports = {
    name: 'owner',
    async execute(message, args, E) {
        // Sadece .env veya GitHub Secrets'daki OWNER_ID kontrolü
        const ownerId = process.env.OWNER_ID;
        if (message.author.id !== ownerId) {
            return message.reply("❌ You don't have permission to use this command.");
        }

        const subCommand = args[0] ? args[0].toLowerCase() : null;
        const target = message.mentions.users.first();
        const amount = parseInt(args[2]);

        if (subCommand === 'addcash') {
            if (!target || isNaN(amount)) return message.reply("Usage: `owo owner addcash @user <amount>`");
            const db = getDB();
            if (!db.users[target.id]) db.users[target.id] = { cash: 0, dailyStreak: 0, lastDaily: 0, luck: 0, animals: [] };
            db.users[target.id].cash += amount;
            fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
            return message.reply(`✅ Added **${amount}** cowoncy to **${target.username}**.`);
        }

        if (subCommand === 'removecash') {
            if (!target || isNaN(amount)) return message.reply("Usage: `owo owner removecash @user <amount>`");
            const db = getDB();
            if (!db.users[target.id]) db.users[target.id] = { cash: 0, dailyStreak: 0, lastDaily: 0, luck: 0, animals: [] };
            db.users[target.id].cash = Math.max(0, db.users[target.id].cash - amount);
            fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
            return message.reply(`✅ Removed **${amount}** cowoncy from **${target.username}**.`);
        }
        
        if (subCommand === 'resetuser') {
            if (!target) return message.reply("Usage: `owo owner resetuser @user`");
            const db = getDB();
            db.users[target.id] = { cash: 0, dailyStreak: 0, lastDaily: 0, luck: 0, animals: [] };
            fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
            return message.reply(`✅ Reset all data for **${target.username}**.`);
        }

        return message.reply("Available owner commands:\n`addcash @user <amount>`\n`removecash @user <amount>`\n`resetuser @user`");
    }
};
