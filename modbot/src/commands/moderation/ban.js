const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, findUser, canModerate, errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'ban',
  aliases: ['yasakla', 'engelle'],
  description: 'Bir kullanıcıyı sunucudan kalıcı olarak yasaklar.',
  usage: '!ban <@kullanıcı | ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir kullanıcıyı sunucudan kalıcı olarak yasaklar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('kullanıcı').setDescription('Yasaklanacak kullanıcı').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('kullanıcı');
    const reason     = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    const target     = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (target && !canModerate(interaction.member, target))
      return interaction.reply({ embeds: [errorEmbed('Bu kullanıcıyı banlayamazsın!')], flags: 64 });
    await interaction.guild.bans.create(targetUser.id, { reason: `${interaction.user.tag} | ${reason}`, deleteMessageSeconds: 7 * 24 * 3600 });
    await interaction.reply({ content: `🔨 **${targetUser.tag}** yasaklandı. Sebep: ${reason}` });
    await addModAction(interaction.guild.id, targetUser.id, { type: 'ban', reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için **Üyeleri Engelle** iznine ihtiyacın var.')] });

    if (!args[0])
      return message.reply({ embeds: [errorEmbed(`Bir kullanıcı belirtmelisin.\n> **Kullanım:** \`!ban <@kullanıcı | ID> [sebep]\``)] });

    let target     = await findMember(message.guild, args[0]);
    let targetUser = target?.user || await findUser(client, args[0]);

    if (!targetUser) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target && !canModerate(message.member, target))
      return message.reply({ embeds: [errorEmbed('Bu kullanıcıyı banlayamazsın! Rolü senden yüksek veya eşit.')] });
    if (target?.id === client.user.id)
      return message.reply({ embeds: [errorEmbed('Kendimi banlayamam! 😅')] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [errorEmbed('Benim **Üyeleri Engelle** iznim yok!')] });

    const reason     = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const fullReason = `${message.author.tag} | ${reason}`;

    if (target) {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.ban)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTitle(`${e.ban} ${message.guild.name} Sunucusundan Yasaklandın`)
        .addFields(
          { name: '📋 Sebep',    value: `\`\`\`${reason}\`\`\``, inline: false },
          { name: '👮 Yetkili',  value: message.author.tag,       inline: true  },
          { name: '📅 Tarih',    value: discordTimestamp(new Date(), 'F'), inline: true },
        )
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    await message.guild.bans.create(targetUser.id, { reason: fullReason, deleteMessageSeconds: 7 * 24 * 3600 })
      .catch(err => { message.reply({ embeds: [errorEmbed(`Ban başarısız: \`${err.message}\``)] }); return null; });

    // Ban başarısız olursa devam etme
    const banCheck = await message.guild.bans.fetch(targetUser.id).catch(() => null);
    if (!banCheck) return;

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.ban)
      .setAuthor({ name: `${e.ban} Kullanıcı Yasaklandı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(`**${targetUser.tag}** başarıyla yasaklandı.`)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${targetUser.id}> \`(${targetUser.id})\``, inline: false },
        { name: '📋 Sebep',     value: reason,                                        inline: false },
        { name: '👮 Yetkili',   value: message.author.tag,                            inline: true  },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),             inline: true  },
        { name: '🗑️ Mesajlar', value: 'Son 7 günlük mesajlar silindi',               inline: true  },
      )
      .setFooter({ text: `${e.shield} ${message.guild.name}` })
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, targetUser.id, { type: 'ban', reason, moderatorId: message.author.id, moderatorTag: message.author.tag });

    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.ban, title: 'Kullanıcı Yasaklandı', color: config.colors.ban,
      target:   { tag: targetUser.tag, id: targetUser.id },
      executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      extra: [
        { name: '📍 Kanal', value: `${message.channel}`, inline: true },
        { name: '🗑️ Silinen', value: 'Son 7 gün mesaj', inline: true },
      ],
    }));
  },
};
