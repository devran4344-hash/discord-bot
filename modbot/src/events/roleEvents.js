const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp, getDangerousPermissions } = require('../utils/helpers');
const config = require('../config');

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
    name: 'roleCreate', once: false,
    async execute(role, client) {
      if (!config.logging.roleCreate) return;
      const exec = await getExec(role.guild, AuditLogEvent.RoleCreate);
      await sendLog(role.guild, 'roleLog', new EmbedBuilder()
        .setColor(role.color || config.colors.success)
        .setAuthor({ name: 'Rol Oluşturuldu', iconURL: role.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '🎭 Rol',     value: `${role} \`(${role.id})\``,                                    inline: true },
          { name: '🎨 Renk',   value: `\`${role.hexColor}\``,                                         inline: true },
          { name: '👮 Yapan',  value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`',        inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),                               inline: true },
        )
        .setFooter({ text: `Rol ID: ${role.id}` }).setTimestamp());
    },
  },
  {
    name: 'roleDelete', once: false,
    async execute(role, client) {
      if (!config.logging.roleDelete) return;
      const exec = await getExec(role.guild, AuditLogEvent.RoleDelete);
      await sendLog(role.guild, 'roleLog', new EmbedBuilder()
        .setColor(config.colors.error)
        .setAuthor({ name: 'Rol Silindi', iconURL: role.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '🎭 Rol',       value: `\`${role.name}\` \`(${role.id})\``,                         inline: true },
          { name: '🎨 Renk',     value: `\`${role.hexColor}\``,                                       inline: true },
          { name: '👥 Sahip',    value: `${role.members?.size || 0} üye`,                             inline: true },
          { name: '👮 Yapan',    value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`',      inline: true },
          { name: '📅 Tarih',    value: discordTimestamp(new Date(), 'R'),                             inline: true },
        )
        .setFooter({ text: `Rol ID: ${role.id}` }).setTimestamp());
    },
  },
  {
    name: 'roleUpdate', once: false,
    async execute(oldRole, newRole, client) {
      if (!config.logging.roleUpdate) return;
      const changes = [];
      if (oldRole.name !== newRole.name)     changes.push(`**İsim:** \`${oldRole.name}\` → \`${newRole.name}\``);
      if (oldRole.color !== newRole.color)   changes.push(`**Renk:** \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
      if (oldRole.hoist !== newRole.hoist)   changes.push(`**Ayrı Göster:** ${oldRole.hoist} → ${newRole.hoist}`);
      if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Etiketlenebilir:** ${oldRole.mentionable} → ${newRole.mentionable}`);

      const addedPerms   = newRole.permissions.toArray().filter(p => !oldRole.permissions.toArray().includes(p));
      const removedPerms = oldRole.permissions.toArray().filter(p => !newRole.permissions.toArray().includes(p));
      if (!changes.length && !addedPerms.length && !removedPerms.length) return;

      const exec      = await getExec(newRole.guild, AuditLogEvent.RoleUpdate);
      const dangerous = addedPerms.length > 0 ? getDangerousPermissions(newRole.permissions) : [];

      const embed = new EmbedBuilder()
        .setColor(dangerous.length > 0 ? config.colors.error : config.colors.warning)
        .setAuthor({ name: 'Rol Güncellendi', iconURL: newRole.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '🎭 Rol',     value: `${newRole} \`(${newRole.id})\``,                               inline: true },
          { name: '👮 Yapan',  value: exec ? `<@${exec.id}>\n\`${exec.tag}\`` : '`Bilinmiyor`',         inline: true },
          { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'R'),                                 inline: true },
          ...(changes.length    ? [{ name: '📝 Değişiklikler',    value: changes.join('\n'),    inline: false }] : []),
          ...(addedPerms.length ? [{ name: '✅ Eklenen İzinler',  value: addedPerms.map(p=>`\`${p}\``).slice(0,10).join(', '), inline: false }] : []),
          ...(removedPerms.length ? [{ name: '❌ Kaldırılan',     value: removedPerms.map(p=>`\`${p}\``).slice(0,10).join(', '), inline: false }] : []),
          ...(dangerous.length  ? [{ name: '🚨 TEHLİKELİ İZİN',  value: dangerous.map(p=>`**${p}**`).join('\n'), inline: false }] : []),
        )
        .setFooter({ text: `Rol ID: ${newRole.id}` }).setTimestamp();

      await sendLog(newRole.guild, 'roleLog', embed);
    },
  },
];
