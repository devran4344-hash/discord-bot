// ╔═══════════════════════════════════════════════════════════════╗
// ║               SİSTEM: Anti-Raid Koruma                      ║
// ╚═══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { sendLog, formatDate } = require('../utils/helpers');
const config = require('../config');
const emojis = require('../emojiConfig');

// Sunucu başına katılım tracker
const joinTracker  = new Map(); // guildId -> timestamp[]
const raidModeMap  = new Map(); // guildId -> boolean

module.exports = {
  name: 'raidCheck',
  once: false,

  async execute(member, client) {
    const cfg   = config.antiRaid;
    if (!cfg.enabled) return;

    const guildId = member.guild.id;
    const now     = Date.now();

    // Katılım geçmişini güncelle
    if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);
    const joins = joinTracker.get(guildId);
    joins.push(now);

    // Pencere dışı girişleri temizle
    const recent = joins.filter((t) => now - t < cfg.joinWindow);
    joinTracker.set(guildId, recent);

    // Raid tespiti
    const isRaidMode = raidModeMap.get(guildId) || false;

    if (recent.length >= cfg.joinLimit && !isRaidMode) {
      // RAID MODU AKTİF
      raidModeMap.set(guildId, true);
      console.log(`[ANTİ-RAID] ${member.guild.name} sunucusunda raid modu aktif! (${recent.length} katılım)`);

      // Uyarı mesajı gönder
      const alertEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle(`${emojis.raid} ⚠️ RAID MODU AKTİF`)
        .setDescription(`**${recent.length}** kullanıcı çok kısa sürede sunucuya katıldı!\nRaid modu aktive edildi.`)
        .addFields(
          { name: '⏱️ Tespit Penceresi', value: `${cfg.joinWindow / 1000}sn içinde ${recent.length} katılım`, inline: true },
          { name: '⚡ Alınan Aksiyon',   value: cfg.action.toUpperCase(),                                       inline: true },
          { name: '📅 Tarih',            value: formatDate(new Date()),                                         inline: true },
        )
        .setTimestamp();

      await sendLog(member.guild, 'automodLog', alertEmbed);

      // Lockdown modu
      if (cfg.action === 'lockdown') {
        try {
          // @everyone'ın sunucuya katılmasını kısıtla (doğrulama seviyesi yükselt)
          await member.guild.setVerificationLevel(4, 'Anti-Raid: Otomatik lockdown').catch(() => null);
        } catch {}
      }

      // Otomatik raid modu kapanma
      setTimeout(async () => {
        raidModeMap.set(guildId, false);
        joinTracker.set(guildId, []);

        // Doğrulama seviyesini eski haline getir
        if (cfg.action === 'lockdown') {
          await member.guild.setVerificationLevel(1).catch(() => null);
        }

        const endEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${emojis.unlock} Raid Modu Devre Dışı`)
          .setDescription('Raid modu otomatik olarak kapatıldı.')
          .addFields({ name: '📅 Tarih', value: formatDate(new Date()), inline: true })
          .setTimestamp();

        await sendLog(member.guild, 'automodLog', endEmbed);
      }, cfg.lockdownDuration);
    }

    // Raid modunda yeni gelen üyelere ceza
    if (isRaidMode && cfg.newJoinAction !== 'none') {
      if (cfg.newJoinAction === 'kick') {
        await member.kick('Anti-Raid: Raid modu aktif, yeni katılımlar engelleniyor').catch(() => null);
      } else if (cfg.newJoinAction === 'ban') {
        await member.guild.bans.create(member.id, { reason: 'Anti-Raid: Raid modu aktif' }).catch(() => null);
      }

      const kickedEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle(`${emojis.raid} Raid Modu — Kullanıcı ${cfg.newJoinAction === 'kick' ? 'Atıldı' : 'Yasaklandı'}`)
        .addFields(
          { name: '👤 Kullanıcı', value: `${member.user.tag}\n\`${member.id}\``, inline: true },
          { name: '⚡ İşlem',     value: cfg.newJoinAction.toUpperCase(),        inline: true },
          { name: '📅 Tarih',     value: formatDate(new Date()),                 inline: true },
        )
        .setTimestamp();

      await sendLog(member.guild, 'automodLog', kickedEmbed);
    }
  },
};
