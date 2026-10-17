const { getUser, getDB } = require('../utils/db');
module.exports = {
    name: 'coinflip',
    async execute(message, args, E) {
        const amount = parseInt(args[0]);
        const choice = args[1] ? args[1].toLowerCase() : null;
        if (isNaN(amount) || amount <= 0 || !['h', 't', 'heads', 'tails'].includes(choice)) return message.reply(`${E.coin} | Usage: \`owo cf <amount> <h/t>\``);
        const user = getUser(message.author.id);
        if (user.cash < amount) return message.reply(`${E.cowoncy} | You don't have enough cowoncy!`);

        user.cash -= amount;
        const isHeads = Math.random() < 0.5;
        const result = isHeads ? 'heads' : 'tails';
        const userChoice = (choice === 'h' || choice === 'heads') ? 'heads' : 'tails';
        
        let winText = `and you lost it all... :c`;
        if (result === userChoice) {
            user.cash += amount * 2;
            winText = `and you won ${E.cowoncy} **${(amount * 2).toLocaleString()}**!`;
        }
        const db = getDB(); db.users[message.author.id] = user;
        require('fs').writeFileSync('./database.json', JSON.stringify(db, null, 2));

        return message.reply(`${E.coin} | **${message.author.username}** spent ${E.cowoncy} **${amount.toLocaleString()}** and chose **${userChoice}**\n` +
                             `The coin spins... ${E.coin} ${winText}`);
    }
};
