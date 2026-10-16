// Proaktif mesaj - bot kendi kendine mesaj atar (varsayilan kapali)
const { Events } = require('discord.js');
const db = require('../utils/database');
const { proaktifMesaj } = require('../utils/ai');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        if (!config.proaktif.enabled) {
            console.log('Proaktif mesajlar devre disi.');
            return;
        }

        // Her saat kontrol et
        setInterval(async () => {
            const saat = new Date().getHours();
            if (!config.proaktif.saatler.includes(saat)) return;

            try {
                // Tum kullanicilari cek (max 100)
                const usersSnap = await db.getLeaderboard(100);
                for (const user of usersSnap) {
                    if (!user.karakter || !user.iliski) continue;

                    // Son 1 saatte mesaj atmadiysa
                    if (Date.now() - (user.iliski.sonMesaj || 0) < 3600000) continue;

                    try {
                        const mesaj = await proaktifMesaj(user.karakter, user.iliski, saat);
                        const discordUser = await client.users.fetch(user.id).catch(() => null);
                        if (discordUser) {
                            await discordUser.send(mesaj).catch(() => {});
                        }
                    } catch (e) {
                        // Sessizce devam et
                    }
                }
            } catch (err) {
                console.error('Proaktif hata:', err.message);
            }
        }, 60 * 60 * 1000); // Her saat
    }
};
