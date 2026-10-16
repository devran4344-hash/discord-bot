const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '..', 'commands');

    function loadCommands(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                loadCommands(fullPath);
            } else if (file.endsWith('.js')) {
                try {
                    const command = require(fullPath);
                    if (command.data && command.execute) {
                        client.commands.set(command.data.name, command);
                        console.log(`[KOMUT] ${command.data.name} yuklendi`);
                    }
                } catch (err) {
                    console.error(`[HATA] ${file}:`, err.message);
                }
            }
        }
    }

    loadCommands(commandsPath);
    console.log(`Toplam ${client.commands.size} komut yuklendi.`);
};
