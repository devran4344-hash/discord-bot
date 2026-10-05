// ╔══════════════════════════════════════════════════════════════════════╗
// ║    EVENT: messageDelete — Mesaj Silme + GHOST PING Tespiti         ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

// Snipe cache — son 30 silinen mesaj (kanal başına)
const snipeCache = new Map(); // channelId → { content, author, attachments, timestamp }

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author?.bot) return;
    if (message.webhookId)   return; // Webhook mesajları ghost ping uyarısı vermesin
    if (!message.author) return;

    // ── Snipe Cache kaydet ─────────────────────────────────────────────
    snipeCache.set(message.channel.id, {
      content:     message.content || '',
      authorId:    message.author.id,
      authorTag:   message.author.tag,
      authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
      attachments: [...(message.attachments?.values() || [])].map(a => ({ name: a.name, url: a.url })),
      embeds:      message.embeds?.length || 0,
      timestamp:   message.createdTimestamp,
      deletedAt:   Date.now(),
    });

    // ── Ghost Ping Tespiti ──────────────────────────────────────────────
    if (config.logging.ghostPing && client._ghostMap?.has(message.id)) {
      const ghostData = client._ghostMap.get(message.id);
      client._ghostMap.delete(message.id);

      // Silinen mesajda mention vardı — ghost ping!
      const mentionList = ghostData.mentions.map(id => `<@${id}>`).join(', ');

      const ghostEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setAuthor({ name: `${message.author.tag} — Ghost Ping Tespit Edildi!`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `${e.ghost} **${message.author.tag}** birini mention edip mesajı **hemen sildi!** (Ghost Ping)\n` +
          `> Bu kişiler sessize mention edildi ve bildirim aldı.`,
        )
        .addFields(
          { name: '👤 Yapan',         value: `<@${message.author.id}>\n\`${message.author.tag}\`\n\`${message.author.id}\``, inline: true },
          { name: '📍 Kanal',          value: `${message.channel}`,                                                           inline: true },
          { name: '👥 Mention Edilen', value: mentionList || 'Bilinmiyor',                                                    inline: true },
          { name: '💬 Mesaj İçeriği',  value: ghostData.content ? `\`\`\`${ghostData.content.slice(0, 300)}\`\`\`` : '*[Boş]*', inline: false },
          { name: '📅 Tarih',          value: discordTimestamp(new Date(), 'R'),                                              inline: true },
        )
        .setFooter({ text: `Ghost Ping Sistemi • ID: ${message.author.id}` })
        .setTimestamp();

      await sendLog(message.guild, 'automodLog', ghostEmbed);

      // Kanala da kısa bilgi ver
      const notif = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.ghost} **Ghost Ping Tespit!** <@${message.author.id}> birini mention edip mesajı sildi → ${mentionList}`)
          .setTimestamp()],
      });
      setTimeout(() => notif.delete().catch(() => null), 8000);
    }

    // ── Mesaj Silme Log ─────────────────────────────────────────────────
    if (!config.logging.messageDelete) return;

    await new Promise(r => setTimeout(r, 800));
    let deletedBy = null;
    try {
      const logs  = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 });
      const entry = logs.entries.find(e => e.target?.id === message.author.id && Date.now() - e.createdTimestamp < 5000);
      if (entry) deletedBy = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: `${message.author.tag} — Mesaj Silindi`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : '*[İçerik alınamadı]*')
      .addFields(
        { name: '👤 Gönderen',  value: `<@${message.author.id}>\n\`${message.author.tag}\`\n\`${message.author.id}\``,               inline: true },
        { name: '📍 Kanal',     value: `${message.channel}\n\`${message.channel.id}\``,                                               inline: true },
        { name: deletedBy ? '🗑️ Silen' : '\u200b', value: deletedBy ? `<@${deletedBy.id}>\n\`${deletedBy.tag}\`` : '\u200b',         inline: true },
        { name: '📅 Gönderilme', value: discordTimestamp(message.createdAt, 'F'), inline: true },
        { name: '🆔 Mesaj ID',   value: `\`${message.id}\``,                      inline: true },
        ...(message.attachments?.size > 0 ? [{
          name:  '📎 Ekler',
          value: [...message.attachments.values()].map(a => `[${a.name}](${a.url})`).join('\n').slice(0, 500),
          inline: false,
        }] : []),
      )
      .setFooter({ text: `Kullanıcı ID: ${message.author.id}` })
      .setTimestamp();

    await sendLog(message.guild, 'messageLog', embed);
  },

  // snipeCache'i dışa ver (!snipe komutu kullanır)
  getSnipe: (channelId) => snipeCache.get(channelId) || null,
  snipeCache,
};
