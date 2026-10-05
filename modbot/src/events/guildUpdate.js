const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');

module.exports = [
  {
    name: 'guildUpdate', once: false,
    async execute(oldGuild, newGuild, client) {
      if (!config.logging.guildUpdate) return;
      const changes = [];
      if (oldGuild.name !== newGuild.name) changes.push(`**İsim:** \`${oldGuild.name}\` → \`${newGuild.name}\``);
      if (oldGuild.icon !== newGuild.icon) changes.push('**İkon:** Değiştirildi');
      if (oldGuild.banner !== newGuild.banner) changes.push('**Banner:** Değiştirildi');
      if (oldGuild.verificationLevel !== newGuild.verificationLevel)
        changes.push(`**Doğrulama:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
      if (!changes.length) return;

      let exec = null;
      try {
        await new Promise(r => setTimeout(r, 800));
        const logs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 3 });
        exec = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000)?.executor || null;
      } catch {}

      await sendLog(newGuild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setAuthor({ name: 'Sunucu Güncellendi', iconURL: newGuild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '👮 Yapan',           value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`', inline: true },
          { name: '📅 Tarih',           value: discordTimestamp(new Date(), 'R'), inline: true },
          { name: '📝 Değişiklikler',   value: changes.join('\n'), inline: false },
        )
        .setTimestamp());
    },
  },
  {
    name: 'webhookUpdate', once: false,
    async execute(channel, client) {
      if (!config.logging.webhookUpdate) return;
      await sendLog(channel.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🔗 Webhook Değişikliği')
        .addFields(
          { name: '📍 Kanal', value: `${channel} \`(${channel.id})\``, inline: true },
          { name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setTimestamp());
    },
  },
  {
    name: 'guildIntegrationsUpdate', once: false,
    async execute(guild, client) {
      if (!config.logging.integrationCreate) return;
      await sendLog(guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('🔌 Entegrasyon Güncellendi')
        .addFields({ name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true })
        .setTimestamp());
    },
  },
];
