const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const filter = require('../../utils/profanityFilter');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'removeword',
  aliases: ['kelimesil', 'yasakkaldir', 'yasaksil'],
  description: 'Küfür listesinden kelime çıkarır.',
  usage: '!removeword <kelime>',
  category: 'admin',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('**Sunucuyu Yönet** iznine ihtiyacın var.')] });

    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Bir kelime belirtmelisin.\n> **Kullanım:** `!removeword <kelime>`')] });

    const word    = args.join(' ').toLowerCase().trim();
    const removed = filter.removeCustomWord(word);

    if (!removed) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.warning} \`${word}\` yasaklı kelime listesinde **bulunamadı**.\n> Not: Yerleşik listeden (Türkçe/İngilizce) kelimeler kaldırılamaz, sadece runtime'da eklenenler kaldırılabilir.`)],
      });
    }

    await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${e.success} \`${word}\` kelimesi listeden kaldırıldı.`)
        .addFields(
          { name: '📝 Kaldırılan',  value: `\`${word}\``,               inline: true },
          { name: '👮 Yetkili',     value: message.author.tag,          inline: true },
          { name: '📅 Tarih',       value: discordTimestamp(new Date(), 'R'), inline: true },
        )
        .setTimestamp()],
    });
  },
};
