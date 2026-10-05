// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  MODBOT — YARDIMCI FONKSİYONLAR                    ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const emojis = require('../emojiConfig');
const moment = require('moment');
moment.locale('tr');

// ══════════════════════════════════════════════════
//  EMBED FACTORY — her türlü embed için tek merkez
// ══════════════════════════════════════════════════

/**
 * Temel embed oluşturucu.
 * options: { title, description, color, thumbnail, image, url, fields, footer, author, timestamp }
 */
function createEmbed(options = {}) {
  const embed = new EmbedBuilder();
  if (options.title)       embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color)       embed.setColor(options.color);
  if (options.thumbnail)   embed.setThumbnail(options.thumbnail);
  if (options.image)       embed.setImage(options.image);
  if (options.url)         embed.setURL(options.url);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.footer)      embed.setFooter(options.footer);
  if (options.author)      embed.setAuthor(options.author);
  if (options.timestamp !== false) embed.setTimestamp();
  return embed;
}

// ── Hazır embed tipleri ────────────────────────────────────────────────

function successEmbed(desc, title) {
  return createEmbed({
    color: config.colors.success,
    description: `${emojis.success} ${desc}`,
    title: title ? `${emojis.success} ${title}` : undefined,
  });
}

function errorEmbed(desc, title) {
  return createEmbed({
    color: config.colors.error,
    description: `${emojis.error} ${desc}`,
    title: title ? `${emojis.error} ${title}` : undefined,
  });
}

function warningEmbed(desc, title) {
  return createEmbed({
    color: config.colors.warning,
    description: `${emojis.warning} ${desc}`,
    title: title ? `${emojis.warning} ${title}` : undefined,
  });
}

function infoEmbed(desc, title) {
  return createEmbed({
    color: config.colors.info,
    description: `${emojis.info} ${desc}`,
    title: title ? `${emojis.info} ${title}` : undefined,
  });
}

// ── MOD-LOG embed fabrikası ────────────────────────────────────────────
// Bu fonksiyon tüm mod log embedlerini tutarlı bir şablonda üretir.

function modLogEmbed({
  type,        // 'BAN' | 'KICK' | 'MUTE' | 'WARN' | 'UNBAN' | 'UNMUTE' | 'TIMEOUT' | ...
  color,
  emoji,
  title,
  target,      // { tag, id, avatar }
  executor,    // { tag, id }
  reason,
  extra = [],  // Ekstra field dizisi [{ name, value, inline }]
  footer,
  thumbnail,
}) {
  const embed = new EmbedBuilder()
    .setColor(color || config.colors.modlog)
    .setTitle(`${emoji || ''} ${title}`)
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);

  // Sabit alanlar — her mod log'da bulunur
  const fields = [
    {
      name: '👤 Kullanıcı',
      value: `> <@${target.id}>\n> \`${target.tag}\`\n> \`${target.id}\``,
      inline: true,
    },
    {
      name: '👮 Yetkili',
      value: executor
        ? `> <@${executor.id}>\n> \`${executor.tag}\``
        : '> `Sistem (Otomatik)`',
      inline: true,
    },
    { name: '\u200b', value: '\u200b', inline: true }, // spacer
    {
      name: '📋 Sebep',
      value: `> ${reason || 'Sebep belirtilmedi'}`,
      inline: false,
    },
    ...extra,
  ];

  embed.addFields(fields);
  embed.setFooter({
    text: footer || `Kullanıcı ID: ${target.id} • ${moment().format('DD.MM.YYYY HH:mm')}`,
  });

  return embed;
}

// ══════════════════════════════════════════════════
//  SÜRE / TARİH YARDIMCILARI
// ══════════════════════════════════════════════════

function parseDuration(str) {
  if (!str) return null;
  try { return require('ms')(str) || null; }
  catch { return null; }
}

function formatDuration(ms) {
  if (!ms) return 'Süresiz';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}g ${h % 24}s ${m % 60}d`;
  if (h > 0)  return `${h}s ${m % 60}d ${s % 60}sn`;
  if (m > 0)  return `${m}d ${s % 60}sn`;
  return `${s}sn`;
}

function formatDate(date) {
  return moment(date).format('DD.MM.YYYY HH:mm:ss');
}

function timeAgo(date) {
  return moment(date).fromNow();
}

function discordTimestamp(date, style = 'f') {
  // style: f=tam, R=göreceli, d=kısa tarih, t=kısa saat
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

// ══════════════════════════════════════════════════
//  ÜYE BULMA
// ══════════════════════════════════════════════════

async function findMember(guild, query) {
  if (!query) return null;
  const mentionMatch = query.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return guild.members.fetch(mentionMatch[1]).catch(() => null);
  if (/^\d{15,20}$/.test(query)) return guild.members.fetch(query).catch(() => null);
  await guild.members.fetch().catch(() => null);
  const lower = query.toLowerCase();
  return (
    guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === lower ||
        m.user.tag.toLowerCase() === lower ||
        (m.nickname && m.nickname.toLowerCase() === lower) ||
        m.user.username.toLowerCase().startsWith(lower),
    ) || null
  );
}

async function findUser(client, query) {
  if (!query) return null;
  const mentionMatch = query.match(/^<@!?(\d+)>$/);
  const id = mentionMatch ? mentionMatch[1] : /^\d{15,20}$/.test(query) ? query : null;
  if (id) return client.users.fetch(id).catch(() => null);
  return null;
}

// ══════════════════════════════════════════════════
//  İZİN / HİYERARŞİ KONTROL
// ══════════════════════════════════════════════════

function hasPermission(member, permission) {
  if (member.id === member.guild.ownerId) return true;
  if (member.id === config.ownerID) return true;
  return member.permissions.has(permission);
}

function isModerator(member) {
  if (member.id === member.guild.ownerId) return true;
  if (member.id === config.ownerID) return true;
  const modPerms = [
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageMessages,
  ];
  if (modPerms.some((p) => member.permissions.has(p))) return true;
  if (config.roles.moderator && member.roles.cache.has(config.roles.moderator)) return true;
  if (config.roles.admin     && member.roles.cache.has(config.roles.admin))     return true;
  return false;
}

function canModerate(executor, target) {
  if (!target) return false;
  if (target.id === target.guild.ownerId) return false;
  if (target.id === executor.id) return false;
  if (executor.roles.highest.position <= target.roles.highest.position) return false;
  return true;
}

// ══════════════════════════════════════════════════
//  LOG GÖNDER
// ══════════════════════════════════════════════════

async function sendLog(guild, channelKey, embed) {
  const channelId = config.channels[channelKey];
  if (!channelId) return null;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return null;
  return channel.send({ embeds: [embed] }).catch(() => null);
}

// ══════════════════════════════════════════════════
//  TEHLİKELİ İZİN TESPİTİ
// ══════════════════════════════════════════════════

const DANGEROUS_PERMISSIONS = [
  { flag: PermissionFlagsBits.Administrator,           name: 'Yönetici' },
  { flag: PermissionFlagsBits.BanMembers,              name: 'Üyeleri Engelle' },
  { flag: PermissionFlagsBits.KickMembers,             name: 'Üyeleri At' },
  { flag: PermissionFlagsBits.ManageGuild,             name: 'Sunucuyu Yönet' },
  { flag: PermissionFlagsBits.ManageRoles,             name: 'Rolleri Yönet' },
  { flag: PermissionFlagsBits.ManageChannels,          name: 'Kanalları Yönet' },
  { flag: PermissionFlagsBits.ManageWebhooks,          name: 'Webhook Yönet' },
  { flag: PermissionFlagsBits.ManageMessages,          name: 'Mesajları Yönet' },
  { flag: PermissionFlagsBits.MentionEveryone,         name: 'Herkesi Etiketle' },
  { flag: PermissionFlagsBits.ViewAuditLog,            name: 'Denetim Kaydını Gör' },
  { flag: PermissionFlagsBits.ModerateMembers,         name: 'Üyeleri Yönet (Timeout)' },
  { flag: PermissionFlagsBits.ManageNicknames,         name: 'Takma Adları Yönet' },
];

function getDangerousPermissions(permissions) {
  return DANGEROUS_PERMISSIONS.filter((p) => permissions.has(p.flag)).map((p) => p.name);
}

const ALL_PERMISSIONS_MAP = [
  { flag: PermissionFlagsBits.Administrator,              name: 'Yönetici' },
  { flag: PermissionFlagsBits.ViewChannel,                name: 'Kanalları Görüntüle' },
  { flag: PermissionFlagsBits.SendMessages,               name: 'Mesaj Gönder' },
  { flag: PermissionFlagsBits.EmbedLinks,                 name: 'Bağlantı Yerleştir' },
  { flag: PermissionFlagsBits.AttachFiles,                name: 'Dosya Ekle' },
  { flag: PermissionFlagsBits.AddReactions,               name: 'Tepki Ekle' },
  { flag: PermissionFlagsBits.UseExternalEmojis,          name: 'Harici Emoji Kullan' },
  { flag: PermissionFlagsBits.MentionEveryone,            name: 'Herkesten Bahset' },
  { flag: PermissionFlagsBits.ManageMessages,             name: 'Mesajları Yönet' },
  { flag: PermissionFlagsBits.ReadMessageHistory,         name: 'Mesaj Geçmişini Oku' },
  { flag: PermissionFlagsBits.Connect,                    name: 'Bağlan' },
  { flag: PermissionFlagsBits.Speak,                      name: 'Konuş' },
  { flag: PermissionFlagsBits.Stream,                     name: 'Video' },
  { flag: PermissionFlagsBits.MuteMembers,                name: 'Üyeleri Sustur' },
  { flag: PermissionFlagsBits.DeafenMembers,              name: 'Üyeleri Sağırlaştır' },
  { flag: PermissionFlagsBits.MoveMembers,                name: 'Üyeleri Taşı' },
  { flag: PermissionFlagsBits.BanMembers,                 name: 'Üyeleri Engelle' },
  { flag: PermissionFlagsBits.KickMembers,                name: 'Üyeleri At' },
  { flag: PermissionFlagsBits.ModerateMembers,            name: 'Üyeleri Yönet' },
  { flag: PermissionFlagsBits.ManageNicknames,            name: 'Takma Adları Yönet' },
  { flag: PermissionFlagsBits.ChangeNickname,             name: 'Takma Ad Değiştir' },
  { flag: PermissionFlagsBits.ManageGuild,                name: 'Sunucuyu Yönet' },
  { flag: PermissionFlagsBits.ManageRoles,                name: 'Rolleri Yönet' },
  { flag: PermissionFlagsBits.ManageChannels,             name: 'Kanalları Yönet' },
  { flag: PermissionFlagsBits.ManageWebhooks,             name: 'Webhook Yönet' },
  { flag: PermissionFlagsBits.ManageEmojisAndStickers,    name: 'Emoji Yönet' },
  { flag: PermissionFlagsBits.ViewAuditLog,               name: 'Denetim Kaydını Gör' },
  { flag: PermissionFlagsBits.CreateInstantInvite,        name: 'Davet Oluştur' },
  { flag: PermissionFlagsBits.ManageEvents,               name: 'Etkinlik Yönet' },
  { flag: PermissionFlagsBits.PrioritySpeaker,            name: 'Öncelikli Konuşmacı' },
  { flag: PermissionFlagsBits.RequestToSpeak,             name: 'Konuşmayı Talep Et' },
  { flag: PermissionFlagsBits.UseApplicationCommands,     name: 'Uygulama Komutları' },
  { flag: PermissionFlagsBits.CreatePublicThreads,        name: 'Genel Alt Başlık' },
  { flag: PermissionFlagsBits.CreatePrivateThreads,       name: 'Özel Alt Başlık' },
  { flag: PermissionFlagsBits.ManageThreads,              name: 'Alt Başlıkları Yönet' },
];

function getAllPermissions(permissions) {
  const has    = ALL_PERMISSIONS_MAP.filter((p) =>  permissions.has(p.flag)).map((p) => `${emojis.yes} ${p.name}`);
  const hasNot = ALL_PERMISSIONS_MAP.filter((p) => !permissions.has(p.flag)).map((p) => `${emojis.no} ${p.name}`);
  return { has, hasNot };
}

// ══════════════════════════════════════════════════
//  COOLDOWN
// ══════════════════════════════════════════════════

function checkCooldown(client, userId, commandName, duration) {
  if (!client.cooldowns.has(commandName)) client.cooldowns.set(commandName, new Map());
  const timestamps = client.cooldowns.get(commandName);
  const now = Date.now();
  if (timestamps.has(userId)) {
    const expiration = timestamps.get(userId) + duration;
    if (now < expiration) return Math.ceil((expiration - now) / 1000);
  }
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), duration);
  return 0;
}

// ══════════════════════════════════════════════════
//  SAYI FORMATLAMA
// ══════════════════════════════════════════════════

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return Number(num).toLocaleString('tr-TR');
}

// Progress bar oluştur (ör. üye/boost için)
function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  const empty  = length - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

module.exports = {
  createEmbed, successEmbed, errorEmbed, warningEmbed, infoEmbed, modLogEmbed,
  parseDuration, formatDuration, formatDate, timeAgo, discordTimestamp,
  findMember, findUser,
  hasPermission, isModerator, canModerate,
  sendLog,
  getDangerousPermissions, getAllPermissions, DANGEROUS_PERMISSIONS,
  checkCooldown,
  formatNumber, progressBar,
};
