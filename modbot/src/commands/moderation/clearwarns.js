const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp, sendLog, isModerator } = require('../../utils/helpers');
const { clearWarnings, getWarnings } = require('../../utils/database');
const config = require('../../config');

module.exports = {
  name: 'clearwarns',
  aliases: ['uyarıtemizle', 'warnreset', 'warntemizle'],
  description: 'Kullanıcının tüm uyarılarını siler.',
  usage: '!clearwarns <@üye | ID>',
  category: 'moderation',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için moderatör olman gerekiyor.')] });

    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Bir kullanıcı belirtmelisin.\n> **Kullanım:** `!clearwarns <@üye | ID>`')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const before = await getWarnings(message.guild.id, target.id);
    if (before.length === 0)
      return message.reply({ embeds: [errorEmbed(`**${target.user.tag}** kullanıcısının zaten hiç uyarısı yok.`)] });

    await clearWarnings(message.guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: '🧹 Tüm Uyarılar Temizlendi', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı',    value: `<@${target.id}> \`(${target.id})\``, inline: true },
        { name: '🧹 Silinen',      value: `\`${before.length}\` uyarı`,         inline: true },
        { name: '👮 Yetkili',      value: message.author.tag,                   inline: true },
        { name: '📅 Tarih',        value: discordTimestamp(new Date(), 'R'),    inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'modLog', new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🧹 Uyarılar Temizlendi')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.id}\``,               inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
        { name: '🧹 Silinen',   value: `\`${before.length}\` uyarı`,                      inline: true },
      )
      .setTimestamp());
  },
};
