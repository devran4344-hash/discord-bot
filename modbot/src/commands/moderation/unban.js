const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, modLogEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const { addModAction } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'unban',
  aliases: ['yasakkaldır', 'bankal'],
  description: 'Yasaklı bir kullanıcının yasağını kaldırır.',
  usage: '!unban <ID> [sebep]',
  category: 'moderation',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [errorEmbed('**Üyeleri Engelle** iznine ihtiyacın var.')] });
    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Bir ID belirtmelisin.\n> **Kullanım:** `!unban <ID> [sebep]`')] });

    const userId  = args[0].replace(/[<@!>]/g, '');
    const banEntry = await message.guild.bans.fetch(userId).catch(() => null);
    if (!banEntry) return message.reply({ embeds: [errorEmbed('Bu kullanıcı yasaklı değil.')] });

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await message.guild.bans.remove(userId, `${message.author.tag} | ${reason}`)
      .catch(err => { return message.reply({ embeds: [errorEmbed(`Unban başarısız: \`${err.message}\``)] }); });

    const targetUser = banEntry.user;
    const successEmbed = new EmbedBuilder()
      .setColor(config.colors.unban)
      .setAuthor({ name: `${e.unban} Yasak Kaldırıldı`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı',        value: `${targetUser.tag} \`(${targetUser.id})\``, inline: false },
        { name: '📋 Sebep',            value: reason,                                      inline: false },
        { name: '📋 Eski Ban Sebebi',  value: banEntry.reason || 'Bilinmiyor',            inline: false },
        { name: '👮 Yetkili',          value: message.author.tag,                          inline: true  },
        { name: '📅 Tarih',            value: discordTimestamp(new Date(), 'R'),           inline: true  },
      )
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
    await addModAction(message.guild.id, targetUser.id, { type: 'unban', reason, moderatorId: message.author.id, moderatorTag: message.author.tag });
    await sendLog(message.guild, 'modLog', modLogEmbed({
      emoji: e.unban, title: 'Yasak Kaldırıldı', color: config.colors.unban,
      target: { tag: targetUser.tag, id: targetUser.id }, executor: { tag: message.author.tag, id: message.author.id },
      reason, thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      extra: [{ name: '📋 Eski Ban Sebebi', value: banEntry.reason || 'Bilinmiyor', inline: false }],
    }));
  },
};
