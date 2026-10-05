const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'announce',
  aliases: ['duyur', 'duyuru', 'bildir'],
  description: 'Belirtilen kanala embed duyuru gönderir.',
  usage: '!announce [#kanal] <mesaj>',
  example: '!announce #duyurular Sunucu bakımda!',
  category: 'admin',
  cooldown: 10000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [errorEmbed('**Mesajları Yönet** iznine ihtiyacın var.')] });

    const targetChannel = message.mentions.channels.first() || message.channel;
    const text          = args.filter(a => !a.startsWith('<#')).join(' ');

    if (!text)
      return message.reply({ embeds: [errorEmbed('Duyuru metni boş olamaz!\n> **Kullanım:** `!announce [#kanal] <mesaj>`')] });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: '📢 Duyuru', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription(text)
      .setFooter({ text: `Duyuran: ${message.author.tag} • ${message.guild.name}` })
      .setTimestamp();

    await targetChannel.send({ content: '@everyone', embeds: [embed] })
      .catch(() => targetChannel.send({ embeds: [embed] }));

    if (targetChannel.id !== message.channel.id) {
      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✅ Duyuru ${targetChannel} kanalına gönderildi.`)],
      });
    }

    await message.delete().catch(() => null);
  },
};
