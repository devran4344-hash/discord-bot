const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');

module.exports = {
  name: 'guildBanRemove',
  once: false,
  async execute(ban, client) {
    if (!config.logging.memberUnban) return;
    await new Promise(r => setTimeout(r, 800));
    let executor = null, reason = 'Sebep belirtilmedi';
    try {
      const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 5 });
      const e = logs.entries.find(e => e.target?.id === ban.user.id && Date.now() - e.createdTimestamp < 5000);
      if (e) { executor = e.executor; reason = e.reason || reason; }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(config.colors.unban)
      .setAuthor({ name: `${ban.user.tag} — Yasak Kaldırıldı`, iconURL: ban.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${ban.user.id}>\n\`${ban.user.tag}\`\n\`${ban.user.id}\``, inline: true },
        { name: '👮 Yapan',     value: executor ? `<@${executor.id}>\n\`${executor.tag}\`` : '`Bilinmiyor`', inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'F'), inline: true },
        { name: '📋 Sebep',     value: reason, inline: false },
      )
      .setFooter({ text: `Kullanıcı ID: ${ban.user.id}` })
      .setTimestamp();

    await sendLog(ban.guild, 'modLog', embed);
  },
};
