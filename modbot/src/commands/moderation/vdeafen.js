const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vdeafen',
  aliases: ['sassağırlaştır', 'voicedeafen', 'sağırlaştır'],
  description: 'Ses kanalındaki kullanıcıyı sağırlaştırır (duyamaz).',
  usage: '!vdeafen <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Sağırlaştır** iznine ihtiyacın var.')] });

    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (target.voice.serverDeaf) return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten sağırlaştırılmış.')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await target.voice.setDeaf(true, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: '🔕 Ses Kanalında Sağırlaştırıldı', iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>`,           inline: true },
        { name: '🔊 Kanal',     value: `${target.voice.channel}`,   inline: true },
        { name: '📋 Sebep',     value: reason,                       inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,           inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', modLogEmbed({
      emoji: '🔕', title: 'Ses Kanalında Sağırlaştırıldı', color: config.colors.mute,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, extra: [{ name: '🔊 Kanal', value: `${target.voice.channel}`, inline: true }],
    }));
  },
};
