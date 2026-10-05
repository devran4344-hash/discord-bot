const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'takerole',
  aliases: ['rolkaldır', 'removerole', 'rolsil'],
  description: 'Kullanıcıdan rol alır.',
  usage: '!takerole <@üye | ID> <@rol | ID | isim>',
  category: 'admin',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [errorEmbed('**Rolleri Yönet** iznine ihtiyacın var.')] });

    if (!args[0] || !args[1])
      return message.reply({ embeds: [errorEmbed('Kullanıcı ve rol belirtmelisin.\n> **Kullanım:** `!takerole <@üye | ID> <@rol | ID | isim>`')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    let role = message.mentions.roles.first();
    if (!role) {
      const q = args.slice(1).join(' ').replace(/[<@&>]/g, '');
      role = message.guild.roles.cache.get(q) ||
             message.guild.roles.cache.find(r => r.name.toLowerCase() === q.toLowerCase()) ||
             message.guild.roles.cache.find(r => r.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (!role) return message.reply({ embeds: [errorEmbed('Rol bulunamadı.')] });
    if (!target.roles.cache.has(role.id))
      return message.reply({ embeds: [errorEmbed(`**${target.user.tag}** bu rolde zaten yok.`)] });
    if (role.position >= message.guild.members.me.roles.highest.position)
      return message.reply({ embeds: [errorEmbed('Bu rolü alamam, benim rolümden yüksek veya eşit.')] });

    await target.roles.remove(role, `${message.author.tag} tarafından alındı`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: '❌ Rol Alındı', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: true },
        { name: '🎭 Rol',       value: `\`${role.name}\` \`(${role.id})\``,  inline: true },
        { name: '👮 Yetkili',   value: message.author.tag,                   inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),    inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'roleLog', new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('❌ Rol Alındı')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.user.tag}\`\n\`${target.id}\``, inline: true },
        { name: '🎭 Rol',       value: `\`${role.name}\`\n\`${role.id}\``,                          inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``,           inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'F'),                            inline: true },
      )
      .setTimestamp());
  },
};
