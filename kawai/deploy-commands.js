// Slash komutlarini Discord API sine kaydeder.
// LOCAL de 1 kez calistir: npm run deploy
require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);
            if (command.data && command.execute) {
                commands.push(command.data.toJSON());
                console.log(`Yuklendi: ${command.data.name}`);
            }
        }
    }
}

loadCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`${commands.length} komut Discord a kaydediliyor...`);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Tum komutlar basariyla kaydedildi!');
    } catch (error) {
        console.error('Kayit hatasi:', error);
    }
})();
