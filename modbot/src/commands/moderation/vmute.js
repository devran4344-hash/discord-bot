const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vmute',
  aliases: ['sessus', 'voicemute', 'sessustur'],
  description: 'Ses kanalındaki kullanıcıyı susturur (server mute).',
  usage: '!vmute <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Sustur** iznine ihtiyacın var.')] });

    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı sustuaramazsın!')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

    if (target.voice.serverMute) {
      return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten ses kanalında susturulmuş.')] });
    }

    await target.voice.setMute(true, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: `${e.mute} Ses Kanalında Susturuldu`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``,       inline: true },
        { name: '🔊 Ses Kanalı', value: `${target.voice.channel}`,                  inline: true },
        { name: '📋 Sebep',     value: reason,                                       inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,                           inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),            inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', modLogEmbed({
      emoji: e.mute, title: 'Ses Kanalında Susturuldu', color: config.colors.mute,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [{ name: '🔊 Kanal', value: `${target.voice.channel}`, inline: true }],
    }));
  },
};
