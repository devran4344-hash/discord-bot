// ╔══════════════════════════════════════════════════════════════════════╗
// ║     EVENT: messageCreate — Komut Handler + Tüm Otomod Sistemleri   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { isModerator, checkCooldown, errorEmbed, sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

const spamMap = new Map();

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    if (!message.guild || message.author.bot || !message.member) return;
    if (message.webhookId) return; // Webhook mesajlarını tamamen atla (ghost ping tetiklenmesin)

    // Ghost ping tracker
    if (message.mentions.users.size > 0) {
      if (!client._ghostMap) client._ghostMap = new Map();
      client._ghostMap.set(message.id, {
        authorId: message.author.id, mentions: [...message.mentions.users.keys()],
        channelId: message.channel.id, content: message.content, createdAt: Date.now(),
      });
      setTimeout(() => client._ghostMap?.delete(message.id), 30000);
    }

    // Otomod (moderatörler muaf)
    if (!isModerator(message.member)) {
      const blocked = await runAutomod(message, client);
      if (blocked) return;
    }

    // Komut handler
    const prefix = config.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args        = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command     = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    const remaining = checkCooldown(client, message.author.id, command.name, command.cooldown || config.cooldowns.default);
    if (remaining > 0) {
      const cd = await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.loading} **${remaining}** saniye bekle! (\`${command.name}\`)`)],
      });
      return setTimeout(() => cd.delete().catch(() => null), 3000);
    }

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[HATA] ${command.name}:`, err);
      message.reply({ embeds: [errorEmbed(`Komut çalıştırılırken hata oluştu:\n\`\`\`${err.message}\`\`\``)] }).catch(() => null);
    }
  },
};

async function runAutomod(message, client) {
  const { incrementBadwordCount, incrementSpamCount, addWarning } = require('../utils/database');
  if (config.wordFilter.enabled) {
    const r = await checkBadWords(message, client, incrementBadwordCount, addWarning);
    if (r?.blocked) return true;
  }
  if (config.antiLink.enabled) {
    const r = await checkLinks(message, client, addWarning);
    if (r?.blocked) return true;
  }
  if (config.antiSpam.enabled) {
    const r = await checkSpam(message, client, incrementSpamCount, addWarning);
    if (r?.blocked) return true;
  }
  return false;
}

async function checkBadWords(message, client, incrementBadwordCount, addWarning) {
  const cfg    = config.wordFilter;
  const filter = require('../utils/profanityFilter');

  if (cfg.exemptChannels.includes(message.channel.id)) return null;
  if (cfg.exemptRoles.some(r => message.member.roles.cache.has(r))) return null;
  if (message.content.trim().length < 2) return null;

  // Ekstra kelimeler varsa runtime'da ekle
  if (cfg.extraBannedWords?.length) {
    cfg.extraBannedWords.forEach(w => filter.addCustomWord(w));
  }

  // 3 katmanlı kontrol: Offline Liste + AI (isteğe bağlı)
  const result = await filter.checkMessage(message.content, {
    useAI:       cfg.ai?.enabled && !!cfg.ai?.apiKey,
    apiKey:      cfg.ai?.apiKey,
    aiThreshold: cfg.ai?.threshold || 0.75,
  });

  if (!result.blocked) return null;

  // ── Mesajı sil & sayacı artır ────────────────────────────────────────
  await message.delete().catch(() => null);
  const count = await incrementBadwordCount(message.guild.id, message.author.id);
  const source = result.source === 'ai' ? '🤖 Yapay Zeka' : result.source === 'both' ? '🤖 AI + Kelime Listesi' : '📋 Kelime Listesi';

  // ── Kademeli ceza sistemi ─────────────────────────────────────────────
  const punishments = cfg.mutePunishments || {
    3: 2*60*1000, 4: 5*60*1000, 5: 15*60*1000,
    6: 60*60*1000, 7: 6*60*60*1000, 8: 24*60*60*1000,
  };
  const banAfter     = cfg.banAfter || 9;
  const warnLevel    = cfg.warnBeforeMute || 3;

  // Mevcut sayıya karşılık gelen ceza seviyesini bul
  const muteLevels   = Object.keys(punishments).map(Number).sort((a, b) => a - b);
  const muteLevel    = muteLevels.filter(l => l <= count).pop();
  const muteDuration = muteLevel ? punishments[muteLevel] : null;
  const isMute       = count >= warnLevel && muteDuration;
  const isBan        = count >= banAfter;

  // Ceza açıklaması (kullanıcıya gösterilecek)
  function describePunishment() {
    if (isBan)         return '🔨 Kalıcı Ban';
    if (muteDuration) {
      const mins  = Math.floor(muteDuration / 60000);
      const hours = Math.floor(mins / 60);
      const days  = Math.floor(hours / 24);
      if (days >= 1)  return `${e.mute} ${days} gün timeout`;
      if (hours >= 1) return `${e.mute} ${hours} saat timeout`;
      return `${e.mute} ${mins} dakika timeout`;
    }
    return `${e.warn} Uyarı`;
  }
  const punishDesc = describePunishment();

  // ── Kanal uyarı mesajı ───────────────────────────────────────────────
  const warnEmbed = new EmbedBuilder()
    .setColor(isBan ? config.colors.ban : isMute ? config.colors.mute : config.colors.error)
    .setAuthor({ name: 'Otomod — İçerik İhlali', iconURL: message.guild.iconURL({ dynamic: true }) })
    .setDescription(`${e.badword} <@${message.author.id}>, mesajın **içerik kurallarını** ihlal ediyor! Mesajın silindi.`)
    .addFields(
      { name: `${e.warning} Tespit`,      value: source,           inline: true },
      { name: `${e.strike} Toplam`,       value: `\`${count}. kez\``, inline: true },
      { name: '⚖️ Uygulanan',             value: punishDesc,       inline: true },
    )
    .setFooter({ text: `İhlal arttıkça ceza ağırlaşır: 3→2dk, 4→5dk, 5→15dk, 6→1sa, 7→6sa, 8→1g, 9+→Ban` })
    .setTimestamp();
  const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
  setTimeout(() => warnMsg.delete().catch(() => null), 8000);

  // ── DB uyarı kaydı ───────────────────────────────────────────────────
  if (count <= warnLevel || count % 2 === 0) {
    await addWarning(message.guild.id, message.author.id, {
      reason: `Otomod: ${result.reason} (${count}. ihlal)`,
      moderatorId: client.user.id, moderatorTag: client.user.tag,
    });
  }

  // ── Ceza uygula ───────────────────────────────────────────────────────
  if (isBan) {
    await message.guild.bans.create(message.author.id, { reason: `Otomod: Küfür/hakaret limiti aşıldı (${count}. ihlal)` }).catch(() => null);
  } else if (isMute && muteDuration) {
    await message.member.timeout(muteDuration, `Otomod: İçerik ihlali (${count}. ihlal, ${Math.floor(muteDuration/60000)}dk)`).catch(() => null);
  }

  // ── DM bildirimi ──────────────────────────────────────────────────────
  if (cfg.dmUser) {
    const dmEmbed = new EmbedBuilder()
      .setColor(isBan ? config.colors.ban : isMute ? config.colors.mute : config.colors.error)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.badword} Mesajın İçerik Kurallarını İhlal Etti`)
      .setDescription(`Mesajın **${message.guild.name}** sunucusunun kurallarına aykırı olduğu için silindi.`)
      .addFields(
        { name: '📋 Sebep',         value: result.reason,    inline: false },
        { name: '🔍 Tespit',         value: source,           inline: true  },
        { name: `${e.strike} İhlal`, value: `\`${count}. kez\``, inline: true },
        { name: '⚖️ Uygulanan',      value: punishDesc,       inline: true  },
        { name: '📈 Ceza Sistemi',   value: '`3→2dk` `4→5dk` `5→15dk` `6→1sa` `7→6sa` `8→1g` `9+→Ban`', inline: false },
      )
      .setTimestamp();
    await message.author.send({ embeds: [dmEmbed] }).catch(() => null);
  }

  // ── Log ───────────────────────────────────────────────────────────────
  if (cfg.logDetections) {
    const aiScores = result.aiResult && !result.aiResult.error
      ? Object.entries(result.aiResult.scores || {})
          .filter(([, v]) => v > 0.05).sort(([,a],[,b]) => b-a).slice(0,5)
          .map(([k, v]) => `> \`${filter.getCategoryTR(k)}\`: **%${Math.round(v*100)}**`).join('\n')
      : null;

    await sendLog(message.guild, 'automodLog', new EmbedBuilder()
      .setColor(isBan ? config.colors.ban : config.colors.automod)
      .setAuthor({ name: 'Otomod — İçerik İhlali', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı',      value: `<@${message.author.id}>\n\`${message.author.tag}\`\n\`${message.author.id}\``, inline: true  },
        { name: '📍 Kanal',          value: `${message.channel}`,                                                            inline: true  },
        { name: '🔍 Tespit',         value: source,                                                                          inline: true  },
        { name: '📋 Sebep',          value: result.reason,                                                                   inline: false },
        { name: '💬 Silinen Mesaj',  value: `\`\`\`${message.content.slice(0, 400)}\`\`\``,                                inline: false },
        { name: `${e.strike} İhlal`, value: `\`${count}. kez\``,                                                            inline: true  },
        { name: '⚖️ Uygulanan',      value: punishDesc,                                                                     inline: true  },
        { name: '📅 Tarih',          value: discordTimestamp(new Date(), 'R'),                                              inline: true  },
        ...(aiScores ? [{ name: '🤖 AI Skorları', value: aiScores, inline: false }] : []),
      )
      .setTimestamp());
  }

  return { blocked: true };
}

async function checkLinks(message, client, addWarning) {
  const cfg = config.antiLink;
  if (cfg.exemptChannels.includes(message.channel.id)) return null;
  if (cfg.exemptRoles.some(r => message.member.roles.cache.has(r))) return null;

  const inviteRegex = /(discord\.(gg|com\/invite)\/[^\s]+)/gi;
  const urlRegex    = /(https?:\/\/[^\s]+)/gi;
  const invites = message.content.match(inviteRegex) || [];
  const urls    = message.content.match(urlRegex) || [];

  if (cfg.blockInvites && invites.length > 0) {
    const isWhitelisted = invites.every(inv => cfg.whitelist.some(w => inv.includes(w)));
    if (!isWhitelisted) {
      await message.delete().catch(() => null);
      const warn = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${e.link} <@${message.author.id}>, bu sunucuda **Discord davet linki** paylaşmak yasak!`)
          .setTimestamp()],
      });
      setTimeout(() => warn.delete().catch(() => null), 6000);
      await addWarning(message.guild.id, message.author.id, {
        reason: 'Otomod: İzinsiz Discord davet linki',
        moderatorId: client.user.id, moderatorTag: client.user.tag,
      });
      await sendLog(message.guild, 'automodLog', new EmbedBuilder()
        .setColor(config.colors.automod)
        .setAuthor({ name: 'Otomod — Davet Linki', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${message.author.id}>\n\`${message.author.tag}\``, inline: true },
          { name: '📍 Kanal', value: `${message.channel}`, inline: true },
          { name: `${e.link} Link`, value: `\`${invites[0].slice(0, 200)}\``, inline: false },
        )
        .setTimestamp());
      return { blocked: true };
    }
  }

  if (urls.length > 0) {
    const hasIllegal = urls.some(url => !cfg.whitelist.some(w => url.toLowerCase().includes(w)));
    if (hasIllegal) {
      await message.delete().catch(() => null);
      const warn = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.link} <@${message.author.id}>, bu kanalda **izinsiz link** paylaşmak yasak!`)
          .setTimestamp()],
      });
      setTimeout(() => warn.delete().catch(() => null), 5000);
      return { blocked: true };
    }
  }
  return null;
}

async function checkSpam(message, client, incrementSpamCount, addWarning) {
  const cfg = config.antiSpam;
  if (cfg.exemptChannels.includes(message.channel.id)) return null;
  if (cfg.exemptRoles.some(r => message.member.roles.cache.has(r))) return null;

  const userId = message.author.id;
  const now    = Date.now();
  if (!spamMap.has(userId)) spamMap.set(userId, { msgs: [], dupeContent: null, dupeCount: 0, dupeTime: 0 });
  const data = spamMap.get(userId);

  data.msgs = data.msgs.filter(t => now - t < cfg.timeWindow);
  data.msgs.push(now);

  if (data.msgs.length >= cfg.messageLimit) {
    data.msgs = [];
    await applySpamPunishment(message, client, incrementSpamCount, addWarning, 'Hız Spam');
    return { blocked: true };
  }

  const trimmed = message.content.toLowerCase().trim();
  if (data.dupeContent === trimmed) {
    if (now - data.dupeTime < cfg.duplicateWindow) {
      data.dupeCount++;
      if (data.dupeCount >= cfg.duplicateLimit) {
        data.dupeCount = 0;
        await applySpamPunishment(message, client, incrementSpamCount, addWarning, 'Tekrarlayan Mesaj');
        return { blocked: true };
      }
    } else { data.dupeCount = 1; }
  } else { data.dupeContent = trimmed; data.dupeCount = 1; data.dupeTime = now; }

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= cfg.mentionLimit) {
    await message.delete().catch(() => null);
    await applySpamPunishment(message, client, incrementSpamCount, addWarning, `Toplu Mention (${mentionCount})`);
    return { blocked: true };
  }

  if (message.content.length >= cfg.capsMinLength) {
    const upper = (message.content.match(/[A-ZÇĞİÖŞÜ]/g) || []).length;
    const ratio = (upper / message.content.replace(/\s/g, '').length) * 100;
    if (ratio >= cfg.capsLimit) {
      await message.delete().catch(() => null);
      const warn = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.caps} <@${message.author.id}>, aşırı **büyük harf** kullanma! (\`%${Math.round(ratio)}\`)`)
          .setTimestamp()],
      });
      setTimeout(() => warn.delete().catch(() => null), 4000);
      return { blocked: true };
    }
  }
  return null;
}

async function applySpamPunishment(message, client, incrementSpamCount, addWarning, type) {
  const { formatDuration } = require('../utils/helpers');
  const cfg   = config.antiSpam;
  const count = await incrementSpamCount(message.guild.id, message.author.id);
  const keys  = Object.keys(cfg.punishments).map(Number).sort((a, b) => a - b);
  const level = keys.filter(k => k <= count).pop() || keys[0];
  const punishment = cfg.punishments[level];

  const fetched = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
  if (fetched) message.channel.bulkDelete(fetched.filter(m => m.author.id === message.author.id), true).catch(() => null);

  const warn = await message.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: 'Otomod — Spam Tespit', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription(`${e.spam} <@${message.author.id}>, **spam** yaptığın tespit edildi!`)
      .addFields(
        { name: `${e.warning} Tür`,     value: type,                                          inline: true },
        { name: `${e.strike} İhlal`,    value: `\`${count}. kez\``,                          inline: true },
        { name: '⚖️ Uygulanan',         value: punishment?.action?.toUpperCase() || 'Silme', inline: true },
      )
      .setTimestamp()],
  });
  setTimeout(() => warn.delete().catch(() => null), 7000);

  if (punishment?.action === 'warn') {
    await addWarning(message.guild.id, message.author.id, { reason: `Otomod: ${type}`, moderatorId: client.user.id, moderatorTag: client.user.tag });
  } else if (punishment?.action === 'mute' && punishment.duration) {
    await message.member.timeout(punishment.duration, `Otomod: ${type}`).catch(() => null);
  } else if (punishment?.action === 'kick') {
    await message.member.kick(`Otomod: ${type}`).catch(() => null);
  } else if (punishment?.action === 'ban') {
    await message.guild.bans.create(message.author.id, { reason: `Otomod: ${type}` }).catch(() => null);
  }

  await sendLog(message.guild, 'spamLog', new EmbedBuilder()
    .setColor(config.colors.automod)
    .setAuthor({ name: 'Otomod — Spam', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${message.author.id}>\n\`${message.author.tag}\`\n\`${message.author.id}\``, inline: true },
      { name: '📍 Kanal',     value: `${message.channel}`, inline: true },
      { name: `${e.spam} Tür`, value: type, inline: true },
      { name: `${e.strike} İhlal`, value: `\`${count}. kez\``, inline: true },
      { name: '⚖️ Ceza', value: punishment?.action?.toUpperCase() || 'Silme', inline: true },
      { name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true },
    )
    .setTimestamp());
}
