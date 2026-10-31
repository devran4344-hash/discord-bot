require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs'), path = require('path');
const cmds = [];
fs.readdirSync(path.join(__dirname,'commands')).filter(f=>f.endsWith('.js')).forEach(f=>{
  const c = require(`./commands/${f}`); if (c.data) cmds.push(c.data.toJSON());
});
const rest = new REST({version:'10'}).setToken(process.env.REELSCORD_TOKEN);
(async () => {
  try { console.log(`[SYSTEM] ${cmds.length} komut kaydediliyor...`);
    await rest.put(Routes.applicationCommands(process.env.REELSCORD_CLIENT_ID), {body:cmds});
    console.log('[SYSTEM] Komutlar kaydedildi.');
  } catch(e) { console.error(e); }
})();