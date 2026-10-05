const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction, removeMute } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'unmute',
  aliases: ['susuaçıkla', 'suskaldır'],
  description: 'Susturmayı kaldırır.',
  usage: '!unmute <@kullanıcı | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Yönet** iznine ihtiyacın var.')] });
    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const reason   = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const mutedRole = config.roles.muted ? message.guild.roles.cache.get(config.roles.muted) : null;
    let wasMuted   = false;

    if (mutedRole && target.roles.cache.has(mutedRole.id)) {
      await target.roles.remove(mutedRole, `${message.author.tag} | ${reason}`).catch(() => null);
      await removeMute(message.guild.id, target.id);
      wasMuted = true;
    }
    if (target.communicationDisabledUntil) {
      await target.timeout(null, `${message.author.tag} | ${reason}`).catch(() => null);
      wasMuted = true;
    }
    if (!wasMuted) return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten susturulmamış.')] });

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.unmute} ${message.guild.name} Sunucusundaki Susturman Kaldırıldı`)
      .addFields(
        { name: '👮 Yetkili', value: message.author.tag, inline: true },
        { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'R'), inline: true },
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: `${e.unmute} Susturma Kaldırıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📋 Sebep',     value: reason,                                 inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,                     inline: true  },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),      inline: true  },
      )
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, target.id, { type: 'unmute', reason, moderatorId: message.author.id, moderatorTag: message.author.tag });
    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.unmute, title: 'Susturma Kaldırıldı', color: config.colors.success,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
    }));
  },
};
