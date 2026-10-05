const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp, getDangerousPermissions, formatDuration } = require('../utils/helpers');
const config = require('../config');

async function getAuditEntry(guild, type, targetId) {
  try {
    await new Promise(r => setTimeout(r, 800));
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    return logs.entries.find(e => e.target?.id === targetId && Date.now() - e.createdTimestamp < 5000) || null;
  } catch { return null; }
}

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(oldMember, newMember, client) {
    if (!newMember.guild) return;
    const guild = newMember.guild;

    // ── Rol değişikliği ──────────────────────────────────────
    const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if ((addedRoles.size > 0 || removedRoles.size > 0) && config.logging.roleGiven) {
      const entry = await getAuditEntry(guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

      const embed = new EmbedBuilder()
        .setColor(addedRoles.size > 0 ? config.colors.success : config.colors.error)
        .setAuthor({
          name: `${newMember.user.tag} — Rol Güncellendi`,
          iconURL: newMember.user.displayAvatarURL({ dynamic: true }),
        })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${newMember.id}>\n\`${newMember.id}\``, inline: true },
          { name: '👮 Yapan',     value: entry ? `<@${entry.executor.id}>\n\`${entry.executor.tag}\`` : '`Sistem`', inline: true },
          { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setFooter({ text: `Kullanıcı ID: ${newMember.id}` })
        .setTimestamp();

      if (addedRoles.size > 0) {
        embed.addFields({ name: '✅ Eklenen Roller', value: addedRoles.map(r => `${r}`).join(', '), inline: false });
        // Tehlikeli izin kontrolü
        const dangerousRoles = [];
        addedRoles.forEach(role => {
          const d = getDangerousPermissions(role.permissions);
          if (d.length > 0) dangerousRoles.push(`**${role.name}**: ${d.join(', ')}`);
        });
        if (dangerousRoles.length > 0) {
          embed.addFields({
            name: '🚨 TEHLİKELİ İZİN UYARISI',
            value: `\`\`\`${dangerousRoles.join('\n').slice(0, 500)}\`\`\``,
            inline: false,
          });
          embed.setColor(config.colors.error);
        }
      }
      if (removedRoles.size > 0) {
        embed.addFields({ name: '❌ Kaldırılan Roller', value: removedRoles.map(r => `${r}`).join(', '), inline: false });
      }

      await sendLog(guild, 'roleLog', embed);
    }

    // ── Nickname değişikliği ─────────────────────────────────
    if (oldMember.nickname !== newMember.nickname && config.logging.nicknameChange) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setAuthor({ name: `${newMember.user.tag} — Takma Ad Değişti`, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${newMember.id}>\n\`${newMember.id}\``, inline: true },
          { name: '📝 Önceki',    value: `\`${oldMember.nickname || 'Yok'}\``,        inline: true },
          { name: '✏️ Yeni',      value: `\`${newMember.nickname || 'Kaldırıldı'}\``, inline: true },
          { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      await sendLog(guild, 'memberLog', embed);
    }

    // ── Timeout değişikliği ──────────────────────────────────
    const oldTO = oldMember.communicationDisabledUntil;
    const newTO = newMember.communicationDisabledUntil;
    if (oldTO !== newTO && config.logging.memberMute) {
      const embed = new EmbedBuilder()
        .setColor(newTO ? config.colors.mute : config.colors.success)
        .setAuthor({ name: `${newMember.user.tag} — ${newTO ? 'Timeout Uygulandı' : 'Timeout Kaldırıldı'}`, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${newMember.id}>\n\`${newMember.id}\``, inline: true },
          ...(newTO ? [{ name: '⏰ Bitiş', value: discordTimestamp(newTO, 'R'), inline: true }] : []),
          { name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      await sendLog(guild, 'modLog', embed);
    }
  },
};
