// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘                    MODBOT - ANA DOSYA                        â•‘
// â•‘              KapsamlÄ± Discord Moderasyon Botu                â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');

// â”€â”€â”€ Uptime / Kapanma Logu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const logDir = path.join(__dirname, 'logs');
const uptimeFile = path.join(logDir, 'uptime.json');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function loadUptimeData() {
  if (!fs.existsSync(uptimeFile)) return { sessions: [] };
  try { return JSON.parse(fs.readFileSync(uptimeFile, 'utf8')); }
  catch { return { sessions: [] }; }
}

function saveUptimeData(data) {
  fs.writeFileSync(uptimeFile, JSON.stringify(data, null, 2));
}

const uptimeData = loadUptimeData();
const sessionStartTime = new Date();

// Ã–nceki oturumun kapanÄ±ÅŸ zamanÄ±nÄ± gÃ¼ncelle
if (uptimeData.sessions.length > 0) {
  const lastSession = uptimeData.sessions[uptimeData.sessions.length - 1];
  if (!lastSession.endTime) {
    lastSession.endTime = 'Bilinmiyor (beklenmedik kapanma)';
    lastSession.status = 'crash';
  }
}

// Yeni oturum baÅŸlat
const currentSession = {
  id: uptimeData.sessions.length + 1,
  startTime: sessionStartTime.toISOString(),
  endTime: null,
  status: 'running',
};
uptimeData.sessions.push(currentSession);
saveUptimeData(uptimeData);

// â”€â”€â”€ Client OluÅŸtur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

// â”€â”€â”€ Collections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
client.commands = new Collection();
client.aliases  = new Collection();
client.cooldowns = new Collection();
client.sessionStart = sessionStartTime;
client.uptimeData = uptimeData;
client.currentSession = currentSession;

// â”€â”€â”€ Komut YÃ¼kleyici â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const commandFolders = fs.readdirSync(path.join(__dirname, 'src', 'commands'));
let loadedCommands = 0;

console.log(chalk.cyan('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—'));
console.log(chalk.cyan('â•‘         MODBOT YÃ¼kleniyor...         â•‘'));
console.log(chalk.cyan('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n'));

for (const folder of commandFolders) {
  const commandFiles = fs
    .readdirSync(path.join(__dirname, 'src', 'commands', folder))
    .filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'src', 'commands', folder, file));
    if (!command.name) continue;

    client.commands.set(command.name, command);
    if (command.aliases) {
      command.aliases.forEach((alias) => client.aliases.set(alias, command.name));
    }
    loadedCommands++;
    console.log(chalk.green(`  âœ“ Komut yÃ¼klendi: ${chalk.white(command.name)}`));
  }
}

// â”€â”€â”€ Event YÃ¼kleyici â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const eventFiles = fs
  .readdirSync(path.join(__dirname, 'src', 'events'))
  .filter((f) => f.endsWith('.js'));

// Array event dosyalarÄ± (birden fazla event iÃ§erir)
const ARRAY_EVENT_FILES = ['channelEvents.js', 'roleEvents.js', 'guildUpdate.js', 'reactionEvents.js'];

for (const file of eventFiles) {
  if (ARRAY_EVENT_FILES.includes(file)) {
    // Bu dosyalar ready.js iÃ§inde yÃ¼kleniyor, atla
    console.log(chalk.magenta(`  â© Array event (ready'de yÃ¼klenir): ${chalk.white(file)}`));
    continue;
  }
  const event = require(path.join(__dirname, 'src', 'events', file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(chalk.blue(`  âœ“ Event yÃ¼klendi: ${chalk.white(event.name)}`));
}

// â”€â”€â”€ Anti-Raid Sistem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const antiRaidSystem = require(path.join(__dirname, 'src', 'systems', 'antiRaid'));
client.on(antiRaidSystem.name, (...args) => antiRaidSystem.execute(...args, client));
console.log(chalk.blue(`  âœ“ Sistem yÃ¼klendi: ${chalk.white('antiRaid')}`))

// â”€â”€â”€ Davet Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inviteTracker = require(path.join(__dirname, 'src', 'systems', 'inviteTracker'));
client.on('inviteCreate', invite => inviteTracker.handleInviteCreate(invite));
client.on('inviteDelete', invite => inviteTracker.handleInviteDelete(invite));
console.log(chalk.blue(`  âœ“ Sistem yÃ¼klendi: ${chalk.white('inviteTracker')}`));

// â”€â”€â”€ Reaction Role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const reactionRole = require(path.join(__dirname, 'src', 'systems', 'reactionRole'));
client.commands.set(reactionRole.name, reactionRole);
if (reactionRole.aliases) reactionRole.aliases.forEach(a => client.aliases.set(a, reactionRole.name));
client._rrHandler = reactionRole.handleButton;
loadedCommands++;
console.log(chalk.green(`  âœ“ Komut yÃ¼klendi: ${chalk.white(reactionRole.name)}`));

// â”€â”€â”€ Cron Jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { startAllCrons } = require(path.join(__dirname, 'src', 'systems', 'cronJobs'));
client.once('clientReady', () => {
  startAllCrons(client);
  client.guilds.cache.forEach(guild => inviteTracker.loadInvites(guild));
});
console.log(chalk.blue(`  âœ“ Sistem yÃ¼klendi: ${chalk.white('cronJobs')}`));console.log(chalk.yellow(`\n  Toplam ${loadedCommands} komut yÃ¼klendi.`));
console.log(chalk.yellow(`  Toplam ${eventFiles.length} event yÃ¼klendi.\n`));

// â”€â”€â”€ Hata YakalayÄ±cÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n[HATA] Ä°ÅŸlenmeyen Promise hatasÄ±:'), error);
  const errorLog = path.join(logDir, 'errors.log');
  const errorEntry = `[${moment().format('DD.MM.YYYY HH:mm:ss')}] UnhandledRejection: ${error.stack || error}\n`;
  fs.appendFileSync(errorLog, errorEntry);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n[KRÄ°TÄ°K HATA] Yakalanmayan istisna:'), error);
  const errorLog = path.join(logDir, 'errors.log');
  const errorEntry = `[${moment().format('DD.MM.YYYY HH:mm:ss')}] UncaughtException: ${error.stack || error}\n`;
  fs.appendFileSync(errorLog, errorEntry);
});

// â”€â”€â”€ Kapanma Logu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function gracefulShutdown(signal) {
  console.log(chalk.red(`\n[KAPANIÅ] ${signal} sinyali alÄ±ndÄ±. Bot kapatÄ±lÄ±yor...`));

  currentSession.endTime = new Date().toISOString();
  currentSession.status = 'graceful';
  const uptime = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
  currentSession.uptime = `${Math.floor(uptime / 3600)}s ${Math.floor((uptime % 3600) / 60)}d ${uptime % 60}sn`;
  saveUptimeData(uptimeData);

  const shutdownLog = path.join(logDir, 'shutdown.log');
  fs.appendFileSync(
    shutdownLog,
    `[${moment().format('DD.MM.YYYY HH:mm:ss')}] Bot kapatÄ±ldÄ±. Sinyal: ${signal} | Uptime: ${currentSession.uptime}\n`,
  );

  // Discord'a bildir (eÄŸer baÄŸlÄ±ysa)
  const config = require('./src/config');
  if (client.isReady() && config.channels?.botLog) {
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('ğŸ”´ Bot KapatÄ±ldÄ±')
      .setColor(0xff0000)
      .addFields(
        { name: 'â° KapanÄ±ÅŸ ZamanÄ±', value: moment().format('DD.MM.YYYY HH:mm:ss'), inline: true },
        { name: 'â±ï¸ Ã‡alÄ±ÅŸma SÃ¼resi', value: currentSession.uptime, inline: true },
        { name: 'ğŸ“¡ Sinyal', value: signal, inline: true },
      )
      .setTimestamp();

    client.guilds.cache.forEach((guild) => {
      const logChannel = guild.channels.cache.get(config.channels.botLog);
      if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});
    });
  }

  setTimeout(() => {
    client.destroy();
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// â”€â”€â”€ Firebase BaÅŸlat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { initFirebase } = require('./src/utils/database');
try {
  initFirebase();
  console.log(chalk.green('[firebase] âœ… Firebase baÅŸlatÄ±ldÄ±'));
} catch (err) {
  console.error(chalk.red('[firebase] âŒ BaÅŸlatma hatasÄ±:'), err.message);
}
// â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(chalk.red('[HATA] BOT_TOKEN bulunamadÄ±! .env dosyasÄ±nÄ± kontrol et.'));
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error(chalk.red('[HATA] GiriÅŸ yapÄ±lamadÄ±:'), err.message);
  process.exit(1);
});
// [translate auto-inject]
try { require('./src/translate/autoinit')(client); } catch (e) { console.error('[translate] init error:', e); }

