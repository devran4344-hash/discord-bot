const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { findMember, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'pfp', 'profil', 'pp'],
  description: 'Kullanıcının profil fotoğrafını gösterir. Global ve sunucu avatarı ayrı ayrı gösterilir.',
  usage: '!avatar [@üye | ID]',
  category: 'info',
  cooldown: 5000,

  async execute(message, args, client) {
    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const user         = target.user;
    const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
    const serverAvatar = target.displayAvatarURL({ dynamic: true, size: 4096 });
    const hasServer    = globalAvatar !== serverAvatar;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `${user.tag} — Avatar`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setImage(serverAvatar)
      .setFooter({ text: `ID: ${user.id}${hasServer ? ' • Sunucu avatarı gösteriliyor' : ''}` })
      .setTimestamp();

    if (hasServer) {
      embed.setDescription(`**Sunucu Avatarı** gösteriliyor.\n[Global Avatar](${globalAvatar}) • [Sunucu Avatarı](${serverAvatar})`);
    } else {
      embed.setDescription(`[Tam Boyutta Aç](${globalAvatar})`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(serverAvatar.replace(/\.webp|\.gif/, '.png').split('?')[0] + '?size=4096'),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(serverAvatar.replace(/\.webp|\.gif/, '.jpg').split('?')[0] + '?size=4096'),
      ...(hasServer ? [
        new ButtonBuilder()
          .setLabel('Global Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar),
      ] : []),
    );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
