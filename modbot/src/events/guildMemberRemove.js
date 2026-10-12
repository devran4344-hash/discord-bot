// ╔══════════════════════════════════════════════════════════════════════╗
// ║     EVENT: guildMemberRemove — Çıkış Banner                        ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

// ══════════════════════════════════════════════════════
//  YARDIMCI: Banner URL belirle
// ══════════════════════════════════════════════════════
function getBannerUrl(guild, cfgUrl) {
  if (cfgUrl && cfgUrl.trim()) return cfgUrl.trim();
  const guildBanner = guild.bannerURL({ size: 1024, format: 'png' });
  if (guildBanner) return guildBanner;
  return null;
}

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client) {
    const guild = member.guild;
    const user  = member.user;

    // ── Kick audit log kontrolü ──────────────────────────────────
    let kickedBy = null;
    try {
      await new Promise(r => setTimeout(r, 800));
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
      const entry = logs.entries.find(
        en => en.target?.id === user.id && Date.now() - en.createdTimestamp < 5000,
      );
      if (entry) kickedBy = entry.executor;
    } catch {}

    // ── Üye log (memberLog kanalına) ─────────────────────────────
    if (config.logging.memberLeave) {
      const joinDays = member.joinedAt
        ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
        : null;

      const roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`)
        .slice(0, 8);

      await sendLog(guild, 'memberLog', new EmbedBuilder()
        .setColor(kickedBy ? config.colors.kick : config.colors.leave)
        .setAuthor({
          name:    `${user.tag} — ${kickedBy ? 'Atıldı' : 'Ayrıldı'}`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '👤 Kullanıcı',    value: `\`${user.tag}\`\n\`${user.id}\``,                              inline: true },
          { name: '👥 Kalan Üye',    value: `**${guild.memberCount}**`,                                      inline: true },
          ...(kickedBy
            ? [{ name: '👢 Atan', value: `<@${kickedBy.id}>\n\`${kickedBy.tag}\``, inline: true }]
            : [{ name: '\u200b', value: '\u200b', inline: true }]),
          { name: '📅 Katılım',      value: member.joinedAt ? discordTimestamp(member.joinedAt, 'R') : 'Bilinmiyor', inline: true },
          ...(joinDays !== null ? [{ name: '⌚ Sunucuda Kalış', value: `\`${joinDays}\` gün`, inline: true }] : []),
          { name: '📅 Ayrılış',      value: discordTimestamp(new Date(), 'R'),                               inline: true },
          ...(roles.length > 0 ? [{ name: `🎭 Roller (${member.roles.cache.size - 1})`, value: roles.join(' '), inline: false }] : []),
        )
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp());
    }

    // ── Güle güle kanalı yoksa çık ───────────────────────────────
    if (!config.leave.enabled) return;
    const leaveChannelId = config.channels.leaveChannel;
    if (!leaveChannelId) return;
    const leaveChannel = guild.channels.cache.get(leaveChannelId);
    if (!leaveChannel) return;

    const bannerUrl = getBannerUrl(guild, config.leave.bannerUrl);
    const altYazi   = (config.leave.altYazi || 'Sunucudan Ayrıldı')
      .replace('{user}',        user.username)
      .replace('{username}',    user.username)
      .replace('{server}',      guild.name)
      .replace('{memberCount}', guild.memberCount.toString());

    const joinDays = member.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;

    // ── Ana banner embed ─────────────────────────────────────────
    const bannerEmbed = new EmbedBuilder()
      .setColor(config.leave.bannerColor || config.colors.leave)
      .setAuthor({
        name:    `${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `## ${user.username}\n` +
        `### ${altYazi}`,
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({
        text:    `${guild.name} • Kalan üye: ${guild.memberCount}`,
        iconURL: guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    if (bannerUrl) bannerEmbed.setImage(bannerUrl);

    // ── Detay embed ──────────────────────────────────────────────
    const detayEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .addFields(
        { name: '👤 Kullanıcı',     value: `\`${user.tag}\``,                                              inline: true },
        { name: '🪪 ID',            value: `\`${user.id}\``,                                               inline: true },
        { name: '👥 Kalan Üye',     value: `**${guild.memberCount}**`,                                     inline: true },
        { name: '📅 Katılış',       value: member.joinedAt ? discordTimestamp(member.joinedAt, 'D') : '—', inline: true },
        { name: '⌚ Kalış Süresi',  value: joinDays !== null ? `\`${joinDays}\` gün` : '—',                inline: true },
        { name: '📅 Ayrılış',       value: discordTimestamp(new Date(), 'R'),                              inline: true },
        ...(kickedBy ? [{ name: '👢 Atan Yetkili', value: `<@${kickedBy.id}> \`${kickedBy.tag}\``, inline: false }] : []),
      );

    await leaveChannel.send({ embeds: [bannerEmbed, detayEmbed] }).catch(() => null);

    // ── Davet tracker — ayrılma ───────────────────────────────────
    try {
      const { handleMemberLeave } = require('../systems/inviteTracker');
      await handleMemberLeave(member);
    } catch {}
  },
};
