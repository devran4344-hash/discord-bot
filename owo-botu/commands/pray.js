const { getUser, getDB } = require('../utils/db');
module.exports = {
    name: 'pray',
    async execute(message, args, E) {
        const user = getUser(message.author.id);
        const luck = Math.floor(Math.random() * 3) + 1;
        user.luck += luck;
        const db = getDB(); db.users[message.author.id] = user;
        require('fs').writeFileSync('./database.json', JSON.stringify(db, null, 2));
        return message.reply(`${E.pray} | **@${message.author.username}** prays... You feel very lucky!\n| You have **${user.luck}** luck point(s)!`);
    }
};
