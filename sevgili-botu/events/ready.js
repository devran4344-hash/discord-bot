const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Luna hazir! ${client.user.tag} olarak giris yapildi.`);
        console.log(`Toplam ${client.guilds.cache.size} sunucuda aktif.`);

        client.user.setPresence({
            activities: [{
                name: 'seninle olmak | etiketle 💕',
                type: ActivityType.Playing
            }],
            status: 'online'
        });
    }
};
