const { getUser, getDB } = require('../utils/db');
module.exports = {
    name: 'hunt',
    async execute(message, args, E) {
        const user = getUser(message.author.id);
        const animals = ['Dog', 'Cat', 'Rabbit', 'Fox', 'Bear', 'Dragon', 'Unicorn'];
        const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Mythical'];
        
        const animal = animals[Math.floor(Math.random() * animals.length)];
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        
        if (!user.animals) user.animals = [];
        user.animals.push({ name: animal, rarity: rarity });
        
        const db = getDB(); db.users[message.author.id] = user;
        require('fs').writeFileSync('./database.json', JSON.stringify(db, null, 2));

        return message.reply(`🌿 | **${message.author.username}** went hunting and caught a **${animal}** (${rarity})!`);
    }
};
