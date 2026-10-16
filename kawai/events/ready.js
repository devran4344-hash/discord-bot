const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Kawai hazir! ${client.user.tag} olarak giris yapildi.`);
        console.log(`Toplam ${client.guilds.cache.size} sunucuda aktif.`);

        // Bot durumunu ayarla
        client.user.setPresence({
            activities: [{
                name: 'RSS maclari | /yardim',
                type: ActivityType.Watching
            }],
            status: 'online'
        });
    }
};
