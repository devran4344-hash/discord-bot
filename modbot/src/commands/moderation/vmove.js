const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vmove',
  aliases: ['sestasi', 'voicemove', 'seskanalitasi'],
  description: 'Kullanıcıyı başka bir ses kanalına taşır.',
  usage: '!vmove <@üye | ID> <kanal-ID>',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('vmove')
    .setDescription('Kullanıcıyı başka bir ses kanalına taşır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption(o => o.setName('üye').setDescription('Taşınacak üye').setRequired(true))
    .addChannelOption(o => o.setName('kanal').setDescription('Hedef ses kanalı').setRequired(true)),

  async executeSlash(interaction, client) {
    const target  = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    const channel = interaction.options.getChannel('kanal');
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('Üye ses kanalında değil.')], flags: 64 });
    await target.voice.setChannel(channel);
    await interaction.reply({ content: `🔀 **${target.user.tag}** → ${channel} kanalına taşındı.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Taşı** iznine ihtiyacın var.')] });
    if (!args[0] || !args[1]) return message.reply({ embeds: [errorEmbed('Kullanıcı ve hedef kanal belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });

    const channelId  = args[1].replace(/[<#>]/g, '');
    const destChannel = message.guild.channels.cache.get(channelId);
    if (!destChannel || destChannel.type !== 2)
      return message.reply({ embeds: [errorEmbed('Geçerli bir ses kanalı belirt.')] });

    const oldChannel = target.voice.channel;
    await target.voice.setChannel(destChannel, `${message.author.tag} tarafından taşındı`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setAuthor({ name: `${e.voiceMove || '🔀'} Ses Kanalına Taşındı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>`,    inline: true  },
        { name: '🔴 Eski Kanal', value: `${oldChannel}`,      inline: true  },
        { name: '🟢 Yeni Kanal', value: `${destChannel}`,     inline: true  },
        { name: '👮 Yetkili',    value: message.author.tag,   inline: true  },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'R'), inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`${e.voiceMove || '🔀'} Kullanıcı Taşındı`)
      .addFields(
        { name: '👤 Kullanıcı',  value: `<@${target.id}>\n\`${target.user.tag}\``,          inline: true },
        { name: '🔴 Eski',       value: `${oldChannel}`,                                     inline: true },
        { name: '🟢 Yeni',       value: `${destChannel}`,                                    inline: true },
        { name: '👮 Yetkili',    value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true },
      )
      .setTimestamp());
  },
};
