// ╔═══════════════════════════════════════════════════════════════╗
// ║              MODBOT - VERİTABANI (JSON tabanlı)              ║
// ║   Native modül gerektirmez — saf Node.js ile çalışır        ║
// ╚═══════════════════════════════════════════════════════════════╝

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── JSON okuma/yazma yardımcıları ───────────────────────────────
function dbFile(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readDB(name) {
  const file = dbFile(name);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return {}; }
}

function writeDB(name, data) {
  fs.writeFileSync(dbFile(name), JSON.stringify(data, null, 2));
}

function get(db, key) {
  const data = readDB(db);
  return data[key] ?? null;
}

function set(db, key, value) {
  const data = readDB(db);
  data[key] = value;
  writeDB(db, data);
}

function del(db, key) {
  const data = readDB(db);
  delete data[key];
  writeDB(db, data);
}

// ════════════════════════════════════════
//  UYARI SİSTEMİ
// ════════════════════════════════════════

async function addWarning(guildId, userId, warning) {
  const key  = `${guildId}_${userId}`;
  const warns = get('warnings', key) || [];
  warns.push({
    id:           Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    reason:       warning.reason || 'Sebep belirtilmedi',
    moderatorId:  warning.moderatorId,
    moderatorTag: warning.moderatorTag,
    timestamp:    Date.now(),
  });
  set('warnings', key, warns);
  return warns;
}

async function getWarnings(guildId, userId) {
  return get('warnings', `${guildId}_${userId}`) || [];
}

async function removeWarning(guildId, userId, warnId) {
  const key  = `${guildId}_${userId}`;
  const warns = (get('warnings', key) || []).filter((w) => w.id !== warnId);
  set('warnings', key, warns);
  return warns;
}

async function clearWarnings(guildId, userId) {
  del('warnings', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  SPAM SAYACI
// ════════════════════════════════════════

async function getSpamCount(guildId, userId) {
  return get('spamcount', `${guildId}_${userId}`) || 0;
}

async function incrementSpamCount(guildId, userId) {
  const key   = `${guildId}_${userId}`;
  const count = (get('spamcount', key) || 0) + 1;
  set('spamcount', key, count);
  return count;
}

async function resetSpamCount(guildId, userId) {
  del('spamcount', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  KÜFÜR SAYACI
// ════════════════════════════════════════

async function getBadwordCount(guildId, userId) {
  return get('badword', `${guildId}_${userId}`) || 0;
}

async function incrementBadwordCount(guildId, userId) {
  const key   = `${guildId}_${userId}`;
  const count = (get('badword', key) || 0) + 1;
  set('badword', key, count);
  return count;
}

async function resetBadwordCount(guildId, userId) {
  del('badword', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  TİCKET SİSTEMİ
// ════════════════════════════════════════

async function createTicket(guildId, userId, channelId, ticketNumber) {
  const ticketData = {
    channelId, userId, ticketNumber,
    status:    'open',
    createdAt: Date.now(),
    claimedBy: null,
    closedAt:  null,
    closedBy:  null,
  };
  set('tickets', `${guildId}_${channelId}`, ticketData);

  const userKey     = `user_${guildId}_${userId}`;
  const userTickets = get('tickets', userKey) || [];
  userTickets.push(channelId);
  set('tickets', userKey, userTickets);

  return ticketData;
}

async function getTicket(guildId, channelId) {
  return get('tickets', `${guildId}_${channelId}`);
}

async function updateTicket(guildId, channelId, data) {
  const key    = `${guildId}_${channelId}`;
  const ticket = get('tickets', key);
  if (!ticket) return null;
  const updated = { ...ticket, ...data };
  set('tickets', key, updated);
  return updated;
}

async function closeTicket(guildId, channelId, closedBy) {
  const key    = `${guildId}_${channelId}`;
  const ticket = get('tickets', key);
  if (!ticket) return null;
  ticket.status   = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = closedBy;
  set('tickets', key, ticket);

  const userKey     = `user_${guildId}_${ticket.userId}`;
  const userTickets = (get('tickets', userKey) || []).filter((id) => id !== channelId);
  set('tickets', userKey, userTickets);

  return ticket;
}

async function getUserActiveTickets(guildId, userId) {
  return get('tickets', `user_${guildId}_${userId}`) || [];
}

async function getTicketNumber(guildId) {
  const key = `counter_${guildId}`;
  const num = (get('tickets', key) || 0) + 1;
  set('tickets', key, num);
  return num;
}

// ════════════════════════════════════════
//  MUTE KAYITLARI
// ════════════════════════════════════════

async function saveMute(guildId, userId, data) {
  set('mutes', `${guildId}_${userId}`, { ...data, timestamp: Date.now() });
}

async function getMute(guildId, userId) {
  return get('mutes', `${guildId}_${userId}`);
}

async function removeMute(guildId, userId) {
  del('mutes', `${guildId}_${userId}`);
}

// ════════════════════════════════════════
//  MOD GEÇMİŞİ
// ════════════════════════════════════════

async function addModAction(guildId, userId, action) {
  const key     = `${guildId}_${userId}`;
  const history = get('modhistory', key) || [];
  history.push({ ...action, timestamp: Date.now(), id: Date.now().toString(36) });
  if (history.length > 50) history.splice(0, history.length - 50);
  set('modhistory', key, history);
  return history;
}

async function getModHistory(guildId, userId) {
  return get('modhistory', `${guildId}_${userId}`) || [];
}

// ════════════════════════════════════════
//  SUNUCU AYARLARI
// ════════════════════════════════════════

async function getGuildSetting(guildId, key) {
  return get('guild_settings', `${guildId}_${key}`);
}

async function setGuildSetting(guildId, key, value) {
  set('guild_settings', `${guildId}_${key}`, value);
}

module.exports = {
  // Uyarılar
  addWarning, getWarnings, removeWarning, clearWarnings,
  // Spam
  getSpamCount, incrementSpamCount, resetSpamCount,
  // Küfür
  getBadwordCount, incrementBadwordCount, resetBadwordCount,
  // Ticket
  createTicket, getTicket, updateTicket, closeTicket,
  getUserActiveTickets, getTicketNumber,
  // Mute
  saveMute, getMute, removeMute,
  // Mod geçmişi
  addModAction, getModHistory,
  // Sunucu ayarları
  getGuildSetting, setGuildSetting,
};
