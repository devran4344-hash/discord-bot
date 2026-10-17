// ╔═══════════════════════════════════════════════════════════════╗
// ║              !DARBE — Full Optimize & Reorder                 ║
// ║    Banlar, Muteler, Eşzamanlı Kilit, Hızlı Restore            ║
// ╚═══════════════════════════════════════════════════════════════╝
const {
  PermissionFlagsBits: P,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const crypto = require('crypto');
const moment = require('moment');

// ─── Firebase Init (inline fallback) ─────────────────────────────
const admin = require('firebase-admin');
if (!admin.apps.length) {
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 yok');
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log('[darbe] Firebase (inline) başlatıldı');
  } catch (e) {
    console.warn('[darbe] Firebase init hatası:', e.message);
  }
}
const db = () => admin.firestore();

// ═══════════════════════════════════════════════════════════════
//  CONFIG (Optimize edildi: Gereksiz bekleme süreleri kaldırıldı)
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  QUARANTINE_NAME: 'darbe-chat',
  CODE_LENGTH: 6,
  SNAPSHOT_PASSES: 1, // Hız için tek geçiş
  ACTION_DELAY_MS: 50, // Yapay bekleme süresi çok düşürüldü
  LOCKED_FLAG: '__DARBE_LOCKED__',

  COLLECTION_BACKUPS: 'darbe_backups',
  COLLECTION_AUDIT: 'darbe_audit',
  COLLECTION_STATE: 'system_state',

  STALE_RUNNING_MS: 30 * 60 * 1000,
  STALE_RESTORING_MS: 60 * 60 * 1000,

  CONFIRM_TIMEOUT_MS: 30_000,
  RESTORE_TIMEOUT_MS: 60_000,
};

// ═══════════════════════════════════════════════════════════════
//  WHITELIST
// ═══════════════════════════════════════════════════════════════
const WHITELIST = new Set([
  ...(process.env.DARBE_WHITELIST || '').split(',').map((s) => s.trim()).filter(Boolean),
  ...(process.env.OWNER_ID ? [process.env.OWNER_ID.trim()] : []),
]);

// ═══════════════════════════════════════════════════════════════
//  KRİPTO
// ═══════════════════════════════════════════════════════════════
const ENC_KEY_HEX = process.env.DARBE_ENCRYPTION_KEY || '';
const ENC_KEY = ENC_KEY_HEX.length === 64 ? Buffer.from(ENC_KEY_HEX, 'hex') : null;

if (!ENC_KEY) {
  console.error('[darbe] ⚠️ DARBE_ENCRYPTION_KEY geçersiz veya yok! Yedekler ŞİFRESİZ kaydedilecek.');
}

function encrypt(plaintext) {
  if (!ENC_KEY) return { encrypted: false, payload: plaintext };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: true,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    payload: enc.toString('base64'),
  };
}

function decrypt(doc) {
  if (!doc.encrypted) return doc.payload;
  if (!ENC_KEY) throw new Error('DARBE_ENCRYPTION_KEY yok');
  const iv = Buffer.from(doc.iv, 'base64');
  const tag = Buffer.from(doc.tag, 'base64');
  const data = Buffer.from(doc.payload, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

// ═══════════════════════════════════════════════════════════════
//  YARDIMCILAR
// ═══════════════════════════════════════════════════════════════
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function genCode(len = CONFIG.CODE_LENGTH) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function sha256(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function isWhitelisted(message) {
  const uid = message.author.id;
  if (WHITELIST.has(uid)) return true;
  if (message.guild.ownerId === uid) return true;
  const app = message.client.application;
  if (app?.owner && app.owner.id === uid) return true;
  return false;
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk ${s % 60} sn`;
  const h = Math.floor(m / 60);
  return `${h} sa ${m % 60} dk`;
}

// ═══════════════════════════════════════════════════════════════
//  DURUM YÖNETİMİ
// ═══════════════════════════════════════════════════════════════
async function readState(guildId) {
  try {
    const snap = await db().collection(CONFIG.COLLECTION_STATE).doc(guildId).get();
    if (!snap.exists) return { darbe_state: 'idle' };
    return snap.data();
  } catch (e) {
    console.warn('[darbe] readState hatası:', e.message);
    return { darbe_state: 'idle' };
  }
}

async function writeState(guildId, patch) {
  try {
    await db().collection(CONFIG.COLLECTION_STATE).doc(guildId).set(
      { ...patch, darbe_updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn('[darbe] writeState hatası:', e.message);
  }
}

function isStale(state) {
  if (!state.darbe_startedAt) return false;
  const elapsed = Date.now() - new Date(state.darbe_startedAt).getTime();
  if (state.darbe_state === 'running') return elapsed > CONFIG.STALE_RUNNING_MS;
  if (state.darbe_state === 'restoring') return elapsed > CONFIG.STALE_RESTORING_MS;
  return false;
}

async function claimRunning(guildId, user) {
  const ref = db().collection(CONFIG.COLLECTION_STATE).doc(guildId);
  return db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    const data = snap.exists ? snap.data() : {};
    let state = data.darbe_state || 'idle';
    if (isStale(data)) state = 'idle';

    if (state !== 'idle') {
      const err = new Error('STATE_NOT_IDLE');
      err.stateData = data;
      throw err;
    }

    t.set(ref, {
      darbe_state: 'running',
      darbe_startedBy: user.id,
      darbe_startedByTag: user.tag,
      darbe_startedAt: new Date().toISOString(),
      darbe_code: null,
      darbe_quarantineChannelId: null,
      darbe_updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return true;
  });
}

async function claimRestoring(guildId, user) {
  const ref = db().collection(CONFIG.COLLECTION_STATE).doc(guildId);
  return db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    const data = snap.exists ? snap.data() : {};
    if (data.darbe_state === 'restoring') {
      const elapsed = Date.now() - new Date(data.darbe_startedAt || 0).getTime();
      if (elapsed < CONFIG.STALE_RESTORING_MS) {
        const err = new Error('RESTORE_IN_PROGRESS');
        err.stateData = data;
        throw err;
      }
    }
    t.set(ref, {
      darbe_state: 'restoring',
      darbe_restoreBy: user.id,
      darbe_restoreByTag: user.tag,
      darbe_startedAt: new Date().toISOString(),
      darbe_updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

async function releaseToIdle(guildId) {
  await writeState(guildId, {
    darbe_state: 'idle',
    darbe_code: null,
    darbe_startedBy: null,
    darbe_startedByTag: null,
    darbe_startedAt: null,
    darbe_quarantineChannelId: null,
  });
}

// ═══════════════════════════════════════════════════════════════
//  BACKUP
// ═══════════════════════════════════════════════════════════════
async function saveBackup(code, data) {
  const enc = encrypt(data);
  await db().collection(CONFIG.COLLECTION_BACKUPS).doc(code).set({
    ...enc,
    code,
    guildId: data.meta.guildId,
    guildName: data.meta.guildName,
    createdBy: data.meta.createdBy,
    createdById: data.meta.createdById,
    createdAt: data.meta.createdAt,
    checksum: data.meta.checksum,
    counts: {
      roles: data.roles.length,
      categories: data.categories.length,
      channels: data.channels.length,
      members: data.members.length,
      emojis: data.emojis.length,
      stickers: data.stickers.length,
      bans: data.bans.length,
    },
    _ts: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { firebase: true, encrypted: enc.encrypted };
}

async function loadBackup(code) {
  const snap = await db().collection(CONFIG.COLLECTION_BACKUPS).doc(code).get();
  if (!snap.exists) return null;
  const doc = snap.data();
  const data = decrypt(doc);

  const expected = sha256({
    roles: data.roles,
    channels: data.channels,
    categories: data.categories,
  });
  data.meta._checksumValid = expected === data.meta.checksum;
  if (!data.meta._checksumValid) console.warn(`[darbe] ⚠️ Checksum uyuşmuyor: ${code}`);
  return data;
}

async function writeAudit(entry) {
  try {
    await db().collection(CONFIG.COLLECTION_AUDIT).add({
      ...entry,
      _ts: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('[darbe] Audit yazılamadı:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SNAPSHOT (Ban ve Mute Dahil)
// ═══════════════════════════════════════════════════════════════
async function takeSnapshot(guild, progressCb) {
  const merged = { roles: new Map(), categories: new Map(), channels: new Map(), members: new Map() };

  if (progressCb) await progressCb(`📸 Sunucu taranıyor...`);
  await guild.roles.fetch().catch(() => {});
  await guild.channels.fetch().catch(() => {});
  await guild.members.fetch().catch(() => {});

  for (const [id, r] of guild.roles.cache) merged.roles.set(id, serializeRole(r));
  for (const [id, ch] of guild.channels.cache) {
    if (ch.type === ChannelType.GuildCategory) merged.categories.set(id, serializeChannel(ch));
    else merged.channels.set(id, serializeChannel(ch));
  }
  for (const [id, m] of guild.members.cache) {
    merged.members.set(id, {
      id,
      userTag: m.user.tag,
      roles: m.roles.cache.filter((r) => r.id !== guild.id).map((r) => r.id),
      joinedAt: m.joinedTimestamp,
      isBot: m.user.bot,
      communicationDisabledUntil: m.communicationDisabledUntilTimestamp // MUTE EKLENDİ
    });
  }

  // BANLARI ÇEK
  let bans = [];
  if (progressCb) await progressCb(`🔨 Banlar kopyalanıyor...`);
  try {
    const banList = await guild.bans.fetch();
    bans = banList.map(b => ({ userId: b.user.id, reason: b.reason }));
  } catch (e) {}

  const snapshot = {
    meta: {
      version: 5,
      guildId: guild.id,
      guildName: guild.name,
      ownerId: guild.ownerId,
      createdBy: null,
      createdById: null,
      createdAt: new Date().toISOString(),
      passes: CONFIG.SNAPSHOT_PASSES,
    },
    guild: {
      name: guild.name,
      icon: guild.iconURL({ size: 1024, extension: 'png' }),
      banner: guild.bannerURL({ size: 1024, extension: 'png' }),
      splash: guild.splashURL({ size: 1024, extension: 'png' }),
      description: guild.description,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      systemChannelId: guild.systemChannelId,
      afkChannelId: guild.afkChannelId,
      afkTimeout: guild.afkTimeout,
      rulesChannelId: guild.rulesChannelId,
      publicUpdatesChannelId: guild.publicUpdatesChannelId,
      preferredLocale: guild.preferredLocale,
      premiumTier: guild.premiumTier,
      ownerId: guild.ownerId,
    },
    roles: [...merged.roles.values()],
    categories: [...merged.categories.values()],
    channels: [...merged.channels.values()],
    members: [...merged.members.values()],
    bans: bans, // BANLAR EKLENDİ
    emojis: guild.emojis.cache.map((e) => ({ name: e.name, url: e.imageURL({ size: 128 }), animated: e.animated })),
    stickers: guild.stickers.cache.map((s) => ({ name: s.name, description: s.description, tags: s.tags, url: s.url })),
  };
  snapshot.meta.checksum = sha256({ roles: snapshot.roles, channels: snapshot.channels, categories: snapshot.categories });
  return snapshot;
}

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    position: role.position,
    permissions: role.permissions.bitfield.toString(),
    managed: role.managed,
    isEveryone: role.id === role.guild.id,
  };
}

function serializeChannel(ch) {
  return {
    id: ch.id,
    name: ch.name,
    type: ch.type,
    parentId: ch.parentId,
    position: ch.rawPosition ?? ch.position,
    topic: ch.topic ?? null,
    nsfw: ch.nsfw ?? null,
    rateLimitPerUser: ch.rateLimitPerUser ?? null,
    bitrate: ch.bitrate ?? null,
    userLimit: ch.userLimit ?? null,
    rtcRegion: ch.rtcRegion ?? null,
    permissionOverwrites: [...ch.permissionOverwrites.cache.values()].map((o) => ({
      id: o.id,
      type: o.type,
      allow: o.allow.bitfield.toString(),
      deny: o.deny.bitfield.toString(),
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
//  LOCKDOWN (TAM OPTİMİZE - KANAL VE ROL SÖKME AYNI ANDA)
// ═══════════════════════════════════════════════════════════════
const LOCK_DENY = [
  P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads,
  P.CreatePrivateThreads, P.AddReactions, P.UseExternalEmojis,
  P.UseExternalStickers, P.AttachFiles, P.EmbedLinks, P.MentionEveryone,
  P.UseApplicationCommands, P.Connect, P.Speak, P.Stream, P.UseVAD,
  P.UseSoundboard, P.RequestToSpeak, P.CreateInstantInvite,
];

async function lockdownGuild(guild, client, progressCb) {
  const botMember = guild.members.me;
  const botHighest = botMember.roles.highest;
  const everyoneId = guild.id;
  const results = { channelsLocked: 0, rolesStripped: 0, membersAffected: 0, errors: [] };

  // 1. GÖREV: Kanalları Kilitle
  const lockChannels = async () => {
    const allChannels = [...guild.channels.cache.values()];
    for (let i = 0; i < allChannels.length; i++) {
      const ch = allChannels[i];
      try {
        const perms = [{ id: everyoneId, deny: [P.ViewChannel, ...LOCK_DENY] }];
        if (botHighest?.id) {
          perms.push({
            id: botHighest.id,
            allow: [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ManageRoles],
          });
        }
        await ch.permissionOverwrites.set(perms, 'DARBE lockdown');
        results.channelsLocked++;
      } catch (e) {
        results.errors.push(`Kanal kilit: ${ch.name}`);
      }
      if (i % 5 === 0 && progressCb) await progressCb(`🔒 Kanallar kilitleniyor... \`${i + 1}/${allChannels.length}\``);
      await sleep(CONFIG.ACTION_DELAY_MS);
    }
  };

  // 2. GÖREV: Üye Rollerini Al
  const stripRoles = async () => {
    if (progressCb) await progressCb('🎭 Üye rolleri arka planda sökülüyor...');
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    for (const member of members.values()) {
      if (member.id === client.user.id || member.id === guild.ownerId) continue;

      const toRemove = member.roles.cache.filter((r) => {
        if (r.id === guild.id) return false;
        if (r.position >= botHighest.position) return false;
        return true;
      });
      if (!toRemove.size) continue;
      try {
        await member.roles.remove([...toRemove.values()], 'DARBE lockdown');
        results.rolesStripped += toRemove.size;
        results.membersAffected++;
      } catch (e) {
        results.errors.push(`Rol: ${member.user.tag}`);
      }
      await sleep(50); // Optimize edildi
    }
  };

  // AYNI ANDA ÇALIŞTIR (Eşzamanlı)
  await Promise.all([lockChannels(), stripRoles()]);

  try { const hooks = await guild.fetchWebhooks(); for (const w of hooks.values()) await w.delete('DARBE').catch(() => {}); } catch {}
  try { const invs = await guild.invites.fetch(); for (const i of invs.values()) await i.delete('DARBE').catch(() => {}); } catch {}

  if (progressCb) await progressCb('🏗️ Sığınak kanalı oluşturuluyor...');
  let quarantine;
  try {
    quarantine = await guild.channels.create({
      name: CONFIG.QUARANTINE_NAME,
      type: ChannelType.GuildText,
      topic: '🔴 Darbe aktif. Sadece buradan konuşabilirsiniz.',
      position: 0,
      permissionOverwrites: [
        {
          id: everyoneId,
          allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory],
          deny: [P.AttachFiles, P.EmbedLinks, P.AddReactions, P.UseExternalEmojis, P.CreateInstantInvite],
        },
        {
          id: botHighest.id,
          allow: [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ManageMessages, P.ManageRoles],
        },
      ],
      reason: 'DARBE quarantine',
    });
  } catch (e) {
    results.errors.push(`Quarantine hatası`);
  }

  try {
    if (!guild.name.startsWith('[DARBE]')) {
      await guild.setName(`[DARBE] ${guild.name}`.slice(0, 100), 'DARBE lockdown');
    }
  } catch {}

  return { results, quarantine };
}

// ═══════════════════════════════════════════════════════════════
//  RESTORE (ÖNEMLİLER İLK: ROLLER -> KANALLAR -> BANLAR -> ÜYELER)
// ═══════════════════════════════════════════════════════════════
async function restoreGuild(guild, client, backup, quarantineId, progressCb) {
  const result = {
    rolesMapped: 0,
    rolesCreated: 0,
    categoriesUpdated: 0,
    categoriesCreated: 0,
    channelsUpdated: 0,
    channelsCreated: 0,
    membersRestored: 0,
    bansRestored: 0,
    errors: [],
  };
  const idMap = { roles: {}, categories: {}, channels: {} };

  const mapOverwrites = (overwrites) => {
    const out = [];
    for (const o of (overwrites || [])) {
      const newId = idMap.roles[o.id] || idMap.categories[o.id] || idMap.channels[o.id] || o.id;
      const exists = guild.roles.cache.has(newId) || guild.channels.cache.has(newId) || newId === guild.id;
      if (!exists) continue;
      try {
        out.push({ id: newId, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) });
      } catch {}
    }
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  //  1) ROLLER (Öncelikli)
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb(`🎭 Roller oluşturuluyor/eşleştiriliyor...`);
  const sortedRoles = [...backup.roles].sort((a, b) => a.position - b.position);
  for (let i = 0; i < sortedRoles.length; i++) {
    const r = sortedRoles[i];
    if (r.isEveryone || r.managed) { idMap.roles[r.id] = r.id; continue; }

    let target = guild.roles.cache.get(r.id) || guild.roles.cache.find((x) => x.name === r.name);

    if (target) {
      idMap.roles[r.id] = target.id;
      result.rolesMapped++;
    } else {
      try {
        const created = await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: BigInt(r.permissions),
          reason: 'DARBE restore',
        });
        idMap.roles[r.id] = created.id;
        result.rolesCreated++;
      } catch (e) {
        result.errors.push(`Rol ${r.name}`);
      }
      await sleep(50); // Optimize edildi
    }
    if (i % 5 === 0 && progressCb) await progressCb(`🎭 Roller (${i + 1}/${sortedRoles.length})...`);
  }

  // ═══════════════════════════════════════════════════════════
  //  2) KATEGORİLER
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb(`📂 Kategoriler...`);
  const sortedCats = [...backup.categories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (let i = 0; i < sortedCats.length; i++) {
    const c = sortedCats[i];
    let target = guild.channels.cache.get(c.id) || guild.channels.cache.find((x) => x.type === ChannelType.GuildCategory && x.name === c.name);
    const overwrites = mapOverwrites(c.permissionOverwrites);

    if (target) {
      try {
        const opts = { permissionOverwrites: overwrites };
        if (c.name !== target.name) opts.name = c.name;
        if (c.position !== target.rawPosition) opts.position = c.position;
        await target.edit(opts, 'DARBE restore');
        idMap.categories[c.id] = target.id;
        result.categoriesUpdated++;
      } catch (e) {
        result.errors.push(`Kategori ${c.name}`);
        idMap.categories[c.id] = target.id;
      }
    } else {
      try {
        const created = await guild.channels.create({
          name: c.name,
          type: ChannelType.GuildCategory,
          position: c.position,
          permissionOverwrites: overwrites,
          reason: 'DARBE restore',
        });
        idMap.categories[c.id] = created.id;
        result.categoriesCreated++;
      } catch (e) {
        result.errors.push(`Kategori ${c.name}`);
      }
    }
    await sleep(50);
    if (i % 3 === 0 && progressCb) await progressCb(`📂 Kategoriler (${i + 1}/${sortedCats.length})...`);
  }

  // ═══════════════════════════════════════════════════════════
  //  3) KANALLAR
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb(`📺 Kanallar...`);
  const sortedCh = [...backup.channels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (let i = 0; i < sortedCh.length; i++) {
    const c = sortedCh[i];
    if (quarantineId && c.id === quarantineId) continue;

    let target = guild.channels.cache.get(c.id) || guild.channels.cache.find((x) => x.name === c.name && x.type === c.type);
    const overwrites = mapOverwrites(c.permissionOverwrites);

    if (target) {
      try {
        const opts = { permissionOverwrites: overwrites };
        if (c.name !== target.name) opts.name = c.name;
        if (c.position !== target.rawPosition) opts.position = c.position;
        if ((c.topic ?? null) !== (target.topic ?? null)) opts.topic = c.topic;
        if ((c.nsfw ?? null) !== (target.nsfw ?? null)) opts.nsfw = c.nsfw;
        if (c.rateLimitPerUser != null && c.rateLimitPerUser !== target.rateLimitPerUser) opts.rateLimitPerUser = c.rateLimitPerUser;
        if (c.bitrate != null && c.bitrate !== target.bitrate) opts.bitrate = c.bitrate;
        if (c.userLimit != null && c.userLimit !== target.userLimit) opts.userLimit = c.userLimit;

        if (c.parentId !== undefined) {
          const newParent = c.parentId ? (idMap.categories[c.parentId] || c.parentId) : null;
          if (newParent !== target.parentId) opts.parent = newParent;
        }

        await target.edit(opts, 'DARBE restore');
        idMap.channels[c.id] = target.id;
        result.channelsUpdated++;
      } catch (e) {
        result.errors.push(`Kanal update ${c.name}`);
        idMap.channels[c.id] = target.id;
      }
    } else {
      const opts = {
        name: c.name,
        type: c.type,
        position: c.position,
        parent: c.parentId ? (idMap.categories[c.parentId] || null) : null,
        permissionOverwrites: overwrites,
        reason: 'DARBE restore',
      };
      if (c.topic) opts.topic = c.topic;
      if (c.nsfw != null) opts.nsfw = c.nsfw;
      if (c.rateLimitPerUser != null) opts.rateLimitPerUser = c.rateLimitPerUser;
      if (c.bitrate != null) opts.bitrate = c.bitrate;
      if (c.userLimit != null) opts.userLimit = c.userLimit;
      try {
        const created = await guild.channels.create(opts);
        idMap.channels[c.id] = created.id;
        result.channelsCreated++;
      } catch (e) {
        result.errors.push(`Kanal ${c.name}`);
      }
    }
    await sleep(50);
    if (i % 5 === 0 && progressCb) await progressCb(`📺 Kanallar (${i + 1}/${sortedCh.length})...`);
  }

  // ═══════════════════════════════════════════════════════════
  //  4) BANLARI GERİ YÜKLE
  // ═══════════════════════════════════════════════════════════
  if (backup.bans && backup.bans.length > 0) {
    if (progressCb) await progressCb('🔨 Banlar geri yükleniyor...');
    for (const ban of backup.bans) {
      try {
        await guild.bans.create(ban.userId, { reason: ban.reason || 'DARBE restore' });
        result.bansRestored++;
      } catch (e) {}
      await sleep(50);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  5) SUNUCU AYARLARI
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb('⚙️ Sunucu ayarları geri yükleniyor...');
  try {
    const g = backup.guild;
    const editData = {};
    if (g.name) {
      const cleanName = g.name.replace(/^\[DARBE\]\s*/, '');
      if (cleanName !== guild.name) editData.name = cleanName;
    }
    if (g.verificationLevel != null && g.verificationLevel !== guild.verificationLevel) editData.verificationLevel = g.verificationLevel;
    if (g.explicitContentFilter != null && g.explicitContentFilter !== guild.explicitContentFilter) editData.explicitContentFilter = g.explicitContentFilter;
    if (g.defaultMessageNotifications != null && g.defaultMessageNotifications !== guild.defaultMessageNotifications) editData.defaultMessageNotifications = g.defaultMessageNotifications;
    if (g.afkTimeout && g.afkTimeout !== guild.afkTimeout) editData.afkTimeout = g.afkTimeout;
    if (g.preferredLocale && g.preferredLocale !== guild.preferredLocale) editData.preferredLocale = g.preferredLocale;
    if (Object.keys(editData).length) await guild.edit(editData, 'DARBE restore');
  } catch (e) {
    result.errors.push(`Sunucu ayar`);
  }

  // ═══════════════════════════════════════════════════════════
  //  6) ÜYE ROLLERİ VE MUTELERİ
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb('👥 Üye rolleri ve cezaları geri veriliyor...');
  const members = await guild.members.fetch().catch(() => guild.members.cache);
  for (const m of members.values()) {
    const snap = backup.members.find((x) => x.id === m.id);
    if (!snap) continue;
    
    // Rolleri ver
    const newRoleIds = snap.roles.map((oldId) => idMap.roles[oldId] || oldId).filter((id) => guild.roles.cache.has(id) && id !== guild.id);
    if (newRoleIds.length) {
      try {
        await m.roles.add(newRoleIds, 'DARBE restore');
        result.membersRestored++;
      } catch (e) {
        result.errors.push(`Üye ${m.user.tag}`);
      }
    }

    // Muteleri ver
    if (snap.communicationDisabledUntil && snap.communicationDisabledUntil > Date.now()) {
      try {
        await m.disableCommunicationUntil(snap.communicationDisabledUntil, 'DARBE restore (Mute)');
      } catch (e) {}
    }
    await sleep(50);
  }

  // ═══════════════════════════════════════════════════════════
  //  7) QUARANTINE KANALINI SİL
  // ═══════════════════════════════════════════════════════════
  if (progressCb) await progressCb('🧹 Sığınak kanalı temizleniyor...');
  if (quarantineId) {
    const q = guild.channels.cache.get(quarantineId);
    if (q) await q.delete('DARBE restore').catch(() => {});
  } else {
    const q = guild.channels.cache.find((x) => x.name === CONFIG.QUARANTINE_NAME);
    if (q) await q.delete('DARBE restore').catch(() => {});
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
//  DURUM MESAJI
// ═══════════════════════════════════════════════════════════════
function buildStateBlockEmbed(state, mode) {
  const startedAt = state.darbe_startedAt ? moment(state.darbe_startedAt).format('DD.MM.YYYY HH:mm:ss') : 'Bilinmiyor';
  const elapsed = state.darbe_startedAt ? fmtDuration(Date.now() - new Date(state.darbe_startedAt).getTime()) : '—';

  if (state.darbe_state === 'running') {
    return new EmbedBuilder()
      .setTitle('⏳ Darbe Zaten Çalışıyor')
      .setColor(0xfee75c)
      .setDescription(
        `**Başlatan:** <@${state.darbe_startedBy}> (\`${state.darbe_startedByTag || '—'}\`)\n` +
        `**Başlangıç:** ${startedAt}\n` +
        `**Geçen süre:** ${elapsed}\n\n` +
        `Şu anda **snapshot + kilit** işlemi devam ediyor. Bitmesini bekle.\n` +
        `İşlem **30 dakika** içinde bitmezse otomatik bayat sayılır ve tekrar deneyebilirsin.`
      );
  }

  if (state.darbe_state === 'locked') {
    return new EmbedBuilder()
      .setTitle('🔒 Sunucu Zaten Kilitli')
      .setColor(0xed4245)
      .setDescription(
        `**Kilitleyen:** <@${state.darbe_startedBy}> (\`${state.darbe_startedByTag || '—'}\`)\n` +
        `**Kilit zamanı:** ${startedAt}\n` +
        `**Geçen süre:** ${elapsed}\n` +
        (state.darbe_code ? `**Kod:** \`${state.darbe_code}\` *(sadece kilitleyen bilir)*\n` : '') +
        `\n**Geri açmak için:** \`${mode}darbe <KOD>\``
      );
  }

  if (state.darbe_state === 'restoring') {
    return new EmbedBuilder()
      .setTitle('🔄 Geri Yükleme Devam Ediyor')
      .setColor(0x5865f2)
      .setDescription(
        `**Başlatan:** <@${state.darbe_restoreBy}> (\`${state.darbe_restoreByTag || '—'}\`)\n` +
        `**Başlangıç:** ${startedAt}\n` +
        `**Geçen süre:** ${elapsed}\n\n` +
        `Restore işlemi sürüyor. Bitmesini bekle.`
      );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  ANA MODÜL
// ═══════════════════════════════════════════════════════════════
module.exports = {
  name: 'darbe',
  aliases: ['coup', 'lockdown', 'kilit', 'darbeyap'],
  description: 'Sunucuyu kilitler, Firebase\'e şifreli yedek alır ve 6 haneli kod üretir.',
  category: 'admin',
  cooldown: 10,

  async execute(message, args, client) {
    const guild = message.guild;
    const prefix = process.env.PREFIX || '!';
    const uid = message.author.id;

    // ─── 0) WHITELIST ─────────────────────────────────────────
    if (!isWhitelisted(message)) {
      return message
        .reply('❌ Bu komutu kullanma yetkin yok.')
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    // ─── 1) DURUM OKU ─────────────────────────────────────────
    const state = await readState(guild.id);
    const stateName = state.darbe_state || 'idle';

    // ══════════════════════════════════════════════════════════
    //  RESTORE MODU
    // ══════════════════════════════════════════════════════════
    if (args[0] && args[0].length === CONFIG.CODE_LENGTH) {
      const code = args[0].toUpperCase();

      if (stateName === 'running' && !isStale(state)) {
        return message.reply({ embeds: [buildStateBlockEmbed(state, prefix)] });
      }
      if (stateName === 'restoring' && !isStale(state)) {
        return message.reply({ embeds: [buildStateBlockEmbed(state, prefix)] });
      }

      let backup;
      try {
        backup = await loadBackup(code);
      } catch (e) {
        return message.reply(`❌ Yedek okunamadı: \`${e.message}\``);
      }

      if (!backup) return message.reply(`❌ \`${code}\` koduna ait yedek bulunamadı.`);
      if (backup.meta.guildId !== guild.id) return message.reply('❌ Bu yedek başka bir sunucuya ait!');

      const checksumText = backup.meta._checksumValid ? '✅ Doğrulandı' : '⚠️ Bozuk olabilir';

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Geri Yükleme Onayı')
        .setColor(0xfee75c)
        .setDescription(
          `**Kod:** \`${code}\`\n` +
          `**Oluşturma:** ${moment(backup.meta.createdAt).format('DD.MM.YYYY HH:mm:ss')}\n` +
          `**Oluşturan:** ${backup.meta.createdBy || '—'}\n` +
          `**Checksum:** ${checksumText}\n\n` +
          `> 🎭 Rol: **${backup.roles.length}**\n` +
          `> 📂 Kategori: **${backup.categories.length}**\n` +
          `> 📺 Kanal: **${backup.channels.length}**\n` +
          `> 👥 Üye: **${backup.members.length}**\n` +
          `> 🔨 Ban: **${backup.bans ? backup.bans.length : 0}**\n` +
          `> 😄 Emoji: **${backup.emojis.length}**\n\n` +
          `Onaylamak için aşağıdaki butona bas.`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`darbe_restore_${uid}_${code}`).setLabel('✅ Geri Yükle').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`darbe_cancel_${uid}`).setLabel('❌ İptal').setStyle(ButtonStyle.Danger)
      );

      const msg = await message.reply({ embeds: [embed], components: [row] });
      const collector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === uid && i.message.id === msg.id,
        time: CONFIG.RESTORE_TIMEOUT_MS,
        max: 1,
      });

      collector.on('collect', async (i) => {
        if (i.customId.startsWith('darbe_cancel')) {
          return i.update({ content: '❌ İptal edildi.', embeds: [], components: [] });
        }

        try {
          await claimRestoring(guild.id, message.author);
        } catch (err) {
          if (err.message === 'RESTORE_IN_PROGRESS') {
            const s = err.stateData || {};
            return i.update({
              content: `⏳ Restore zaten devam ediyor: <@${s.darbe_restoreBy}> (${moment(s.darbe_startedAt).format('HH:mm:ss')})`,
              embeds: [], components: [],
            });
          }
          return i.update({ content: `❌ Claim hatası: \`${err.message}\``, embeds: [], components: [] });
        }

        await i.update({ content: '⏳ Geri yükleme başlatıldı...', embeds: [], components: [] });
        const status = await message.channel.send('⏳ Başlıyor...');
        const editStatus = async (t) => { await status.edit(t).catch(() => {}); };

        try {
          const freshState = await readState(guild.id);
          const quarantineId = freshState.darbe_quarantineChannelId || state.darbe_quarantineChannelId || null;

          const result = await restoreGuild(guild, client, backup, quarantineId, editStatus);

          await writeAudit({
            action: 'restore',
            userId: uid,
            userTag: message.author.tag,
            guildId: guild.id,
            guildName: guild.name,
            code,
            result: {
              rolesMapped: result.rolesMapped,
              rolesCreated: result.rolesCreated,
              categoriesUpdated: result.categoriesUpdated,
              categoriesCreated: result.categoriesCreated,
              channelsUpdated: result.channelsUpdated,
              channelsCreated: result.channelsCreated,
              membersRestored: result.membersRestored,
              bansRestored: result.bansRestored,
              errors: result.errors.length,
            },
          });

          await releaseToIdle(guild.id);
          guild[CONFIG.LOCKED_FLAG] = false;

          const done = new EmbedBuilder()
            .setTitle('✅ Restore Tamamlandı')
            .setColor(0x57f287)
            .addFields(
              { name: '🎭 Rol (eşleşti)', value: `\`${result.rolesMapped}\``, inline: true },
              { name: '🎭 Rol (yeni)', value: `\`${result.rolesCreated}\``, inline: true },
              { name: '📂 Kategori (güncellendi)', value: `\`${result.categoriesUpdated}\``, inline: true },
              { name: '📂 Kategori (yeni)', value: `\`${result.categoriesCreated}\``, inline: true },
              { name: '📺 Kanal (güncellendi)', value: `\`${result.channelsUpdated}\``, inline: true },
              { name: '📺 Kanal (yeni)', value: `\`${result.channelsCreated}\``, inline: true },
              { name: '👥 Üye', value: `\`${result.membersRestored}\``, inline: true },
              { name: '🔨 Ban', value: `\`${result.bansRestored}\``, inline: true },
              { name: '❌ Hata', value: `\`${result.errors.length}\``, inline: true }
            )
            .setTimestamp();

          if (result.errors.length) {
            done.addFields({
              name: '⚠️ İlk Hatalar',
              value: '```' + result.errors.slice(0, 5).join('\n').slice(0, 900) + '```',
            });
          }

          await status.edit({ content: '', embeds: [done] }).catch(() => {});
        } catch (err) {
          console.error('[darbe] restore hatası:', err);
          await editStatus(`❌ Restore hatası: \`${err.message}\``);
          await releaseToIdle(guild.id);
        }
      });

      collector.on('end', (_, r) => {
        if (r === 'time') msg.edit({ components: [] }).catch(() => {});
      });
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  DARBE BAŞLAT
    // ══════════════════════════════════════════════════════════
    if (stateName !== 'idle' && !isStale(state)) {
      const embed = buildStateBlockEmbed(state, prefix);
      if (embed) return message.reply({ embeds: [embed] });
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('🚨 DARBE ONAYI')
      .setColor(0xed4245)
      .setDescription(
        '**Bu işlem:**\n' +
        '> 🔒 Tüm kanalları kilitleyecek\n' +
        '> 🎭 Herkesin rollerini alacak\n' +
        '> 🔨 Banları ve Muteleri kaydedecek\n' +
        '> 💾 Firebase\'e şifreli yedek atıp DM\'den kod gönderecek\n\n' +
        `**${CONFIG.CONFIRM_TIMEOUT_MS / 1000} saniye içinde onayla.**`
      )
      .setFooter({ text: 'Yanlışlıkla bastıysan İptal et.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`darbe_start_${uid}`).setLabel('🚨 DARBE BAŞLAT').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`darbe_abort_${uid}`).setLabel('İptal').setStyle(ButtonStyle.Secondary)
    );

    const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });
    const collector = confirmMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === uid && i.message.id === confirmMsg.id,
      time: CONFIG.CONFIRM_TIMEOUT_MS,
      max: 1,
    });

    collector.on('collect', async (i) => {
      if (i.customId.startsWith('darbe_abort')) {
        return i.update({ content: '❌ Darbe iptal edildi.', embeds: [], components: [] });
      }

      try {
        await claimRunning(guild.id, message.author);
      } catch (err) {
        if (err.message === 'STATE_NOT_IDLE') {
          const s = err.stateData || {};
          const msg = {
            running: `⏳ Darbe zaten **çalışıyor**: <@${s.darbe_startedBy}> (\`${s.darbe_startedByTag}\`)`,
            locked: `🔒 Sunucu zaten **kilitli**: <@${s.darbe_startedBy}> — geri açmak için \`${prefix}darbe <KOD>\``,
            restoring: `🔄 Şu anda **restore** işlemi var: <@${s.darbe_restoreBy}>`,
          }[s.darbe_state] || '⛔ Bilinmeyen durum.';
          return i.update({ content: msg, embeds: [], components: [] });
        }
        return i.update({ content: `❌ Claim hatası: \`${err.message}\``, embeds: [], components: [] });
      }

      await i.update({ content: '🚨 **DARBE BAŞLATILDI.** İşlem uzun sürebilir...', embeds: [], components: [] });

      const status = await message.channel.send('⏳ Snapshot alınıyor...');
      const editStatus = async (t) => { await status.edit(t).catch(() => {}); };

      try {
        // 1) Snapshot (Hemen o anki durumu kaydeder)
        const backup = await takeSnapshot(guild, editStatus);
        backup.meta.createdBy = message.author.tag;
        backup.meta.createdById = message.author.id;

        // 2) Kod üret
        const code = genCode();
        backup.meta.code = code;

        // 3) Kaydet
        const saveRes = await saveBackup(code, backup);
        await editStatus(
          `💾 Yedek kaydedildi: \`${code}\` ` +
          (saveRes.firebase ? '☁️ Firebase' : '❌') +
          (saveRes.encrypted ? ' 🔐' : ' ⚠️ ŞİFRESİZ')
        );

        // 4) DM
        let dmSent = false;
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔐 DARBE YEDEK KODUN')
            .setColor(0xed4245)
            .setDescription(
              `**Sunucu:** ${guild.name} (\`${guild.id}\`)\n` +
              `**Tarih:** ${moment().format('DD.MM.YYYY HH:mm:ss')}\n\n` +
              `**Geri açma kodu:**\n\`\`\`\n${code}\n\`\`\`\n` +
              `Sunucuda \`${prefix}darbe ${code}\` yaz.`
            )
            .addFields(
              { name: '🎭 Rol', value: `\`${backup.roles.length}\``, inline: true },
              { name: '📂 Kategori', value: `\`${backup.categories.length}\``, inline: true },
              { name: '📺 Kanal', value: `\`${backup.channels.length}\``, inline: true },
              { name: '👥 Üye', value: `\`${backup.members.length}\``, inline: true },
              { name: '🔨 Ban', value: `\`${backup.bans.length}\``, inline: true },
              { name: '🔑 Checksum', value: `\`${backup.meta.checksum.slice(0, 12)}…\``, inline: true }
            )
            .setFooter({ text: 'Bu kodu kimseyle paylaşma!' })
            .setTimestamp();
          await message.author.send({ embeds: [dmEmbed] });
          dmSent = true;
        } catch {
          await message.channel.send(`⚠️ DM gönderilemedi (DM kapalı): \`${code}\``);
        }

        // 5) LOCKDOWN (Kanallar ve Roller AYNI ANDA çalışır)
        const { results, quarantine } = await lockdownGuild(guild, client, editStatus);

        // 6) Kilit durumuna geç + quarantine ID kaydet
        await writeState(guild.id, {
          darbe_state: 'locked',
          darbe_code: code,
          darbe_quarantineChannelId: quarantine?.id || null,
        });
        guild[CONFIG.LOCKED_FLAG] = true;

        // 7) Audit
        await writeAudit({
          action: 'darbe',
          userId: uid,
          userTag: message.author.tag,
          guildId: guild.id,
          guildName: guild.name,
          code,
          dmSent,
          result: {
            channelsLocked: results.channelsLocked,
            rolesStripped: results.rolesStripped,
            membersAffected: results.membersAffected,
            errors: results.errors.length,
          },
        });

        // 8) Rapor
        const report = new EmbedBuilder()
          .setTitle('✅ DARBE TAMAMLANDI')
          .setColor(0x57f287)
          .setDescription(
            `🔐 **Kod:** \`${code}\` ${dmSent ? '*(DM\'ine gönderildi)*' : '*(DM gönderilemedi!)*'}\n` +
            `🏠 **Sığınak:** ${quarantine ? `<#${quarantine.id}>` : 'Oluşturulamadı'}\n\n` +
            `**Geri açmak için:** \`${prefix}darbe ${code}\``
          )
          .addFields(
            { name: '🔒 Kilitlenen Kanal', value: `\`${results.channelsLocked}\``, inline: true },
            { name: '🎭 Alınan Rol', value: `\`${results.rolesStripped}\``, inline: true },
            { name: '👥 Etkilenen Üye', value: `\`${results.membersAffected}\``, inline: true }
          )
          .setTimestamp();

        if (results.errors.length) {
          report.addFields({
            name: '⚠️ İlk Hatalar',
            value: '```' + results.errors.slice(0, 4).join('\n').slice(0, 900) + '```',
          });
        }

        await editStatus('✅ Darbe tamamlandı.');
        await status.edit({ content: '', embeds: [report] }).catch(() => {});
        await message.author.send({ embeds: [report] }).catch(() => {});
      } catch (err) {
        console.error('[darbe] hata:', err);
        await editStatus(`❌ Darbe hatası: \`${err.message}\``);
        await releaseToIdle(guild.id);
        await writeAudit({
          action: 'darbe_error',
          userId: uid,
          userTag: message.author.tag,
          guildId: guild.id,
          error: err.message,
        });
      }
    });

    collector.on('end', (_, r) => {
      if (r === 'time') confirmMsg.edit({ components: [] }).catch(() => {});
    });
  },
};