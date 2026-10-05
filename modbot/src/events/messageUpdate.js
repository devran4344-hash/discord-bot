// ╔══════════════════════════════════════════════════════════════════════╗
// ║    EVENT: messageUpdate — Düzenleme Log + EditSnipe Cache           ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

// EditSnipe cache — kanal başına son düzenlenen mesaj
const editSnipeCache = new Map();

module.exports = {
  name: 'messageUpdate',
  once: false,

  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (!newMessage.author) return;
    if (oldMessage.content === newMessage.content) return;

    // EditSnipe cache kaydet
    editSnipeCache.set(newMessage.channel.id, {
      oldContent:  oldMessage.content || '',
      newContent:  newMessage.content || '',
      authorId:    newMessage.author.id,
      authorTag:   newMessage.author.tag,
      authorAvatar: newMessage.author.displayAvatarURL({ dynamic: true }),
      messageUrl:  newMessage.url,
      editedAt:    Date.now(),
    });

    if (!config.logging.messageEdit) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setAuthor({ name: `${newMessage.author.tag} — Mesaj Düzenlendi`, iconURL: newMessage.author.displayAvatarURL({ dynamic: true }) })
      .setURL(newMessage.url)
      .addFields(
        { name: '👤 Kullanıcı',  value: `<@${newMessage.author.id}>\n\`${newMessage.author.id}\``, inline: true },
        { name: '📍 Kanal',      value: `${newMessage.channel}`,                                    inline: true },
        { name: '🔗 Git',        value: `[Mesaja Atla](${newMessage.url})`,                         inline: true },
        { name: '📝 Önceki',     value: (oldMessage.content || '*[Boş]*').slice(0, 500),            inline: false },
        { name: '✏️ Yeni',       value: (newMessage.content || '*[Boş]*').slice(0, 500),            inline: false },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'R'),                          inline: true },
        { name: '🆔 ID',         value: `\`${newMessage.id}\``,                                    inline: true },
      )
      .setFooter({ text: `Kullanıcı ID: ${newMessage.author.id}` })
      .setTimestamp();

    await sendLog(newMessage.guild, 'messageLog', embed);
  },

  getEditSnipe: (channelId) => editSnipeCache.get(channelId) || null,
  editSnipeCache,
};
