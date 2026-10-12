const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vmute',
  aliases: ['sessus', 'voicemute', 'sessustur'],
  description: 'Ses kanalındaki kullanıcıyı susturur.',
  usage: '!vmute <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('vmute')
    .setDescription('Ses kanalındaki kullanıcıyı susturur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(o => o.setName('üye').setDescription('Susturulacak üye').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('Üye ses kanalında değil.')], flags: 64 });
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    await target.voice.setMute(true, reason);
    await interaction.reply({ content: `🔇 **${target.user.tag}** ses susturuldu.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Sustur** iznine ihtiyacın var.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });
    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (!canModerate(message.member, target)) return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı sustuaramazsın!')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

    if (target.voice.serverMute) {
      return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten ses kanalında susturulmuş.')] });
    }

    await target.voice.setMute(true, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: `${e.mute} Ses Kanalında Susturuldu`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``,       inline: true },
        { name: '🔊 Ses Kanalı', value: `${target.voice.channel}`,                  inline: true },
        { name: '📋 Sebep',     value: reason,                                       inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,                           inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),            inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', modLogEmbed({
      emoji: e.mute, title: 'Ses Kanalında Susturuldu', color: config.colors.mute,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: target.user.displayAvatarURL({ dynamic: true }),
      extra: [{ name: '🔊 Kanal', value: `${target.voice.channel}`, inline: true }],
    }));
  },
};
