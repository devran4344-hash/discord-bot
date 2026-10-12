const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vkick',
  aliases: ['sesat', 'voicekick', 'seskanaliat'],
  description: 'Kullanıcıyı ses kanalından atar.',
  usage: '!vkick <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('vkick')
    .setDescription('Kullanıcıyı ses kanalından atar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption(o => o.setName('üye').setDescription('Atılacak üye').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('Üye ses kanalında değil.')], flags: 64 });
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    await target.voice.disconnect(reason);
    await interaction.reply({ content: `👢 **${target.user.tag}** ses kanalından atıldı.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Taşı** iznine ihtiyacın var.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });
    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı atamazsın!')] });

    const reason     = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const oldChannel = target.voice.channel;

    // Ses kanalından at: null channel'a set et
    await target.voice.setChannel(null, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.kick)
      .setAuthor({ name: `${e.kick} Ses Kanalından Atıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı',  value: `<@${target.id}> \`(${target.id})\``, inline: true  },
        { name: '🔊 Kanalı',     value: `${oldChannel}`,                       inline: true  },
        { name: '📋 Sebep',      value: reason,                                 inline: false },
        { name: '👮 Yetkili',    value: message.author.tag,                     inline: true  },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'R'),      inline: true  },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', new EmbedBuilder()
      .setColor(config.colors.kick)
      .setTitle(`${e.kick} Ses Kanalından Atıldı`)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.user.tag}\``,           inline: true },
        { name: '🔊 Kanal',     value: `${oldChannel}`,                                      inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true },
        { name: '📋 Sebep',     value: reason,                                                inline: false },
      )
      .setTimestamp());
  },
};
