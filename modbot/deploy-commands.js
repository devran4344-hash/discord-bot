// ╔══════════════════════════════════════════════════════════════════════╗
// ║  DEPLOY-COMMANDS — Slash komutlarını Discord'a kaydet               ║
// ║  Botu başlatmadan bağımsız çalışır: node deploy-commands.js          ║
// ║  Tüm guild'lere kaydeder (anında aktif, 2 kere görünmez)            ║
// ╚══════════════════════════════════════════════════════════════════════╝

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const chalk = require('chalk');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(chalk.red('❌ BOT_TOKEN .env dosyasında bulunamadı!'));
  process.exit(1);
}

// ── Tüm komut dosyalarını topla ────────────────────────────────────
function collectCommands() {
  const commands = [];
  const commandsDir = path.join(__dirname, 'src', 'commands');

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        try {
          const cmd = require(fullPath);
          if (cmd.data) {
            const json = cmd.data.toJSON ? cmd.data.toJSON() : cmd.data;
            commands.push(json);
            console.log(chalk.green(`  ✓ ${json.name}`));
          }
        } catch (err) {
          console.error(chalk.red(`  ✗ ${entry.name}: ${err.message}`));
        }
      }
    }
  }

  scanDir(commandsDir);

  // Sistem komutları (reactionRole gibi)
  try {
    const rr = require(path.join(__dirname, 'src', 'systems', 'reactionRole'));
    if (rr.data) {
      const json = rr.data.toJSON ? rr.data.toJSON() : rr.data;
      commands.push(json);
      console.log(chalk.green(`  ✓ ${json.name} (sistem)`));
    }
  } catch (err) {
    console.error(chalk.red(`  ✗ reactionRole: ${err.message}`));
  }

  return commands;
}

// ── Ana fonksiyon ──────────────────────────────────────────────────
async function main() {
  console.log(chalk.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.cyan('║  Slash Komut Deploy Aracı                 ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════╝\n'));

  const commands = collectCommands();
  console.log(chalk.yellow(`\n  Toplam ${commands.length} slash komutu bulundu.\n`));

  const rest = new REST({ version: '10' }).setToken(token);

  // Bot bilgilerini al
  const app = await rest.get(Routes.currentApplication());
  console.log(chalk.cyan(`  Bot: ${app.name} (ID: ${app.id})\n`));

  // Tüm guild'lere kaydet (guild-level = anında aktif)
  // Guild ID belirtmek istersen GUILD_ID env değişkeni kullan
  const guildId = process.env.GUILD_ID;

  if (guildId) {
    // Tek guild'e kaydet
    console.log(chalk.cyan(`  ${guildId} sunucusuna kaydediliyor...`));
    await rest.put(Routes.applicationGuildCommands(app.id, guildId), { body: commands });
    console.log(chalk.green(`  ✅ ${commands.length} komut kaydedildi!\n`));
  } else {
    // Global kaydet (tüm sunucular, 1 saat içinde aktif)
    console.log(chalk.cyan('  Global olarak kaydediliyor (tüm sunucular)...'));
    await rest.put(Routes.applicationCommands(app.id), { body: commands });
    console.log(chalk.green(`  ✅ ${commands.length} komut global olarak kaydedildi!`));
    console.log(chalk.yellow('  ⚠️ Global komutlar ~1 saat içinde aktif olur.\n'));
  }

  console.log(chalk.green('  Tamamlandı! ✅\n'));
}

main().catch(err => {
  console.error(chalk.red('\n❌ Deploy hatası:'), err.message);
  process.exit(1);
});
