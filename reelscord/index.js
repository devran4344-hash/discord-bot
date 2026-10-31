require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs'), path = require('path');
const handleInteraction = require('./handlers/interactionCreate');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
fs.readdirSync(path.join(__dirname,'commands')).filter(f=>f.endsWith('.js')).forEach(f=>{
  const c = require(`./commands/${f}`); if (c.data && c.execute) client.commands.set(c.data.name, c);
});
client.once('ready', () => console.log(`[SYSTEM] ${client.user.tag} hazir.`));
client.on('interactionCreate', handleInteraction);
client.login(process.env.REELSCORD_TOKEN);