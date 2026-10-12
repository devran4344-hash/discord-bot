// ╔══════════════════════════════════════════════════════════════════════╗
// ║         SLASH KOMUT REGISTER SİSTEMİ                               ║
// ║  Bot ready olduğunda tüm guild'lere otomatik register eder         ║
// ║  Komutlar 2 kere görünmez — guild-level, anında aktif              ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { REST, Routes } = require('discord.js');

/**
 * client.commands içindeki data field'ı olan tüm komutları
 * botun bulunduğu tüm guild'lere register eder.
 * Global yerine guild-level: anında aktif, 2 kere görünmez.
 */
async function registerSlashCommands(client) {
  const token   = process.env.BOT_TOKEN;
  const appId   = client.user.id;
  const rest    = new REST({ version: '10' }).setToken(token);

  // data field'ı olan komutları topla
  const slashData = [];
  for (const cmd of client.commands.values()) {
    if (cmd.data) {
      try {
        slashData.push(cmd.data.toJSON ? cmd.data.toJSON() : cmd.data);
      } catch (err) {
        console.error(`[Slash] ${cmd.name} data parse hatası:`, err.message);
      }
    }
  }

  if (slashData.length === 0) {
    console.log('[Slash] Register edilecek slash komut yok.');
    return;
  }

  console.log(`[Slash] ${slashData.length} slash komut register ediliyor...`);

  const guilds = client.guilds.cache;
  let success = 0;

  for (const [guildId, guild] of guilds) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(appId, guildId),
        { body: slashData },
      );
      success++;
    } catch (err) {
      console.error(`[Slash] ${guild.name} (${guildId}) register hatası:`, err.message);
    }
  }

  console.log(`[Slash] ✅ ${slashData.length} komut ${success}/${guilds.size} guild'e register edildi.`);
}

module.exports = { registerSlashCommands };
