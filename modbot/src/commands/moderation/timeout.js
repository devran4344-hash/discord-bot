const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, formatDuration, parseDuration, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'timeout',
  aliases: ['to', 'zamanaşımı'],
  description: 'Discord timeout uygular (maks 28 gün).',
  usage: '!timeout <@kullanıcı | ID> <süre> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Yönet** iznine ihtiyacın var.')] });
    if (!args[0] || !args[1])
      return message.reply({ embeds: [errorEmbed('Kullanıcı ve süre belirtmelisin.\n> **Süre:** `10m`, `2h`, `1d` (maks 28 gün)')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıya timeout uygulayamazsın!')] });

    const duration = parseDuration(args[1]);
    if (!duration) return message.reply({ embeds: [errorEmbed('Geçerli süre gir. Örnek: `10m`, `2h`, `1d`')] });
    if (duration > 28 * 24 * 60 * 60 * 1000) return message.reply({ embeds: [errorEmbed('Timeout süresi en fazla **28 gün** olabilir.')] });

    const reason    = args.slice(2).join(' ') || 'Sebep belirtilmedi';
    const expiresAt = new Date(Date.now() + duration);

    await target.timeout(duration, `${message.author.tag} | ${reason}`)
      .catch(err => { return message.reply({ embeds: [errorEmbed(`Timeout başarısız: \`${err.message}\``)] }); });

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.timeout)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.timeout} ${message.guild.name} Sunucusunda Timeout Aldın`)
      .addFields(
        { name: '📋 Sebep',   value: `\`\`\`${reason}\`\`\``, inline: false },
        { name: '⏱️ Süre',    value: formatDuration(duration),  inline: true  },
        { name: '🔔 Bitiş',   value: discordTimestamp(expiresAt, 'R'), inline: true },
        { name: '👮 Yetkili', value: message.author.tag, inline: true },
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.timeout)
      .setAuthor({ name: `${e.timeout} Timeout Uygulandı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📋 Sebep',     value: reason,                                 inline: false },
        { name: '⏱️ Süre',      value: formatDuration(duration),              inline: true  },
        { name: '🔔 Bitiş',     value: discordTimestamp(expiresAt, 'R'),      inline: true  },
        { name: '👮 Yetkili',   value: message.author.tag,                     inline: true  },
      )
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, target.id, { type: 'timeout', reason, duration, moderatorId: message.author.id, moderatorTag: message.author.tag });
    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.timeout, title: 'Timeout Uygulandı', color: config.colors.timeout,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [
        { name: '⏱️ Süre', value: formatDuration(duration), inline: true },
        { name: '🔔 Bitiş', value: discordTimestamp(expiresAt, 'R'), inline: true },
      ],
    }));
  },
};
