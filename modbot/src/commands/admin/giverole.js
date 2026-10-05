const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, sendLog, discordTimestamp, getDangerousPermissions } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'giverole',
  aliases: ['rolekle', 'addrole', 'roleekle'],
  description: 'Kullanıcıya rol verir.',
  usage: '!giverole <@üye | ID> <@rol | ID | isim>',
  example: '!giverole @Kullanıcı @Moderatör',
  category: 'admin',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [errorEmbed('**Rolleri Yönet** iznine ihtiyacın var.')] });

    if (!args[0] || !args[1])
      return message.reply({ embeds: [errorEmbed('Kullanıcı ve rol belirtmelisin.\n> **Kullanım:** `!giverole <@üye | ID> <@rol | ID | isim>`')] });

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
    if (role.managed) return message.reply({ embeds: [errorEmbed('Bu rol bir bot/entegrasyon tarafından yönetiliyor, veremem.')] });
    if (role.position >= message.guild.members.me.roles.highest.position)
      return message.reply({ embeds: [errorEmbed('Bu rolü veremem, benim rolümden yüksek veya eşit.')] });
    if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply({ embeds: [errorEmbed('Bu rolü veremezsin, rolün bu rolden düşük.')] });
    if (target.roles.cache.has(role.id))
      return message.reply({ embeds: [errorEmbed(`**${target.user.tag}** zaten **${role.name}** rolüne sahip.`)] });

    await target.roles.add(role, `${message.author.tag} tarafından verildi`);

    const dangerous = getDangerousPermissions(role.permissions);

    const embed = new EmbedBuilder()
      .setColor(dangerous.length > 0 ? config.colors.warning : config.colors.success)
      .setAuthor({ name: '✅ Rol Verildi', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``,       inline: true },
        { name: '🎭 Rol',       value: `${role} \`(${role.id})\``,                  inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}`,                     inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),            inline: true },
        ...(dangerous.length > 0 ? [{
          name: '🚨 TEHLİKELİ İZİN UYARISI',
          value: `\`\`\`${dangerous.map(p => `• ${p}`).join('\n')}\`\`\``,
          inline: false,
        }] : []),
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    await sendLog(message.guild, 'roleLog', new EmbedBuilder()
      .setColor(dangerous.length > 0 ? config.colors.error : config.colors.success)
      .setTitle('✅ Rol Verildi')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.user.tag}\`\n\`${target.id}\``, inline: true },
        { name: '🎭 Rol',       value: `${role}\n\`${role.id}\``,                                   inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``,           inline: true },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'F'),                            inline: true },
        ...(dangerous.length > 0 ? [{ name: '🚨 Tehlikeli İzinler', value: dangerous.join('\n'), inline: false }] : []),
      )
      .setTimestamp());
  },
};
