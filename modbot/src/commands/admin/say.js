const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'say',
  aliases: ['söyle', 'yaz'],
  description: 'Bot olarak belirtilen kanalda mesaj gönderir.',
  usage: '!say [#kanal] <mesaj>',
  example: '!say Merhaba sunucu!',
  category: 'admin',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [errorEmbed('**Mesajları Yönet** iznine ihtiyacın var.')] });

    const targetChannel = message.mentions.channels.first() || message.channel;
    const text = args.filter(a => !a.startsWith('<#')).join(' ');

    if (!text)
      return message.reply({ embeds: [errorEmbed('Mesaj içeriği boş olamaz!\n> **Kullanım:** `!say [#kanal] <mesaj>`')] });

    await message.delete().catch(() => null);
    await targetChannel.send(text).catch(err =>
      message.channel.send({ embeds: [errorEmbed(`Mesaj gönderilemedi: \`${err.message}\``)] })
    );
  },
};
