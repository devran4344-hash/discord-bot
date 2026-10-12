const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'editsnipe',
  aliases: ['es', 'esnipe', 'düzenlenensnipe'],
  description: 'Bu kanalda son düzenlenen mesajı gösterir.',
  usage: '!editsnipe',
  category: 'utility',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('editsnipe')
    .setDescription('Bu kanalda son düzenlenen mesajı gösterir.'),

  async executeSlash(interaction, client) {
    const snipe = client._editSnipeCache?.get(interaction.channel.id);
    if (!snipe) return interaction.reply({ embeds: [errorEmbed('Bu kanalda edit snipe yok.')], flags: 64 });
    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setAuthor({ name: snipe.author?.tag || 'Bilinmeyen', iconURL: snipe.author?.displayAvatarURL?.({ dynamic: true }) })
      .addFields(
        { name: '📝 Önceki', value: snipe.oldContent?.slice(0, 1024) || '*[yok]*', inline: false },
        { name: '✏️ Yeni',   value: snipe.newContent?.slice(0, 1024) || '*[yok]*', inline: false },
      ).setTimestamp(snipe.editedAt);
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    let snipeData = null;
    try {
      const updateEvent = require('../../events/messageUpdate');
      snipeData = updateEvent.getEditSnipe(message.channel.id);
    } catch {}

    if (!snipeData) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.messageEdit || '📝'} Bu kanalda henüz düzenlenen mesaj yok!`)],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setAuthor({ name: `${snipeData.authorTag} — Düzenlenen Mesaj`, iconURL: snipeData.authorAvatar })
      .addFields(
        { name: '📝 Önceki İçerik', value: snipeData.oldContent.slice(0, 500) || '*[Boş]*', inline: false },
        { name: '✏️ Yeni İçerik',   value: snipeData.newContent.slice(0, 500) || '*[Boş]*', inline: false },
        { name: '👤 Kişi',          value: `<@${snipeData.authorId}>`,                       inline: true  },
        { name: '📍 Kanal',         value: `${message.channel}`,                             inline: true  },
        { name: '⏰ Düzenlenme',     value: discordTimestamp(new Date(snipeData.editedAt), 'R'), inline: true },
        { name: '🔗 Mesaj',          value: `[Git](${snipeData.messageUrl})`,                inline: true  },
      )
      .setFooter({ text: `Sniped by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
