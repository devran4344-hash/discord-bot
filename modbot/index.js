// ╔═══════════════════════════════════════════════════════════════╗
// ║                    MODBOT - ANA DOSYA                        ║
// ║              Kapsamlı Discord Moderasyon Botu                ║
// ╚═══════════════════════════════════════════════════════════════╝

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

// ─── Uptime / Kapanma Logu ───────────────────────────────────────
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

// Önceki oturumun kapanış zamanını güncelle
if (uptimeData.sessions.length > 0) {
  const lastSession = uptimeData.sessions[uptimeData.sessions.length - 1];
  if (!lastSession.endTime) {
    lastSession.endTime = 'Bilinmiyor (beklenmedik kapanma)';
    lastSession.status = 'crash';
  }
}

// Yeni oturum başlat
const currentSession = {
  id: uptimeData.sessions.length + 1,
  startTime: sessionStartTime.toISOString(),
  endTime: null,
  status: 'running',
};
uptimeData.sessions.push(currentSession);
saveUptimeData(uptimeData);

// ─── Client Oluştur ──────────────────────────────────────────────
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

// ─── Collections ─────────────────────────────────────────────────
client.commands = new Collection();
client.aliases  = new Collection();
client.cooldowns = new Collection();
client.sessionStart = sessionStartTime;
client.uptimeData = uptimeData;
client.currentSession = currentSession;

// ─── Komut Yükleyici ─────────────────────────────────────────────
const commandFolders = fs.readdirSync(path.join(__dirname, 'src', 'commands'));
let loadedCommands = 0;

console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
console.log(chalk.cyan('║         MODBOT Yükleniyor...         ║'));
console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

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
    console.log(chalk.green(`  ✓ Komut yüklendi: ${chalk.white(command.name)}`));
  }
}

// ─── Event Yükleyici ─────────────────────────────────────────────
const eventFiles = fs
  .readdirSync(path.join(__dirname, 'src', 'events'))
  .filter((f) => f.endsWith('.js'));

// Array event dosyaları (birden fazla event içerir)
const ARRAY_EVENT_FILES = ['channelEvents.js', 'roleEvents.js', 'guildUpdate.js', 'reactionEvents.js'];

for (const file of eventFiles) {
  if (ARRAY_EVENT_FILES.includes(file)) {
    // Bu dosyalar ready.js içinde yükleniyor, atla
    console.log(chalk.magenta(`  ⏩ Array event (ready'de yüklenir): ${chalk.white(file)}`));
    continue;
  }
  const event = require(path.join(__dirname, 'src', 'events', file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(chalk.blue(`  ✓ Event yüklendi: ${chalk.white(event.name)}`));
}

// ─── Anti-Raid Sistem ─────────────────────────────────────────────
const antiRaidSystem = require(path.join(__dirname, 'src', 'systems', 'antiRaid'));
client.on(antiRaidSystem.name, (...args) => antiRaidSystem.execute(...args, client));
console.log(chalk.blue(`  ✓ Sistem yüklendi: ${chalk.white('antiRaid')}`))

// ─── Davet Tracker ────────────────────────────────────────────────
const inviteTracker = require(path.join(__dirname, 'src', 'systems', 'inviteTracker'));
client.on('inviteCreate', invite => inviteTracker.handleInviteCreate(invite));
client.on('inviteDelete', invite => inviteTracker.handleInviteDelete(invite));
console.log(chalk.blue(`  ✓ Sistem yüklendi: ${chalk.white('inviteTracker')}`));

// ─── Reaction Role ─────────────────────────────────────────────────
const reactionRole = require(path.join(__dirname, 'src', 'systems', 'reactionRole'));
client.commands.set(reactionRole.name, reactionRole);
if (reactionRole.aliases) reactionRole.aliases.forEach(a => client.aliases.set(a, reactionRole.name));
client._rrHandler = reactionRole.handleButton;
loadedCommands++;
console.log(chalk.green(`  ✓ Komut yüklendi: ${chalk.white(reactionRole.name)}`));

// ─── Cron Jobs ─────────────────────────────────────────────────────
const { startAllCrons } = require(path.join(__dirname, 'src', 'systems', 'cronJobs'));
client.once('clientReady', () => {
  startAllCrons(client);
  client.guilds.cache.forEach(guild => inviteTracker.loadInvites(guild));
});
console.log(chalk.blue(`  ✓ Sistem yüklendi: ${chalk.white('cronJobs')}`));console.log(chalk.yellow(`\n  Toplam ${loadedCommands} komut yüklendi.`));
console.log(chalk.yellow(`  Toplam ${eventFiles.length} event yüklendi.\n`));

// ─── Hata Yakalayıcı ─────────────────────────────────────────────
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n[HATA] İşlenmeyen Promise hatası:'), error);
  const errorLog = path.join(logDir, 'errors.log');
  const errorEntry = `[${moment().format('DD.MM.YYYY HH:mm:ss')}] UnhandledRejection: ${error.stack || error}\n`;
  fs.appendFileSync(errorLog, errorEntry);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n[KRİTİK HATA] Yakalanmayan istisna:'), error);
  const errorLog = path.join(logDir, 'errors.log');
  const errorEntry = `[${moment().format('DD.MM.YYYY HH:mm:ss')}] UncaughtException: ${error.stack || error}\n`;
  fs.appendFileSync(errorLog, errorEntry);
});

// ─── Kapanma Logu ────────────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(chalk.red(`\n[KAPANIŞ] ${signal} sinyali alındı. Bot kapatılıyor...`));

  currentSession.endTime = new Date().toISOString();
  currentSession.status = 'graceful';
  const uptime = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
  currentSession.uptime = `${Math.floor(uptime / 3600)}s ${Math.floor((uptime % 3600) / 60)}d ${uptime % 60}sn`;
  saveUptimeData(uptimeData);

  const shutdownLog = path.join(logDir, 'shutdown.log');
  fs.appendFileSync(
    shutdownLog,
    `[${moment().format('DD.MM.YYYY HH:mm:ss')}] Bot kapatıldı. Sinyal: ${signal} | Uptime: ${currentSession.uptime}\n`,
  );

  // Discord'a bildir (eğer bağlıysa)
  const config = require('./src/config');
  if (client.isReady() && config.channels?.botLog) {
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('🔴 Bot Kapatıldı')
      .setColor(0xff0000)
      .addFields(
        { name: '⏰ Kapanış Zamanı', value: moment().format('DD.MM.YYYY HH:mm:ss'), inline: true },
        { name: '⏱️ Çalışma Süresi', value: currentSession.uptime, inline: true },
        { name: '📡 Sinyal', value: signal, inline: true },
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

require('dotenv').config(); // varsa altına
const { initFirebase } = require('./src/utils/database');
initFirebase();

// ─── Login ────────────────────────────────────────────────────────
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(chalk.red('[HATA] BOT_TOKEN bulunamadı! .env dosyasını kontrol et.'));
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error(chalk.red('[HATA] Giriş yapılamadı:'), err.message);
  process.exit(1);
});
