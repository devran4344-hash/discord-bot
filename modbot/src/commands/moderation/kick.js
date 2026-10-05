const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'kick',
  aliases: ['at', 'çıkar'],
  description: 'Bir kullanıcıyı sunucudan atar.',
  usage: '!kick <@kullanıcı | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri At** iznine ihtiyacın var.')] });
    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Kendimi atamazsın!')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Kendini atamazsın!')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı atamazsın! Rolü senden yüksek.')] });
    if (!target.kickable) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı atmak için yetkim yetmiyor.')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.kick)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.kick} ${message.guild.name} Sunucusundan Atıldın`)
      .addFields(
        { name: '📋 Sebep',   value: `\`\`\`${reason}\`\`\``, inline: false },
        { name: '👮 Yetkili', value: message.author.tag,       inline: true  },
        { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'F'), inline: true },
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    await target.kick(`${message.author.tag} | ${reason}`)
      .catch(err => { return message.reply({ embeds: [errorEmbed(`Kick başarısız: \`${err.message}\``)] }); });

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.kick)
      .setAuthor({ name: `${e.kick} Kullanıcı Atıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📋 Sebep',     value: reason,                                 inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,                     inline: true  },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),      inline: true  },
      )
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, target.id, { type: 'kick', reason, moderatorId: message.author.id, moderatorTag: message.author.tag });
    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.kick, title: 'Kullanıcı Atıldı', color: config.colors.kick,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [{ name: '📍 Kanal', value: `${message.channel}`, inline: true }],
    }));
  },
};
