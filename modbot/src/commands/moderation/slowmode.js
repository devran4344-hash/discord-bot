const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'slowmode',
  aliases: ['yavasmod', 'sm', 'yavaşmod'],
  description: 'Kanala yavaş mod uygular. 0 girerek kapatırsın.',
  usage: '!slowmode <0-21600 saniye> [#kanal]',
  example: '!slowmode 5',
  category: 'moderation',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600)
      return message.reply({ embeds: [errorEmbed('**0** ile **21600** saniye (6 saat) arasında bir değer gir.\n> `0` = Kapat, `21600` = Maksimum (6 saat)')] });

    const channel = message.mentions.channels.first() || message.channel;

    await channel.setRateLimitPerUser(seconds, `${message.author.tag} tarafından ayarlandı`);

    const embed = new EmbedBuilder()
      .setColor(seconds === 0 ? config.colors.success : config.colors.warning)
      .setAuthor({
        name: seconds === 0 ? '🔊 Yavaş Mod Kapatıldı' : '🐌 Yavaş Mod Ayarlandı',
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .addFields(
        { name: '📍 Kanal',    value: `${channel}`,                                                         inline: true  },
        { name: '⏱️ Süre',     value: seconds === 0 ? '❌ Kapalı' : `\`${seconds}\` saniye`,               inline: true  },
        { name: '👮 Yetkili',  value: message.author.tag,                                                   inline: true  },
        { name: '📅 Tarih',    value: discordTimestamp(new Date(), 'R'),                                    inline: true  },
        ...(seconds > 0 ? [{ name: 'ℹ️ Bilgi', value: `Üyeler her **${seconds}** saniyede bir mesaj gönderebilir.`, inline: false }] : []),
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'modLog', new EmbedBuilder()
      .setColor(config.colors.modlog)
      .setTitle('🐌 Yavaş Mod Değiştirildi')
      .addFields(
        { name: '📍 Kanal',  value: `${channel} \`(${channel.id})\``,                     inline: true },
        { name: '⏱️ Yeni',   value: seconds === 0 ? 'Kapalı' : `${seconds}s`,             inline: true },
        { name: '👮 Yetkili',value: `${message.author.tag}\n\`${message.author.id}\``,    inline: true },
        { name: '📅 Tarih',  value: discordTimestamp(new Date(), 'F'),                     inline: true },
      )
      .setTimestamp());
  },
};
