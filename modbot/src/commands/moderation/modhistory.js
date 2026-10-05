const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp, isModerator } = require('../../utils/helpers');
const { getModHistory } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

const ACTION_EMOJI = {
  ban: () => e.ban,    unban: () => e.unban,
  kick: () => e.kick,  mute: () => e.mute,
  unmute: () => e.unmute, warn: () => e.warn,
  timeout: () => e.timeout,
};

module.exports = {
  name: 'modhistory',
  aliases: ['modgeçmişi', 'mh', 'history', 'geçmiş'],
  description: 'Kullanıcının moderasyon geçmişini sayfalı olarak gösterir.',
  usage: '!modhistory [@üye | ID]',
  category: 'moderation',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Moderatör olman gerekiyor.')] });

    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const history = await getModHistory(message.guild.id, target.id);
    if (history.length === 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: `${target.user.tag} — Mod Geçmişi`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
          .setDescription(`${e.success} Bu kullanıcının moderasyon geçmişi temiz!`)
          .setFooter({ text: `ID: ${target.id}` })
          .setTimestamp()],
      });
    }

    const PER = 6;
    let page  = 0;

    function buildEmbed(pg) {
      const start = pg * PER;
      const slice = [...history].reverse().slice(start, start + PER);
      const embed = new EmbedBuilder()
        .setColor(config.colors.modlog)
        .setAuthor({ name: `${target.user.tag} — Mod Geçmişi`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`Toplam **${history.length}** moderasyon kaydı`)
        .setFooter({ text: `Sayfa ${pg + 1}/${Math.ceil(history.length / PER)} • ID: ${target.id}` })
        .setTimestamp();
      slice.forEach(entry => {
        const emoji = (ACTION_EMOJI[entry.type] || (() => e.warn))();
        embed.addFields({
          name: `${emoji} ${entry.type.toUpperCase()} — ${discordTimestamp(new Date(entry.timestamp), 'R')}`,
          value: [
            `> 📋 **Sebep:** ${entry.reason || 'Belirtilmedi'}`,
            `> 👮 **Yetkili:** ${entry.moderatorTag}`,
          ].join('\n'),
          inline: false,
        });
      });
      return embed;
    }

    function buildRow(pg) {
      const total = Math.ceil(history.length / PER);
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mh_prev').setEmoji(e.prev).setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
        new ButtonBuilder().setCustomId('mh_page').setLabel(`${pg + 1}/${total}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('mh_next').setEmoji(e.next).setStyle(ButtonStyle.Secondary).setDisabled(pg >= Math.ceil(history.length / PER) - 1),
      );
    }

    const total = Math.ceil(history.length / PER);
    const msg = await message.reply({ embeds: [buildEmbed(page)], components: total > 1 ? [buildRow(page)] : [] });
    if (total <= 1) return;

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${e.error} Bu menü sana ait değil.`, flags: 64 });
      if (i.customId === 'mh_prev') page--;
      if (i.customId === 'mh_next') page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => null));
  },
};
