const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');

module.exports = [
  {
    name: 'messageReactionAdd', once: false,
    async execute(reaction, user, client) {
      if (!config.logging.reactionAdd || user.bot) return;
      if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
      if (!reaction.message.guild) return;
      await sendLog(reaction.message.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.info)
        .setAuthor({ name: `${user.tag} — Tepki Ekledi`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${user.id}>\n\`${user.id}\``, inline: true },
          { name: '😄 Emoji',     value: reaction.emoji.toString(),         inline: true },
          { name: '📍 Kanal',     value: `${reaction.message.channel}`,    inline: true },
          { name: '🔗 Mesaj',     value: `[Git](${reaction.message.url})`, inline: true },
          { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setFooter({ text: `Mesaj ID: ${reaction.message.id}` }).setTimestamp());
    },
  },
  {
    name: 'messageReactionRemove', once: false,
    async execute(reaction, user, client) {
      if (!config.logging.reactionRemove || user.bot) return;
      if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
      if (!reaction.message.guild) return;
      await sendLog(reaction.message.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setAuthor({ name: `${user.tag} — Tepki Kaldırdı`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${user.id}>\n\`${user.id}\``, inline: true },
          { name: '😑 Emoji',     value: reaction.emoji.toString(),         inline: true },
          { name: '📍 Kanal',     value: `${reaction.message.channel}`,    inline: true },
          { name: '🔗 Mesaj',     value: `[Git](${reaction.message.url})`, inline: true },
          { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setFooter({ text: `Mesaj ID: ${reaction.message.id}` }).setTimestamp());
    },
  },
];
