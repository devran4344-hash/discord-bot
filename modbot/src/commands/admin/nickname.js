const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'nickname',
  aliases: ['nick', 'takmadad', 'ad'],
  description: 'Bir üyenin takma adını değiştirir veya kaldırır.',
  usage: '!nickname <@üye | ID> <yeni ad | sıfırla>',
  example: '!nickname @Kullanıcı YeniAd',
  category: 'admin',
  cooldown: 3000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
      return message.reply({ embeds: [errorEmbed('**Takma Adları Yönet** iznine ihtiyacın var.')] });

    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Bir kullanıcı belirtmelisin.\n> **Kullanım:** `!nickname <@üye | ID> <yeni ad | sıfırla>`')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    if (target.id === message.guild.ownerId && message.author.id !== message.guild.ownerId)
      return message.reply({ embeds: [errorEmbed('Sunucu sahibinin takma adını değiştiremezsin.')] });

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply({ embeds: [errorEmbed('Bu kullanıcının takma adını değiştiremezsin, rolü senden yüksek.')] });

    const resetWords = ['sıfırla', 'kaldır', 'reset', 'remove', 'clear'];
    const newNick    = args.slice(1).join(' ');
    const isReset    = !newNick || resetWords.includes(newNick.toLowerCase());
    const oldNick    = target.nickname;

    await target.setNickname(isReset ? null : newNick, `${message.author.tag} tarafından değiştirildi`)
      .catch(err => { return message.reply({ embeds: [errorEmbed(`Takma ad değiştirilemedi: \`${err.message}\``)] }); });

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setAuthor({ name: '✏️ Takma Ad Değiştirildi', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}> \`(${target.id})\``, inline: false },
        { name: '📝 Eski Ad',   value: `\`${oldNick || 'Yok'}\``,             inline: true  },
        { name: '✏️ Yeni Ad',   value: `\`${isReset ? 'Kaldırıldı' : newNick}\``, inline: true },
        { name: '👮 Yetkili',   value: message.author.tag,                    inline: true  },
        { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),     inline: true  },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'memberLog', new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('✏️ Takma Ad Değiştirildi')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.user.tag}\``,           inline: true },
        { name: '📝 Eski',      value: `\`${oldNick || 'Yok'}\``,                           inline: true },
        { name: '✏️ Yeni',      value: `\`${isReset ? 'Kaldırıldı' : newNick}\``,           inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true },
      )
      .setTimestamp());
  },
};
