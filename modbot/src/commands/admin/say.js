const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'say',
  aliases: ['söyle', 'yaz'],
  description: 'Bot olarak belirtilen kanalda mesaj gönderir.',
  usage: '!say [#kanal] <mesaj>',
  example: '!say Merhaba sunucu!',
  category: 'admin',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot olarak mesaj gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true))
    .addChannelOption(o => o.setName('kanal').setDescription('Hedef kanal (boş = mevcut)').setRequired(false)),

  async executeSlash(interaction, client) {
    const text    = interaction.options.getString('mesaj');
    const channel = interaction.options.getChannel('kanal') || interaction.channel;
    await channel.send(text).catch(err => null);
    await interaction.reply({ content: `✅ Mesaj ${channel} kanalına gönderildi.`, flags: 64 });
  },

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
