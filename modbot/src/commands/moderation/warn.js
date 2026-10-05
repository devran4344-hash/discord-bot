const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, formatDuration, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addWarning, addModAction } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'warn',
  aliases: ['uyar', 'uyarı'],
  description: 'Kullanıcıya uyarı verir. Eşiğe göre otomatik ceza uygulanır.',
  usage: '!warn <@kullanıcı | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Yönet** iznine ihtiyacın var.')] });
    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Kendime uyarı veremem!')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı uyaramazsın!')] });

    const reason    = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const warnings  = await addWarning(message.guild.id, target.id, { reason, moderatorId: message.author.id, moderatorTag: message.author.tag });
    const count     = warnings.length;
    const threshold = config.warnings.thresholds[count];
    const maxWarn   = Math.max(...Object.keys(config.warnings.thresholds).map(Number));

    const barFilled = Math.min(Math.round((count / maxWarn) * 10), 10);
    const bar       = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);
    const barClr    = count === 0 ? e.success : count < 4 ? e.warning : count < 7 ? e.warn : e.error;

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warn)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.warn} ${message.guild.name} Sunucusunda Uyarı Aldın`)
      .addFields(
        { name: '📋 Sebep',        value: `\`\`\`${reason}\`\`\``, inline: false },
        { name: `${e.strike} Durum`, value: `${barClr} \`${bar}\` **${count}/${maxWarn}**`, inline: false },
        { name: '👮 Yetkili',      value: message.author.tag, inline: true },
        { name: '📅 Tarih',        value: discordTimestamp(new Date(), 'R'), inline: true },
        ...(threshold ? [{ name: `${e.raid} Otomatik Ceza`, value: `**${threshold.action.toUpperCase()}** uygulandı!`, inline: false }] : []),
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.warn)
      .setAuthor({ name: `${e.warn} Kullanıcı Uyarıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı',    value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📋 Sebep',        value: reason,                                 inline: false },
        { name: `${e.strike} Uyarı`, value: `${barClr} \`${bar}\` **${count}/${maxWarn}**`, inline: false },
        { name: '👮 Yetkili',      value: message.author.tag, inline: true },
        { name: '📅 Tarih',        value: discordTimestamp(new Date(), 'R'), inline: true },
        ...(threshold ? [{ name: `${e.raid} Otomatik Ceza`, value: threshold.action.toUpperCase(), inline: true }] : []),
      )
      .setFooter({ text: `${e.shield} ${message.guild.name}` })
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, target.id, { type: 'warn', reason, moderatorId: message.author.id, moderatorTag: message.author.tag });

    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.warn, title: 'Kullanıcı Uyarıldı', color: config.colors.warn,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [
        { name: `${e.strike} Uyarı`, value: `${barClr} \`${bar}\` **${count}/${maxWarn}**`, inline: false },
        { name: '📍 Kanal', value: `${message.channel}`, inline: true },
        ...(threshold ? [{ name: `${e.raid} Otomatik Ceza`, value: threshold.action.toUpperCase(), inline: true }] : []),
      ],
    }));

    // Otomatik ceza
    if (threshold) {
      setTimeout(async () => {
        try {
          const m = await message.guild.members.fetch(target.id).catch(() => null);
          if (!m) return;
          if (threshold.action === 'mute' && threshold.duration) await m.timeout(threshold.duration, threshold.reason).catch(() => null);
          else if (threshold.action === 'kick') await m.kick(threshold.reason).catch(() => null);
          else if (threshold.action === 'tempban') {
            await message.guild.bans.create(m.id, { reason: threshold.reason }).catch(() => null);
            if (threshold.duration) setTimeout(() => message.guild.bans.remove(m.id).catch(() => null), threshold.duration);
          }
          else if (threshold.action === 'ban') await message.guild.bans.create(m.id, { reason: threshold.reason }).catch(() => null);

          const autoEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${e.raid} Otomatik Ceza — ${threshold.action.toUpperCase()}`)
            .addFields(
              { name: '👤 Kullanıcı', value: `${m.user.tag} \`(${m.id})\``, inline: true },
              { name: '⚡ İşlem',     value: threshold.action.toUpperCase(), inline: true },
              { name: '📋 Sebep',     value: threshold.reason,               inline: false },
              ...(threshold.duration ? [{ name: '⏱️ Süre', value: formatDuration(threshold.duration), inline: true }] : []),
            )
            .setTimestamp();
          await sendLog(message.guild, 'modLog', autoEmbed);
        } catch (_) {}
      }, 600);
    }
  },
};
