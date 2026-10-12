const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vunmute',
  aliases: ['sessusaç', 'voiceunmute', 'sessusaçıkla'],
  description: 'Ses kanalındaki kullanıcının susturmasını kaldırır.',
  usage: '!vunmute <@üye | ID>',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('vunmute')
    .setDescription('Ses susturmasını kaldırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(o => o.setName('üye').setDescription('Üye').setRequired(true)),

  async executeSlash(interaction, client) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    await target.voice.setMute(false);
    await interaction.reply({ content: `🔊 **${target.user.tag}** ses susturması kaldırıldı.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Sustur** iznine ihtiyacın var.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });
    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (!target.voice.serverMute) return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten susturulmamış.')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await target.voice.setMute(false, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: `${e.unmute} Ses Susturma Kaldırıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>`, inline: true },
        { name: '🔊 Kanal',     value: `${target.voice.channel}`, inline: true },
        { name: '👮 Yetkili',   value: message.author.tag, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
