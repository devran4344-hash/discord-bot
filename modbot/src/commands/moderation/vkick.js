const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vkick',
  aliases: ['sesat', 'voicekick', 'seskanaliat'],
  description: 'Kullanıcıyı ses kanalından atar (kanaldan çıkarır).',
  usage: '!vkick <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Taşı** iznine ihtiyacın var.')] });

    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı atamazsın!')] });

    const reason     = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const oldChannel = target.voice.channel;

    // Ses kanalından at: null channel'a set et
    await target.voice.setChannel(null, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.kick)
      .setAuthor({ name: `${e.kick} Ses Kanalından Atıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı',  value: `<@${target.id}> \`(${target.id})\``, inline: true  },
        { name: '🔊 Kanalı',     value: `${oldChannel}`,                       inline: true  },
        { name: '📋 Sebep',      value: reason,                                 inline: false },
        { name: '👮 Yetkili',    value: message.author.tag,                     inline: true  },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'R'),      inline: true  },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', new EmbedBuilder()
      .setColor(config.colors.kick)
      .setTitle(`${e.kick} Ses Kanalından Atıldı`)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.user.tag}\``,           inline: true },
        { name: '🔊 Kanal',     value: `${oldChannel}`,                                      inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true },
        { name: '📋 Sebep',     value: reason,                                                inline: false },
      )
      .setTimestamp());
  },
};
