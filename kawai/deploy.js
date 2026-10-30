const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[DEPLOY] ${commands.length} adet komut Discord'a kaydediliyor...`);

        // GitHub Actions'tan GUILD_ID geliyorsa onu kullan, yoksa global kaydet
        const GUILD_ID = process.env.GUILD_ID || 'BURAYA_SUNUCU_ID_YAZ'; 

        if (GUILD_ID === 'BURAYA_SUNUCU_ID_YAZ' || GUILD_ID === '') {
            // Global kayıt (1 saat sürebilir)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`[DEPLOY] Başarılı! ${data.length} komut GLOBAL olarak kaydedildi.`);
        } else {
            // Sunucuya özel kayıt (Anında düşer)
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
                { body: commands },
            );
            console.log(`[DEPLOY] Başarılı! ${data.length} komut SUNUCUYA özel kaydedildi.`);
        }
    } catch (error) {
        console.error('[DEPLOY] HATA:', error);
    }
})();
