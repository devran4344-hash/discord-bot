const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    if (!newState.guild) return;
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    let embed = null;

    if (!oldState.channelId && newState.channelId && config.logging.voiceJoin) {
      embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setAuthor({ name: `${member.user.tag} — Ses Kanalına Katıldı`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Üye',    value: `<@${member.id}>\n\`${member.id}\``,      inline: true },
          { name: '🔊 Kanal',  value: `${newState.channel}\n\`${newState.channelId}\``, inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),          inline: true },
        )
        .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
    }
    else if (oldState.channelId && !newState.channelId && config.logging.voiceLeave) {
      embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setAuthor({ name: `${member.user.tag} — Ses Kanalından Ayrıldı`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Üye',    value: `<@${member.id}>\n\`${member.id}\``,        inline: true },
          { name: '🔇 Kanal',  value: `\`#${oldState.channel?.name}\`\n\`${oldState.channelId}\``, inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),            inline: true },
        )
        .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
    }
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId && config.logging.voiceMove) {
      embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setAuthor({ name: `${member.user.tag} — Ses Kanalı Değiştirdi`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Üye',     value: `<@${member.id}>\n\`${member.id}\``, inline: true },
          { name: '🔴 Eski',    value: `${oldState.channel}`,                inline: true },
          { name: '🟢 Yeni',    value: `${newState.channel}`,                inline: true },
          { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'R'),    inline: true },
        )
        .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
    }

    if (embed) await sendLog(newState.guild, 'voiceLog', embed);
  },
};
