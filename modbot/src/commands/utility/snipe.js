const { EmbedBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'snipe',
  aliases: ['s', 'silinen'],
  description: 'Bu kanalda son silinen mesajı gösterir.',
  usage: '!snipe',
  category: 'utility',
  cooldown: 5000,

  async execute(message, args, client) {
    // messageDelete event modülünden snipe cache al
    let snipeData = null;
    try {
      const deleteEvent = require('../../events/messageDelete');
      snipeData = deleteEvent.getSnipe(message.channel.id);
    } catch {}

    if (!snipeData) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.ghost} Bu kanalda henüz silinen bir mesaj yok!\n> *(Veriler bot yeniden başlayınca sıfırlanır)*`)],
      });
    }

    const timeSince = Date.now() - snipeData.deletedAt;
    const seconds   = Math.floor(timeSince / 1000);

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: `${snipeData.authorTag} — Silinen Mesaj`, iconURL: snipeData.authorAvatar })
      .setDescription(snipeData.content || '*[Mesaj içeriği yok — muhtemelen embed veya dosyaydı]*')
      .addFields(
        { name: '👤 Gönderen',    value: `<@${snipeData.authorId}>`,                          inline: true },
        { name: '📍 Kanal',       value: `${message.channel}`,                                inline: true },
        { name: '⏰ Ne zaman',     value: `\`${seconds}sn önce\` — ${discordTimestamp(new Date(snipeData.timestamp), 'T')}`, inline: true },
        ...(snipeData.attachments?.length > 0 ? [{
          name:   '📎 Ekler',
          value:  snipeData.attachments.map(a => `[${a.name}](${a.url})`).join('\n'),
          inline: false,
        }] : []),
        ...(snipeData.embeds > 0 ? [{
          name:  '📦 Embed',
          value: `${snipeData.embeds} embed içeriyordu`,
          inline: true,
        }] : []),
      )
      .setFooter({ text: `Sniped by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
