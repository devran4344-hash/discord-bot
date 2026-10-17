const { getUser, getDB } = require('../utils/db');
module.exports = {
    name: 'slots',
    async execute(message, args, E) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return message.reply(`${E.cowoncy} | Please enter a valid amount!`);
        const user = getUser(message.author.id);
        if (user.cash < amount) return message.reply(`${E.cowoncy} | You don't have enough cowoncy!`);

        user.cash -= amount;
        const slots = [E.cherry, E.lemon, E.orange, E.grape];
        const res = [slots[Math.floor(Math.random() * slots.length)], slots[Math.floor(Math.random() * slots.length)], slots[Math.floor(Math.random() * slots.length)]];
        
        let winText = `| and won nothing... :c`;
        if (res[0] === res[1] && res[1] === res[2]) {
            const won = amount * 2;
            user.cash += won;
            winText = `| and won ${E.cowoncy} **${won.toLocaleString()}**`;
        }
        const db = getDB(); db.users[message.author.id] = user;
        require('fs').writeFileSync('./database.json', JSON.stringify(db, null, 2));

        return message.reply(`___SLOTS___\n[ ${res[0]} ] [ ${res[1]} ] [ ${res[2]} ]\n| **${message.author.username}** | bet ${E.cowoncy} **${amount.toLocaleString()}**\n${winText}`);
    }
};
