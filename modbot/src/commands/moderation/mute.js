const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, formatDuration, parseDuration, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction, saveMute } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'mute',
  aliases: ['sus', 'sustur'],
  description: 'Kullanıcıyı susturur.',
  usage: '!mute <@kullanıcı | ID> [süre] [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Yönet** iznine ihtiyacın var.')] });
    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.\n> **Süre örnekleri:** `10m`, `2h`, `1d`')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Kendimi susturamam!')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı sustuaramazsın!')] });

    const MAX = 28 * 24 * 60 * 60 * 1000;
    let duration = null, reasonStart = 1;
    if (args[1] && parseDuration(args[1])) {
      duration = parseDuration(args[1]);
      reasonStart = 2;
      if (duration > MAX) return message.reply({ embeds: [errorEmbed('Timeout süresi en fazla **28 gün** olabilir.')] });
    }

    const reason     = args.slice(reasonStart).join(' ') || 'Sebep belirtilmedi';
    const applied    = duration || MAX;
    const expiresAt  = new Date(Date.now() + applied);
    const mutedRole  = config.roles.muted ? message.guild.roles.cache.get(config.roles.muted) : null;

    if (mutedRole) {
      await target.roles.add(mutedRole, `${message.author.tag} | ${reason}`).catch(() => null);
      if (duration) {
        await saveMute(message.guild.id, target.id, { reason, duration, moderatorId: message.author.id, expiresAt: Date.now() + duration });
        setTimeout(async () => {
          const m = await message.guild.members.fetch(target.id).catch(() => null);
          if (m?.roles.cache.has(mutedRole.id)) await m.roles.remove(mutedRole).catch(() => null);
        }, duration);
      }
    } else {
      await target.timeout(applied, `${message.author.tag} | ${reason}`)
        .catch(err => { return message.reply({ embeds: [errorEmbed(`Mute başarısız: \`${err.message}\``)] }); });
    }

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.mute} ${message.guild.name} Sunucusunda Susturuldun`)
      .addFields(
        { name: '📋 Sebep',   value: `\`\`\`${reason}\`\`\``, inline: false },
        { name: '⏱️ Süre',    value: duration ? formatDuration(duration) : 'Maksimum', inline: true },
        { name: '🔔 Bitiş',   value: discordTimestamp(expiresAt, 'R'), inline: true },
        { name: '👮 Yetkili', value: message.author.tag, inline: true },
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: `${e.mute} Kullanıcı Susturuldu`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📋 Sebep',     value: reason,                                 inline: false },
        { name: '⏱️ Süre',      value: duration ? formatDuration(duration) : 'Süresiz', inline: true },
        { name: '🔔 Bitiş',     value: discordTimestamp(expiresAt, 'R'),       inline: true  },
        { name: '👮 Yetkili',   value: message.author.tag,                     inline: true  },
      )
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, target.id, { type: 'mute', reason, duration, moderatorId: message.author.id, moderatorTag: message.author.tag });
    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.mute, title: 'Kullanıcı Susturuldu', color: config.colors.mute,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [
        { name: '⏱️ Süre', value: duration ? formatDuration(duration) : 'Süresiz', inline: true },
        { name: '🔔 Bitiş', value: discordTimestamp(expiresAt, 'R'), inline: true },
        { name: '📍 Kanal', value: `${message.channel}`, inline: true },
      ],
    }));
  },
};
