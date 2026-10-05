// ╔══════════════════════════════════════════════════════════════════════╗
// ║              SİSTEM: Davet Takip (Invite Tracker)                   ║
// ║  Kim hangi davet linki ile geldi, kim kaç kişi davet etti          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const { db } = require('../utils/database');
const config = require('../config');
const e = require('../emojiConfig');

// Bellek içi invite cache: guildId → Map<code, inviteData>
const inviteCache = new Map();

// ── DB Fonksiyonları ────────────────────────────────────────────────────
function readDB(name) {
  const fs   = require('fs');
  const path = require('path');
  const file = path.join(__dirname, '../../data', `${name}.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeDB(name, data) {
  const fs   = require('fs');
  const path = require('path');
  const file = path.join(__dirname, '../../data', `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getInviteData(guildId) {
  return readDB('invites')[guildId] || {};
}
function saveInviteData(guildId, data) {
  const all = readDB('invites');
  all[guildId] = data;
  writeDB('invites', all);
}

// ── Belirli bir inviter'ın verilerini al/güncelle ───────────────────────
function getInviterStats(guildId, inviterId) {
  const all  = getInviteData(guildId);
  return all[inviterId] || { total: 0, left: 0, fake: 0, members: [] };
}
function saveInviterStats(guildId, inviterId, stats) {
  const all = getInviteData(guildId);
  all[inviterId] = stats;
  saveInviteData(guildId, all);
}

// ── Kim tarafından davet edildi kaydı ──────────────────────────────────
function getMemberInviter(guildId, memberId) {
  const data = readDB('member_inviter');
  return data[`${guildId}_${memberId}`] || null;
}
function saveMemberInviter(guildId, memberId, inviterInfo) {
  const data = readDB('member_inviter');
  data[`${guildId}_${memberId}`] = inviterInfo;
  writeDB('member_inviter', data);
}

// ══════════════════════════════════════════════════════════════════════
//  CACHE YÜKLE (Bot başlangıcında çağrılır)
// ══════════════════════════════════════════════════════════════════════
async function loadInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const cache   = new Map();
    invites.forEach(inv => cache.set(inv.code, { uses: inv.uses, inviterId: inv.inviter?.id, inviterTag: inv.inviter?.tag, code: inv.code }));
    inviteCache.set(guild.id, cache);
  } catch {
    inviteCache.set(guild.id, new Map());
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ÜYE KATILINCA — hangi davet ile geldi bul
// ══════════════════════════════════════════════════════════════════════
async function handleMemberJoin(member) {
  const guild = member.guild;
  if (!inviteCache.has(guild.id)) await loadInvites(guild);

  const oldCache = inviteCache.get(guild.id) || new Map();
  let newInvites;
  try {
    newInvites = await guild.invites.fetch();
  } catch { return null; }

  // Kullanılan daveti bul (use sayısı artan)
  let usedInvite = null;
  newInvites.forEach(inv => {
    const cached = oldCache.get(inv.code);
    if (cached && inv.uses > cached.uses) usedInvite = inv;
  });

  // Cache güncelle
  const newCache = new Map();
  newInvites.forEach(inv => newCache.set(inv.code, { uses: inv.uses, inviterId: inv.inviter?.id, inviterTag: inv.inviter?.tag, code: inv.code }));
  inviteCache.set(guild.id, newCache);

  if (!usedInvite?.inviter) return null;

  const inviter = usedInvite.inviter;

  // İstatistikleri güncelle
  const stats = getInviterStats(guild.id, inviter.id);
  stats.total++;
  stats.members.push({ id: member.id, tag: member.user.tag, joinedAt: Date.now() });
  saveInviterStats(guild.id, inviter.id, stats);

  // Üyeyi kim davet etti kaydet
  saveMemberInviter(guild.id, member.id, {
    inviterId:   inviter.id,
    inviterTag:  inviter.tag,
    code:        usedInvite.code,
    joinedAt:    Date.now(),
  });

  return { inviter, code: usedInvite.code, uses: usedInvite.uses };
}

// ══════════════════════════════════════════════════════════════════════
//  ÜYE AYRILINCA — davetçinin "left" sayısını artır
// ══════════════════════════════════════════════════════════════════════
async function handleMemberLeave(member) {
  const inviterInfo = getMemberInviter(member.guild.id, member.id);
  if (!inviterInfo) return;

  const stats = getInviterStats(member.guild.id, inviterInfo.inviterId);
  stats.left++;
  stats.members = stats.members.filter(m => m.id !== member.id);
  saveInviterStats(member.guild.id, inviterInfo.inviterId, stats);
}

// ══════════════════════════════════════════════════════════════════════
//  DAVET LİNKİ OLUŞTURULUNCA CACHE GÜNCELLE
// ══════════════════════════════════════════════════════════════════════
async function handleInviteCreate(invite) {
  if (!inviteCache.has(invite.guild.id)) await loadInvites(invite.guild);
  const cache = inviteCache.get(invite.guild.id);
  cache.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id, inviterTag: invite.inviter?.tag, code: invite.code });

  // Log
  if (config.logging.inviteCreate) {
    await sendLog(invite.guild, 'serverLog', new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${e.inviteCreate || '📨'} Davet Oluşturuldu`)
      .addFields(
        { name: '🔗 Kod',        value: `\`${invite.code}\``,                               inline: true },
        { name: '👤 Oluşturan',  value: invite.inviter ? `<@${invite.inviter.id}>\n\`${invite.inviter.tag}\`` : 'Bilinmiyor', inline: true },
        { name: '📍 Kanal',      value: invite.channel ? `${invite.channel}` : 'Bilinmiyor', inline: true },
        { name: '⏰ Süre',       value: invite.maxAge   ? `${invite.maxAge}s` : 'Süresiz',  inline: true },
        { name: '🔢 Maks Kullanım', value: invite.maxUses ? `${invite.maxUses}` : 'Sınırsız', inline: true },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'R'),                   inline: true },
      )
      .setTimestamp());
  }
}

async function handleInviteDelete(invite) {
  if (inviteCache.has(invite.guild?.id)) {
    inviteCache.get(invite.guild.id).delete(invite.code);
  }

  if (config.logging.inviteDelete) {
    await sendLog(invite.guild, 'serverLog', new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle(`${e.inviteDelete || '🚫'} Davet Silindi`)
      .addFields(
        { name: '🔗 Kod',    value: `\`${invite.code}\``,                 inline: true },
        { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),    inline: true },
      )
      .setTimestamp());
  }
}

module.exports = {
  loadInvites,
  handleMemberJoin,
  handleMemberLeave,
  handleInviteCreate,
  handleInviteDelete,
  getInviterStats,
  getMemberInviter,
  inviteCache,
};
