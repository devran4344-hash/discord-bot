const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp, formatDate } = require('../utils/helpers');
const config = require('../config');

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client) {
    const guild = member.guild;
    const user  = member.user;

    // Kick mi oldu?
    let kickedBy = null;
    try {
      await new Promise(r => setTimeout(r, 800));
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
      const e = logs.entries.find(e => e.target?.id === user.id && Date.now() - e.createdTimestamp < 5000);
      if (e) kickedBy = e.executor;
    } catch {}

    // ── Üye Log ──────────────────────────────────────────────────────
    if (config.logging.memberLeave) {
      const joinDays = member.joinedAt
        ? Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`)
        .slice(0, 8);

      const logEmbed = new EmbedBuilder()
        .setColor(kickedBy ? config.colors.kick : config.colors.leave)
        .setAuthor({ name: `${user.tag} — ${kickedBy ? 'Atıldı' : 'Ayrıldı'}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '👤 Kullanıcı',      value: `\`${user.tag}\`\n\`${user.id}\``,                          inline: true  },
          { name: '👥 Kalan Üye',      value: `**${guild.memberCount}**`,                                  inline: true  },
          ...(kickedBy ? [{ name: '👢 Atan', value: `<@${kickedBy.id}>\n\`${kickedBy.tag}\``, inline: true }] : [{ name: '\u200b', value: '\u200b', inline: true }]),
          { name: '📅 Katılım',        value: member.joinedAt ? discordTimestamp(member.joinedAt, 'R') : 'Bilinmiyor', inline: true  },
          ...(joinDays !== null ? [{ name: '⌚ Sunucuda Kalış', value: `\`${joinDays}\` gün`, inline: true }] : []),
          { name: '📅 Ayrılış',        value: discordTimestamp(new Date(), 'R'),                           inline: true  },
          ...(roles.length > 0 ? [{ name: `🎭 Roller (${member.roles.cache.size - 1})`, value: roles.join(' '), inline: false }] : []),
        )
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

      await sendLog(guild, 'memberLog', logEmbed);
    }

    // ── Güle Güle ─────────────────────────────────────────────────────
    if (!config.leave.enabled) return;
    const leaveChannelId = config.channels.leaveChannel;
    if (!leaveChannelId) return;
    const leaveChannel = guild.channels.cache.get(leaveChannelId);
    if (!leaveChannel) return;

    const msg = config.leave.message
      .replace('{user}',        user.tag)
      .replace('{username}',    user.username)
      .replace('{server}',      guild.name)
      .replace('{memberCount}', guild.memberCount.toString());

    const leaveEmbed = new EmbedBuilder()
      .setColor(config.leave.embedColor || config.colors.leave)
      .setAuthor({ name: `${guild.name} — Üye Ayrıldı`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle(`👋 Güle Güle, ${user.username}!`)
      .setDescription(msg)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `\`${user.tag}\``,         inline: true },
        { name: '👥 Kalan Üye', value: `**${guild.memberCount}**`, inline: true },
      )
      .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await leaveChannel.send({ embeds: [leaveEmbed] }).catch(() => null);
    // ─── Davet Tracker — ayrılma ────────────────────────────────────
    try {
      const { handleMemberLeave } = require('../systems/inviteTracker');
      await handleMemberLeave(member);
    } catch {}
  },
};
