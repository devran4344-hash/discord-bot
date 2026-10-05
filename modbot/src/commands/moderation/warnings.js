const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp, isModerator } = require('../../utils/helpers');
const { getWarnings } = require('../../utils/database');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'warnings',
  aliases: ['uyarılar', 'warns', 'warnlist'],
  description: 'Kullanıcının tüm uyarılarını sayfalı olarak gösterir.',
  usage: '!warnings [@üye | ID]',
  category: 'moderation',
  cooldown: 5000,

  async execute(message, args, client) {
    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target.id !== message.author.id && !isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Başkasının uyarılarını görmek için moderatör olman gerekiyor.')] });

    const warnings = await getWarnings(message.guild.id, target.id);
    const maxWarn  = Math.max(...Object.keys(config.warnings.thresholds).map(Number));
    const count    = warnings.length;
    const filled   = Math.min(Math.round((count / maxWarn) * 12), 12);
    const bar      = '█'.repeat(filled) + '░'.repeat(12 - filled);
    const barClr   = count === 0 ? e.success : count < 4 ? e.warning : count < 7 ? e.warn : e.error;

    if (count === 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: `${target.user.tag} — Uyarı Geçmişi`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
          .setDescription(`${e.success} **${target.user.tag}** kullanıcısının hiç uyarısı yok!`)
          .addFields({ name: `${e.strike} Durum`, value: `${e.success} \`░░░░░░░░░░░░\` 0/${maxWarn}`, inline: false })
          .setFooter({ text: `ID: ${target.id}` })
          .setTimestamp()],
      });
    }

    const PER = 5;
    let page  = 0;

    function buildEmbed(pg) {
      const start = pg * PER;
      const slice = warnings.slice(start, start + PER);
      const embed = new EmbedBuilder()
        .setColor(count >= 7 ? config.colors.error : count >= 4 ? config.colors.warning : config.colors.warn)
        .setAuthor({ name: `${target.user.tag} — Uyarı Geçmişi`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`${barClr} \`${bar}\` **${count}/${maxWarn}** uyarı`)
        .setFooter({ text: `Sayfa ${pg + 1}/${Math.ceil(warnings.length / PER)} • Toplam ${count} uyarı • ID: ${target.id}` })
        .setTimestamp();
      slice.forEach((w, i) => {
        embed.addFields({
          name: `${e.warnActive} Uyarı #${start + i + 1} — \`${w.id}\``,
          value: [
            `> 📋 **Sebep:** ${w.reason}`,
            `> 👮 **Yetkili:** ${w.moderatorTag}`,
            `> 📅 **Tarih:** ${discordTimestamp(new Date(w.timestamp), 'R')}`,
          ].join('\n'),
          inline: false,
        });
      });
      return embed;
    }

    function buildRow(pg) {
      const total = Math.ceil(warnings.length / PER);
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('warn_prev').setEmoji(e.prev).setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
        new ButtonBuilder().setCustomId('warn_page').setLabel(`${pg + 1}/${total}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('warn_next').setEmoji(e.next).setStyle(ButtonStyle.Secondary).setDisabled(pg >= Math.ceil(warnings.length / PER) - 1),
      );
    }

    const msg = await message.reply({ embeds: [buildEmbed(page)], components: warnings.length > PER ? [buildRow(page)] : [] });
    if (warnings.length <= PER) return;

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${e.error} Bu menü sana ait değil.`, flags: 64 });
      if (i.customId === 'warn_prev') page--;
      if (i.customId === 'warn_next') page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => null));
  },
};
