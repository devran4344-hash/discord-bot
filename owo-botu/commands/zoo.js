const { getUser } = require('../utils/db');
module.exports = {
    name: 'zoo',
    async execute(message, args, E) {
        const user = getUser(message.author.id);
        if (!user.animals || user.animals.length === 0) return message.reply(`${E.paw} | Your zoo is empty! Use \`owo hunt\` to catch animals.`);
        
        let text = `**${message.author.username}'s Zoo** ${E.paw}\n\n`;
        user.animals.forEach((a, i) => {
            text += `${i+1}. **${a.name}** (${a.rarity})\n`;
        });
        
        return message.reply(text);
    }
};
