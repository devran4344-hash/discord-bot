const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'lock',
  aliases: ['kilitle', 'kanalkilitle'],
  description: 'Belirtilen kanalı kilitler.',
  usage: '!lock [#kanal] [sebep]',
  category: 'moderation',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Kanalı kilitler, @everyone mesaj gönderemez.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('kanal').setDescription('Kilitlenecek kanal (boş = mevcut)').setRequired(false))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const channel = interaction.options.getChannel('kanal') || interaction.channel;
    const reason  = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason: `${interaction.user.tag} | ${reason}` });
    await interaction.reply({ content: `🔒 ${channel} kilitlendi. Sebep: ${reason}` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });
    const channel = message.mentions.channels.first() || message.channel;
    const reason  = args.filter(a => !a.startsWith('<#')).join(' ') || 'Sebep belirtilmedi';

    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false,
    }, { reason: `${message.author.tag} | ${reason}` });

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: '🔒 Kanal Kilitlendi', iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '📍 Kanal',   value: `${channel}`,                 inline: true  },
        { name: '📋 Sebep',   value: reason,                        inline: false },
        { name: '👮 Yetkili', value: message.author.tag,            inline: true  },
        { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'R'), inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    await channel.send({ embeds: [new EmbedBuilder()
      .setColor(config.colors.error)
      .setDescription(`🔒 Bu kanal **${message.author.tag}** tarafından kilitlendi.\n> 📋 Sebep: ${reason}`)
      .setTimestamp()] }).catch(() => null);

    await sendLog(message.guild, 'serverLog', new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🔒 Kanal Kilitlendi')
      .addFields(
        { name: '📍 Kanal',   value: `${channel} \`(${channel.id})\``,                    inline: true  },
        { name: '👮 Yetkili', value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true  },
        { name: '📋 Sebep',   value: reason,                                               inline: false },
      )
      .setTimestamp());
  },
};
