const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp } = require('../../utils/helpers');
const { getInviterStats, getMemberInviter } = require('../../systems/inviteTracker');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'invites',
  aliases: ['davetler', 'invite', 'davet'],
  description: 'Kullanıcının davet istatistiklerini gösterir.',
  usage: '!invites [@üye | ID]',
  category: 'info',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Kullanıcının davet istatistiklerini gösterir.')
    .addUserOption(o => o.setName('üye').setDescription('Üye').setRequired(false)),

  async executeSlash(interaction, client) {
    const user   = interaction.options.getUser('üye') || interaction.user;
    const target = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    const stats = getInviterStats(interaction.guild.id, target.id);
    const real  = (stats.total || 0) - (stats.left || 0) - (stats.fake || 0);
    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setAuthor({ name: `${user.tag} — Davet İstatistikleri`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .addFields(
        { name: '✅ Gerçek',   value: `\`${real}\``,          inline: true },
        { name: '📤 Toplam',   value: `\`${stats.total||0}\``, inline: true },
        { name: '🚪 Ayrılan',  value: `\`${stats.left||0}\``,  inline: true },
        { name: '🤖 Sahte',    value: `\`${stats.fake||0}\``,  inline: true },
      ).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const stats = getInviterStats(message.guild.id, target.id);
    const real  = stats.total - stats.left - stats.fake;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `${target.user.tag} — Davet İstatistikleri`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '📊 Genel Bakış',
          value: [
            `> 📨 **Toplam Davet:** \`${stats.total}\``,
            `> ✅ **Gerçek (Aktif):** \`${real < 0 ? 0 : real}\``,
            `> 👋 **Ayrılan:** \`${stats.left}\``,
            `> ❌ **Sahte/Bot:** \`${stats.fake}\``,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `ID: ${target.id} • ${message.guild.name}` })
      .setTimestamp();

    // Son davet ettiği üyeler (max 5)
    if (stats.members?.length > 0) {
      const recent = stats.members.slice(-5).reverse();
      embed.addFields({
        name: '👥 Son Davet Edilenler',
        value: recent.map(m => `> <@${m.id}> — ${discordTimestamp(new Date(m.joinedAt), 'R')}`).join('\n'),
        inline: false,
      });
    }

    // Kim tarafından davet edildi?
    const inviterInfo = getMemberInviter(message.guild.id, target.id);
    if (inviterInfo) {
      embed.addFields({
        name: '📥 Davet Eden',
        value: [
          `> 👤 <@${inviterInfo.inviterId}> (${inviterInfo.inviterTag})`,
          `> 🔗 Kod: \`${inviterInfo.code}\``,
          `> 📅 Katılış: ${discordTimestamp(new Date(inviterInfo.joinedAt), 'R')}`,
        ].join('\n'),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
