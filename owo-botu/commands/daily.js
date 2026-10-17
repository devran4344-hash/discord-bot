const { getUser, saveDB } = require('../utils/db');
module.exports = {
    name: 'daily',
    async execute(message, args, E) {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 86400000;
        if (now - user.lastDaily < cooldown) {
            const timeLeft = Math.floor((cooldown - (now - user.lastDaily)) / 1000);
            const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60;
            return message.reply(`${E.timer} | **${message.author.username}**, you already claimed your daily!\n| Next daily in: **${h}H ${m}M ${s}S**`);
        }
        const amount = Math.floor(Math.random() * 1000) + 1000;
        user.cash += amount;
        user.dailyStreak += 1;
        user.lastDaily = now;
        saveDB(getDB().users[user.id] = user); // Dummy fix for DB saving in standalone
        
        // Save logic properly
        const db = getDB();
        db.users[message.author.id] = user;
        require('fs').writeFileSync('./database.json', JSON.stringify(db, null, 2));

        return message.reply(`${E.daily} | **${message.author.username}**, Here is your daily ${E.cowoncy} **${amount.toLocaleString()}** Cowoncy!\n` +
                             `${E.streak} | You're on a **${user.dailyStreak}** daily streak!\n` +
                             `${E.lootbox} | You received a **lootbox**!\n` +
                             `${E.timer} | Your next daily is in: **23H 59M 59S**`);
    }
};
