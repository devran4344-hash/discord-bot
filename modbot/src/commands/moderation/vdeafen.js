const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, canModerate, errorEmbed, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'vdeafen',
  aliases: ['sassağırlaştır', 'voicedeafen', 'sağırlaştır'],
  description: 'Ses kanalındaki kullanıcıyı sağırlaştırır.',
  usage: '!vdeafen <@üye | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('vdeafen')
    .setDescription('Ses kanalındaki kullanıcıyı sağırlaştırır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers)
    .addUserOption(o => o.setName('üye').setDescription('Sağırlaştırılacak üye').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('Üye ses kanalında değil.')], flags: 64 });
    await target.voice.setDeaf(true, interaction.options.getString('sebep') || 'Sebep yok');
    await interaction.reply({ content: `🔕 **${target.user.tag}** sağırlaştırıldı.` });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Sağırlaştır** iznine ihtiyacın var.')] });
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Kullanıcı belirtmelisin.')] });
    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Bu kullanıcı bir ses kanalında değil.')] });
    if (target.voice.serverDeaf) return message.reply({ embeds: [errorEmbed('Bu kullanıcı zaten sağırlaştırılmış.')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await target.voice.setDeaf(true, `${message.author.tag} | ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.mute)
      .setAuthor({ name: '🔕 Ses Kanalında Sağırlaştırıldı', iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>`,           inline: true },
        { name: '🔊 Kanal',     value: `${target.voice.channel}`,   inline: true },
        { name: '📋 Sebep',     value: reason,                       inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,           inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'voiceLog', modLogEmbed({
      emoji: '🔕', title: 'Ses Kanalında Sağırlaştırıldı', color: config.colors.mute,
      target: { tag: target.user.tag, id: target.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, extra: [{ name: '🔊 Kanal', value: `${target.voice.channel}`, inline: true }],
    }));
  },
};
