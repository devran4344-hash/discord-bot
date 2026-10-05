const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, isModerator, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'banlist',
  aliases: ['banliste', 'yasakkiler', 'bans'],
  description: 'Sunucunun ban listesini sayfalı olarak gösterir.',
  usage: '!banlist',
  category: 'moderation',
  cooldown: 10000,

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için moderatör olman gerekiyor.')] });

    await message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription(`${e.loading} Ban listesi yükleniyor...`)] })
      .then(async loadMsg => {
        let bans;
        try {
          bans = [...(await message.guild.bans.fetch()).values()];
        } catch {
          return loadMsg.edit({ embeds: [errorEmbed('Ban listesi alınamadı. Bot yeterli izne sahip olmayabilir.')] });
        }

        if (bans.length === 0) {
          return loadMsg.edit({ embeds: [new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`${e.success} Bu sunucuda hiç yasaklı kullanıcı yok!`)] });
        }

        const PER  = 10;
        let page   = 0;
        const total = Math.ceil(bans.length / PER);

        function buildEmbed(pg) {
          const start = pg * PER;
          const slice = bans.slice(start, start + PER);

          return new EmbedBuilder()
            .setColor(config.colors.ban)
            .setAuthor({ name: `${message.guild.name} — Ban Listesi`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setDescription(
              slice.map((ban, i) =>
                `\`${start + i + 1}.\` **${ban.user.tag}** \`(${ban.user.id})\`\n` +
                `> 📋 ${ban.reason ? ban.reason.slice(0, 60) : 'Sebep belirtilmedi'}`,
              ).join('\n\n'),
            )
            .setFooter({ text: `Sayfa ${pg + 1}/${total} • Toplam ${bans.length} yasaklı üye` })
            .setTimestamp();
        }

        function buildRow(pg) {
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bl_first').setEmoji(e.first || '⏮️').setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
            new ButtonBuilder().setCustomId('bl_prev').setEmoji(e.prev || '◀️').setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
            new ButtonBuilder().setCustomId('bl_page').setLabel(`${pg + 1}/${total}`).setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('bl_next').setEmoji(e.next || '▶️').setStyle(ButtonStyle.Secondary).setDisabled(pg >= total - 1),
            new ButtonBuilder().setCustomId('bl_last').setEmoji(e.last || '⏭️').setStyle(ButtonStyle.Secondary).setDisabled(pg >= total - 1),
          );
        }

        await loadMsg.edit({ embeds: [buildEmbed(page)], components: total > 1 ? [buildRow(page)] : [] });

        if (total <= 1) return;

        const collector = loadMsg.createMessageComponentCollector({ time: 120000 });
        collector.on('collect', async i => {
          if (i.user.id !== message.author.id) return i.reply({ content: `${e.error} Bu menü sana ait değil.`, flags: 64 });
          if (i.customId === 'bl_first') page = 0;
          if (i.customId === 'bl_prev')  page = Math.max(0, page - 1);
          if (i.customId === 'bl_next')  page = Math.min(total - 1, page + 1);
          if (i.customId === 'bl_last')  page = total - 1;
          await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
        });
        collector.on('end', () => loadMsg.edit({ components: [] }).catch(() => null));
      });
  },
};
