const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'roleall',
  aliases: ['herkese-rol', 'massrole', 'toplurol'],
  description: 'Tüm üyelere veya tüm botlara rol ekler/kaldırır.',
  usage: '!roleall <ekle|kaldır> <@rol | ID> [--botlar]',
  example: '!roleall ekle @Üye',
  category: 'admin',
  cooldown: 10000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [errorEmbed('**Rolleri Yönet** iznine ihtiyacın var.')] });

    const action = args[0]?.toLowerCase();
    if (!action || !['ekle', 'kaldır', 'ekle', 'kaldir'].includes(action))
      return message.reply({ embeds: [errorEmbed('İşlem türünü belirt: `ekle` veya `kaldır`\n> **Kullanım:** `!roleall <ekle|kaldır> <@rol | ID> [--botlar]`')] });

    const isAdd     = action === 'ekle';
    const onlyBots  = args.includes('--botlar');

    let role = message.mentions.roles.first();
    if (!role) {
      const q = args[1]?.replace(/[<@&>]/g, '');
      if (q) role = message.guild.roles.cache.get(q) || message.guild.roles.cache.find(r => r.name.toLowerCase() === q.toLowerCase());
    }
    if (!role) return message.reply({ embeds: [errorEmbed('Geçerli bir rol belirt.')] });
    if (role.managed) return message.reply({ embeds: [errorEmbed('Yönetilen rollere toplu işlem yapılamaz.')] });
    if (role.position >= message.guild.members.me.roles.highest.position)
      return message.reply({ embeds: [errorEmbed('Bu rol benim en yüksek rolümden yüksek, işlem yapamam.')] });

    await message.guild.members.fetch();

    let members = message.guild.members.cache.filter(m => !m.user.bot);
    if (onlyBots) members = message.guild.members.cache.filter(m => m.user.bot);

    const progressMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`⏳ **${members.size}** üyeye rol ${isAdd ? 'veriliyor' : 'kaldırılıyor'}... Bu işlem biraz sürebilir.`)
        .setFooter({ text: 'Lütfen bekleyin...' })],
    });

    let success = 0, failed = 0;

    for (const [, member] of members) {
      try {
        if (isAdd && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => { failed++; return; });
          success++;
        } else if (!isAdd && member.roles.cache.has(role.id)) {
          await member.roles.remove(role).catch(() => { failed++; return; });
          success++;
        }
        // Rate limit önleme
        await new Promise(r => setTimeout(r, 300));
      } catch { failed++; }
    }

    await progressMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(success > 0 ? config.colors.success : config.colors.error)
        .setAuthor({ name: `🎭 Toplu Rol ${isAdd ? 'Ekleme' : 'Kaldırma'} Tamamlandı`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .addFields(
          { name: '🎭 Rol',         value: `${role} \`(${role.id})\``,                      inline: true  },
          { name: '⚡ İşlem',       value: isAdd ? '✅ Eklendi' : '❌ Kaldırıldı',          inline: true  },
          { name: '👥 Hedef',       value: onlyBots ? '🤖 Botlar' : '👤 Üyeler',           inline: true  },
          { name: '✅ Başarılı',    value: `\`${success}\``,                                 inline: true  },
          { name: '❌ Başarısız',   value: `\`${failed}\``,                                  inline: true  },
          { name: '👮 Yetkili',     value: message.author.tag,                               inline: true  },
          { name: '📅 Tarih',       value: discordTimestamp(new Date(), 'R'),                inline: true  },
        )
        .setTimestamp()],
    });

    await sendLog(message.guild, 'roleLog', new EmbedBuilder()
      .setColor(config.colors.modlog)
      .setTitle(`🎭 Toplu Rol ${isAdd ? 'Ekleme' : 'Kaldırma'}`)
      .addFields(
        { name: '🎭 Rol',       value: `\`${role.name}\``,                                inline: true },
        { name: '✅ Başarılı',  value: `\`${success}\``,                                  inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
      )
      .setTimestamp());
  },
};
