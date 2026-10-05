const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');

const CH_TYPES = { 0:'Metin', 2:'Ses', 4:'Kategori', 5:'Duyuru', 13:'Sahne', 15:'Forum' };

async function getExec(guild, type) {
  try {
    await new Promise(r => setTimeout(r, 800));
    const logs = await guild.fetchAuditLogs({ type, limit: 3 });
    const e = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    return e?.executor || null;
  } catch { return null; }
}

module.exports = [
  {
    name: 'channelCreate', once: false,
    async execute(channel, client) {
      if (!channel.guild || !config.logging.channelCreate) return;
      const exec = await getExec(channel.guild, AuditLogEvent.ChannelCreate);
      await sendLog(channel.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.success)
        .setAuthor({ name: 'Kanal Oluşturuldu', iconURL: channel.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '📢 Kanal',  value: `${channel} \`(${channel.id})\``,                                   inline: true },
          { name: '📁 Tür',    value: CH_TYPES[channel.type] || 'Bilinmiyor',                              inline: true },
          { name: '👮 Yapan',  value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`',            inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),                                   inline: true },
        )
        .setFooter({ text: `Kanal ID: ${channel.id}` }).setTimestamp());
    },
  },
  {
    name: 'channelDelete', once: false,
    async execute(channel, client) {
      if (!channel.guild || !config.logging.channelDelete) return;
      const exec = await getExec(channel.guild, AuditLogEvent.ChannelDelete);
      await sendLog(channel.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.error)
        .setAuthor({ name: 'Kanal Silindi', iconURL: channel.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '📢 Kanal',  value: `\`#${channel.name}\` \`(${channel.id})\``,             inline: true },
          { name: '📁 Tür',    value: CH_TYPES[channel.type] || 'Bilinmiyor',                  inline: true },
          { name: '👮 Yapan',  value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`', inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),                        inline: true },
        )
        .setFooter({ text: `Kanal ID: ${channel.id}` }).setTimestamp());
    },
  },
  {
    name: 'channelUpdate', once: false,
    async execute(oldCh, newCh, client) {
      if (!newCh.guild || !config.logging.channelUpdate) return;
      const changes = [];
      if (oldCh.name !== newCh.name)   changes.push(`**İsim:** \`${oldCh.name}\` → \`${newCh.name}\``);
      if (oldCh.topic !== newCh.topic) changes.push(`**Konu:** ${oldCh.topic || 'Yok'} → ${newCh.topic || 'Yok'}`);
      if (oldCh.rateLimitPerUser !== newCh.rateLimitPerUser)
        changes.push(`**Yavaş Mod:** ${oldCh.rateLimitPerUser}s → ${newCh.rateLimitPerUser}s`);
      if (oldCh.nsfw !== newCh.nsfw)   changes.push(`**NSFW:** ${oldCh.nsfw} → ${newCh.nsfw}`);
      if (!changes.length) return;

      const exec = await getExec(newCh.guild, AuditLogEvent.ChannelUpdate);
      await sendLog(newCh.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setAuthor({ name: 'Kanal Güncellendi', iconURL: newCh.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '📢 Kanal',           value: `${newCh} \`(${newCh.id})\``,                                   inline: true },
          { name: '👮 Yapan',           value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`',        inline: true },
          { name: '📅 Tarih',           value: discordTimestamp(new Date(), 'R'),                               inline: true },
          { name: '📝 Değişiklikler',   value: changes.join('\n'),                                              inline: false },
        )
        .setFooter({ text: `Kanal ID: ${newCh.id}` }).setTimestamp());
    },
  },
];
