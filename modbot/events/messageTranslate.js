// events/messageTranslate.js (v3.1 - config fallback)
// Ingiliz oyuncu yazar -> mesaj silinir, EN+TR embed atilir
// Turk oyuncu Ingilizi etiketleyerek yazar -> mesaj silinir, TR+EN embed + mention
const { Events, EmbedBuilder } = require('discord.js');
const { translateMessage } = require('../src/translate/translator');

let config = { englishSpeakers: [], allowedChannels: [], autoDeleteEmbedMs: 0 };
try {
  const loaded = require('../src/translate/config.json');
  config = {
    englishSpeakers: Array.isArray(loaded.englishSpeakers) ? loaded.englishSpeakers : [],
    allowedChannels: Array.isArray(loaded.allowedChannels) ? loaded.allowedChannels : [],
    autoDeleteEmbedMs: Number(loaded.autoDeleteEmbedMs) || 0
  };
  console.log('[translate] config yuklendi. Ingiliz oyuncu sayisi:', config.englishSpeakers.length);
} catch (e) {
  console.warn('[translate] config.json bulunamadi, bos listeyle devam ediliyor:', e.message);
}

const englishSpeakers = new Set(config.englishSpeakers.map(String));
const allowedChannels = new Set(config.allowedChannels.map(String));
const AUTO_DELETE_MS = Number(config.autoDeleteEmbedMs) || 0;
const MAX_FIELD = 1020;

function truncate(text, max = MAX_FIELD) {
  if (!text) return '—';
  const t = String(text).trim();
  return t.length > max ? t.slice(0, max - 3) + '...' : t;
}

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content || message.content.trim().length < 1) return;
    if (allowedChannels.size > 0 && !allowedChannels.has(message.channel.id)) return;

    const isEnglishAuthor = englishSpeakers.has(message.author.id);

    const englishTargets = [];
    if (message.mentions && message.mentions.users) {
      for (const [id] of message.mentions.users) {
        if (englishSpeakers.has(id) && !englishTargets.includes(id)) englishTargets.push(id);
      }
    }
    if (message.mentions && message.mentions.repliedUser) {
      const rid = message.mentions.repliedUser.id;
      if (englishSpeakers.has(rid) && !englishTargets.includes(rid)) englishTargets.push(rid);
    }

    let direction = null;
    if (isEnglishAuthor) direction = 'en-tr';
    else if (englishTargets.length > 0) direction = 'tr-en';
    else return;

    const translated = await translateMessage(message.content, direction);
    if (!translated) return;
    if (translated.trim() === message.content.trim()) return;

    if (!message.deletable) {
      console.warn('[translate] mesaji silemiyorum (izin yok):', message.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: message.member ? message.member.displayName : message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 128 })
      })
      .setColor(direction === 'en-tr' ? 0x2ecc71 : 0x3498db)
      .setTimestamp();

    if (direction === 'en-tr') {
      embed
        .addFields(
          { name: '🇬🇧 English', value: truncate(message.content) },
          { name: '🇹🇷 Türkçe', value: truncate(translated) }
        )
        .setFooter({ text: 'EN → TR' });
    } else {
      embed
        .addFields(
          { name: '🇹🇷 Türkçe', value: truncate(message.content) },
          { name: '🇬🇧 English', value: truncate(translated) }
        )
        .setFooter({ text: 'TR → EN' });
    }

    try { await message.delete(); }
    catch (e) { console.error('[translate] delete failed:', e.message); return; }

    const mentionLine = direction === 'tr-en'
      ? englishTargets.map((id) => '<@' + id + '>').join(' ')
      : undefined;

    let sent;
    try {
      sent = await message.channel.send({
        content: mentionLine,
        embeds: [embed],
        allowedMentions: {
          users: direction === 'tr-en' ? englishTargets : [],
          repliedUser: false
        }
      });
    } catch (e) {
      console.error('[translate] send failed:', e.message);
      return;
    }

    if (AUTO_DELETE_MS > 0 && sent) {
      setTimeout(() => { sent.delete().catch(() => {}); }, AUTO_DELETE_MS);
    }
  }
};