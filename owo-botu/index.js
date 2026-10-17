require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDB, saveDB, getUser } = require('./utils/db');
const emojis = require('./emojiconfig');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Fallback Emojiler
const E = {
    cowoncy: emojis.cowoncy || '💵',
    daily: emojis.daily || '💰',
    lootbox: emojis.lootbox || '📦',
    timer: emojis.timer || '⏱️',
    streak: emojis.streak || '🔥',
    bag: emojis.bag || '💰',
    cherry: emojis.slot_cherry || '🍒',
    lemon: emojis.slot_lemon || '🍋',
    orange: emojis.slot_orange || '🍊',
    grape: emojis.slot_grape || '🍇',
    coin: emojis.coin || '🪙',
    pray: emojis.pray || '🙏',
    paw: emojis.paw || '🐾'
};

// Komutları Yükle
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.on('ready', () => console.log(`[OWO BOT] ${client.user.tag} olarak giris yapildi!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.toLowerCase().startsWith('owo ')) return;

    const args = message.content.slice(4).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Kısa yollar
    const aliases = { 's': 'slots', 'cf': 'coinflip', 'h': 'hunt', 'bal': 'cash', 'z': 'zoo' };
    const cmdName = aliases[commandName] || commandName;

    if (client.commands.has(cmdName)) {
        try {
            await client.commands.get(cmdName).execute(message, args, E);
        } catch (error) {
            console.error(error);
            message.reply('Bir hata olustu!');
        }
    }
});

// Buton Etkileşimleri (Give komutu için)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('give_confirm_')) {
        const [,, targetId, amount] = interaction.customId.split('_');
        const senderId = interaction.user.id;
        const db = getDB();

        if (db.users[senderId].cash < parseInt(amount)) {
            return interaction.reply({ content: `❌ You don't have enough cowoncy anymore!`, ephemeral: true });
        }

        db.users[senderId].cash -= parseInt(amount);
        if (!db.users[targetId]) db.users[targetId] = { cash: 0, dailyStreak: 0, lastDaily: 0, luck: 0, animals: [] };
        db.users[targetId].cash += parseInt(amount);
        saveDB(db);

        await interaction.update({ content: `✅ Successfully gave **${amount}** cowoncy to <@${targetId}>!`, embeds: [], components: [] });
    }
    if (interaction.customId === 'give_cancel') {
        await interaction.update({ content: `❌ Transaction cancelled.`, embeds: [], components: [] });
    }
});

client.login(process.env.OWO_TOKEN || process.env.DISCORD_TOKEN);
