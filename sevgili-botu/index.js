// Sevgili Botu - Ana Giris Noktasi
require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.config = config;

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

client.login(process.env.DISCORD_TOKEN);

console.log("Luna baslatiliyor...");
