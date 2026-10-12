const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'unlock',
  aliases: ['kilitsizleştir', 'kanalac', 'kanalaç'],
  description: 'Kilitli bir kanalın kilidini açar.',
  usage: '!unlock [#kanal] [sebep]',
  category: 'moderation',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Kilitli bir kanalın kilidini açar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('kanal').setDescription('Açılacak kanal (boş = mevcut)').setRequired(false))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const channel = interaction.options.getChannel('kanal') || interaction.channel;
    const reason  = interaction.options.getString('sebep') || 'Kilit kaldırıldı';
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `${interaction.user.tag} | ${reason}` });
    await interaction.reply({ content: `🔓 ${channel} kilidi açıldı.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const channel = message.mentions.channels.first() || message.channel;
    const reason  = args.filter(a => !a.startsWith('<#')).join(' ') || 'Kilit kaldırıldı';

    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: null,
    }, { reason: `${message.author.tag} | ${reason}` });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: '🔓 Kanal Kilidi Açıldı', iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '📍 Kanal',   value: `${channel}`,                     inline: true  },
        { name: '📋 Sebep',   value: reason,                            inline: false },
        { name: '👮 Yetkili', value: message.author.tag,                inline: true  },
        { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'R'), inline: true  },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await channel.send({ embeds: [new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`🔓 Bu kanalın kilidi **${message.author.tag}** tarafından açıldı.`)
      .setTimestamp()] }).catch(() => null);

    await sendLog(message.guild, 'serverLog', new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🔓 Kanal Kilidi Açıldı')
      .addFields(
        { name: '📍 Kanal',   value: `${channel} \`(${channel.id})\``,                    inline: true  },
        { name: '👮 Yetkili', value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true  },
        { name: '📋 Sebep',   value: reason,                                               inline: false },
      )
      .setTimestamp());
  },
};
