// Event dosyalarini otomatik yukler
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const fullPath = path.join(eventsPath, file);
        try {
            const event = require(fullPath);
            if (event.name && event.execute) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                console.log(`[EVENT] ${event.name} yuklendi`);
            }
        } catch (err) {
            console.error(`[HATA] ${file} yuklenemedi:`, err.message);
        }
    }
};
