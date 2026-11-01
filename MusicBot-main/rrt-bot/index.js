'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  RRT BOT — Yönlendirici / Koordinatör                                      ║
// ║  /play komutlarını alır, boş ajan bota yönlendirir                         ║
// ║  Başlatmak: node rrt-bot/index.js  (veya pool-start.js)                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    ActivityType,
    REST,
    Routes,
} = require('discord.js');
const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');
const pool  = require('./agentPool');

// ─── Client ──────────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // ses kanalı bilgisi için
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();

// ─── Komutları yükle ─────────────────────────────────────────────────────────
function loadCommands() {
    const dir = path.join(__dirname, 'commands');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
        const cmd = require(path.join(dir, file));
        if (cmd.data && cmd.execute) {
            client.commands.set(cmd.data.name, cmd);
            console.log(chalk.green(`  ✓  Komut yüklendi: ${chalk.bold(cmd.data.name)}`));
        }
    }
}

// ─── Slash komutlarını Discord'a kaydet ──────────────────────────────────────
async function deployCommands() {
    const token    = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId  = process.env.GUILD_ID || null;

    if (!token || !clientId) {
        console.log(chalk.yellow('  ⚠  DISCORD_TOKEN veya CLIENT_ID eksik — komutlar register edilmedi'));
        return;
    }

    const commands = [...client.commands.values()].map(c => c.data.toJSON());
    const rest     = new REST({ version: '10' }).setToken(token);

    try {
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log(chalk.green(`  ✅  ${commands.length} komut ${guildId} guild'ine kaydedildi`));
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log(chalk.green(`  ✅  ${commands.length} komut global olarak kaydedildi`));
        }
    } catch (err) {
        console.error(chalk.red('  ❌  Komut deploy hatası:'), err.message);
    }
}

// ─── Ready ───────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
    console.log('');
    console.log(chalk.cyan('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.cyan('  ║') + chalk.bold.white('   🎛️  RRT BOT — YÖNLENDİRİCİ — HAZIR    ') + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚══════════════════════════════════════════╝'));
    console.log(chalk.white(`  👤 Tag    : ${client.user.tag}`));
    console.log(chalk.white(`  🏠 Sunucu : ${client.guilds.cache.size}`));
    console.log(chalk.white(`  📦 Komut  : ${client.commands.size}`));
    console.log('');

    // Slash komutları kaydet
    await deployCommands();

    // Durum mesajı
    const setStatus = () => {
        const statuses = [
            { name: '🎵 /play ile müzik çal', type: ActivityType.Playing   },
            { name: '🤖 3 ajan bot yönetimi', type: ActivityType.Watching  },
            { name: '🎛️ RRT Havuz Sistemi',   type: ActivityType.Listening },
        ];
        let i = 0;
        client.user.setActivity(statuses[0]);
        setInterval(() => { i = (i + 1) % statuses.length; client.user.setActivity(statuses[i]); }, 30_000);
    };
    setStatus();

    // Ajan sağlık monitörünü başlat
    pool.startHealthMonitor((statuses) => {
        const online = statuses.filter(s => s.online).map(s => s.name).join(', ');
        const offline = statuses.filter(s => !s.online).map(s => s.name).join(', ');
        if (offline) console.log(chalk.yellow(`  ⚠  [Pool] Çevrimdışı ajanlar: ${offline}`));
        else         console.log(chalk.gray(`  ✓  [Pool] Tüm ajanlar aktif: ${online}`));
    });
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (err) {
        console.error(chalk.red(`  ❌  /${interaction.commandName} hatası:`), err.message);
        const msg = '❌ Komut çalıştırılırken hata oluştu.';
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: msg, ephemeral: true });
            } else {
                await interaction.reply({ content: msg, ephemeral: true });
            }
        } catch { /* yanıt verilemedi */ }
    }
});

// ─── Hata yakalama ────────────────────────────────────────────────────────────
process.on('unhandledRejection', reason => {
    if (!reason) return;
    const code = reason?.code;
    if (code === 10062 || code === 40060) return;
    console.error(chalk.red('  ❌  UnhandledRejection:'), reason?.message || reason);
});

process.on('uncaughtException', err => {
    if (/ECONNRESET|ETIMEDOUT|terminated/.test(err.message || '')) return;
    console.error(chalk.red('  ❌  UncaughtException:'), err.message);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (sig) => {
    console.log(chalk.yellow(`\n  ⚠  ${sig} — RRT Bot kapatılıyor...`));
    pool.stopHealthMonitor();
    client.destroy();
    process.exit(0);
};
process.once('SIGINT',  () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// ─── Başlat ───────────────────────────────────────────────────────────────────
async function init() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error(chalk.red('  ❌  DISCORD_TOKEN bulunamadı! rrt-bot/.env dosyasını kontrol et.'));
        process.exit(1);
    }
    loadCommands();
    await client.login(token);
}

init().catch(err => {
    console.error(chalk.red('  ❌  RRT Bot başlatılamadı:'), err.message);
    process.exit(1);
});
