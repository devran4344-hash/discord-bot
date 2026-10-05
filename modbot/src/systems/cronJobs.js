// ╔══════════════════════════════════════════════════════════════════════╗
// ║              SİSTEM: Cron Jobs (Zamanlı Görevler)                   ║
// ║  - Uyarı expire (30 gün geçince sil)                               ║
// ║  - Stat kanalları güncelleme (her 10 dakika)                       ║
// ║  - Geçici ban bitiş takibi                                         ║
// ╚══════════════════════════════════════════════════════════════════════╝

const cron   = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');
const fs     = require('fs');
const path   = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function readDB(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeDB(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

// ══════════════════════════════════════════════════════════════════════
//  1. UYARI EXPIRE SİSTEMİ
//  Her gün gece 00:00'da çalışır
// ══════════════════════════════════════════════════════════════════════
function startWarnExpireCron(client) {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Uyarı expire kontrolü başladı...');
    const expireTime = config.warnings.expireTime;
    if (!expireTime || expireTime === 0) return;

    const data = readDB('warnings');
    let totalRemoved = 0;

    for (const key of Object.keys(data)) {
      const warns  = data[key];
      const before = warns.length;
      const now    = Date.now();

      data[key] = warns.filter(w => (now - w.timestamp) < expireTime);
      totalRemoved += before - data[key].length;
    }

    if (totalRemoved > 0) {
      writeDB('warnings', data);
      console.log(`[CRON] ${totalRemoved} süresi dolmuş uyarı silindi.`);

      // Tüm sunuculardaki modLog'a bildir
      client.guilds.cache.forEach(async guild => {
        const ch = config.channels.modLog ? guild.channels.cache.get(config.channels.modLog) : null;
        if (!ch) return;
        await ch.send({ embeds: [new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle(`${e.warnClear || '🧹'} Otomatik Uyarı Temizliği`)
          .setDescription(`Süresi dolan **${totalRemoved}** uyarı otomatik olarak silindi.\n> Uyarılar ${Math.floor(expireTime / 86400000)} günden eski olunca otomatik silinir.`)
          .setFooter({ text: 'ModBot Cron Sistemi' })
          .setTimestamp()] }).catch(() => null);
      });
    }
  });
  console.log('  ✓ Cron: Uyarı expire sistemi başlatıldı');
}

// ══════════════════════════════════════════════════════════════════════
//  2. STAT KANALLARI GÜNCELLEMESİ
//  Her 10 dakikada bir çalışır
// ══════════════════════════════════════════════════════════════════════
function startStatChannelCron(client) {
  const updateStats = async () => {
    const cfg = config.statChannels;
    if (!cfg?.enabled) return;

    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.members.fetch().catch(() => null);

        const totalMembers = guild.memberCount;
        const bots         = guild.members.cache.filter(m => m.user.bot).size;
        const humans       = totalMembers - bots;
        const online       = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        const channels     = guild.channels.cache.filter(c => c.type === 0 || c.type === 2).size;
        const roles        = guild.roles.cache.size - 1;
        const boosts       = guild.premiumSubscriptionCount || 0;

        const statMap = {
          totalMembers: { id: cfg.totalMembersChannel, label: cfg.totalMembersLabel || '👥 Toplam Üye: {count}' },
          humans:       { id: cfg.humansChannel,       label: cfg.humansLabel       || '👤 Üye: {count}' },
          bots:         { id: cfg.botsChannel,         label: cfg.botsLabel         || '🤖 Bot: {count}' },
          online:       { id: cfg.onlineChannel,       label: cfg.onlineLabel       || '🟢 Çevrimiçi: {count}' },
          channels:     { id: cfg.channelsChannel,     label: cfg.channelsLabel     || '📢 Kanal: {count}' },
          roles:        { id: cfg.rolesChannel,        label: cfg.rolesLabel        || '🎭 Rol: {count}' },
          boosts:       { id: cfg.boostsChannel,       label: cfg.boostsLabel       || '💎 Boost: {count}' },
        };

        const counts = { totalMembers, humans, bots, online, channels, roles, boosts };

        for (const [key, stat] of Object.entries(statMap)) {
          if (!stat.id) continue;
          const ch = guild.channels.cache.get(stat.id);
          if (!ch) continue;
          const newName = stat.label.replace('{count}', counts[key].toLocaleString('tr-TR'));
          if (ch.name !== newName) {
            await ch.setName(newName).catch(() => null);
            await new Promise(r => setTimeout(r, 500)); // Rate limit önleme
          }
        }
      } catch {}
    }
  };

  // Hemen çalıştır, sonra 10 dakikada bir
  setTimeout(updateStats, 5000);
  cron.schedule('*/10 * * * *', updateStats);
  console.log('  ✓ Cron: Stat kanalları güncelleme başlatıldı');
}

// ══════════════════════════════════════════════════════════════════════
//  3. GEÇİCİ BAN TAKİBİ
//  Her 5 dakikada bir kontrol eder
// ══════════════════════════════════════════════════════════════════════
function startTempBanCron(client) {
  cron.schedule('*/5 * * * *', async () => {
    const data = readDB('tempbans');
    const now  = Date.now();

    for (const key of Object.keys(data)) {
      const ban = data[key];
      if (ban.expiresAt && now >= ban.expiresAt) {
        // Banı kaldır
        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          await guild.bans.remove(ban.userId, 'Geçici ban süresi doldu').catch(() => null);

          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.unban)
            .setTitle(`${e.unban || '🔓'} Geçici Ban Süresi Doldu`)
            .addFields(
              { name: '👤 Kullanıcı', value: `\`${ban.userTag}\`\n\`${ban.userId}\``, inline: true },
              { name: '⏰ Ban Süresi', value: `\`${ban.duration}\``,                   inline: true },
              { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),        inline: true },
            )
            .setTimestamp();
          await sendLog(guild, 'modLog', logEmbed);
        }

        delete data[key];
      }
    }

    writeDB('tempbans', data);
  });
  console.log('  ✓ Cron: Geçici ban takibi başlatıldı');
}

// ══════════════════════════════════════════════════════════════════════
//  4. SAAT BAŞI BOT İSTATİSTİK LOG
//  Her saat başı çalışır
// ══════════════════════════════════════════════════════════════════════
function startHourlyStatsCron(client) {
  cron.schedule('0 * * * *', async () => {
    const memberCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const uptime      = Math.floor(client.uptime / 1000);
    const memMB       = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    client.guilds.cache.forEach(async guild => {
      const ch = config.channels.botLog ? guild.channels.cache.get(config.channels.botLog) : null;
      if (!ch) return;
      await ch.send({ embeds: [new EmbedBuilder()
        .setColor(config.colors.dark || 0x2B2D31)
        .setDescription(
          `${e.stats || '📊'} **Saatlik Rapor** — ` +
          `👥 \`${memberCount}\` üye · ` +
          `⏱️ \`${Math.floor(uptime/3600)}s ${Math.floor((uptime%3600)/60)}d\` · ` +
          `💾 \`${memMB} MB\``,
        )
        .setTimestamp()] }).catch(() => null);
    });
  });
  console.log('  ✓ Cron: Saatlik istatistik logu başlatıldı');
}

// ══════════════════════════════════════════════════════════════════════
//  BAŞLAT — Tüm cron jobları başlat
// ══════════════════════════════════════════════════════════════════════
function startAllCrons(client) {
  startWarnExpireCron(client);
  startStatChannelCron(client);
  startTempBanCron(client);
  startHourlyStatsCron(client);
}

// Geçici ban kaydet (ban.js'den çağrılır)
function saveTempBan(guildId, userId, userTag, duration, expiresAt) {
  const data = readDB('tempbans');
  data[`${guildId}_${userId}`] = { guildId, userId, userTag, duration, expiresAt, createdAt: Date.now() };
  writeDB('tempbans', data);
}

module.exports = { startAllCrons, saveTempBan };
