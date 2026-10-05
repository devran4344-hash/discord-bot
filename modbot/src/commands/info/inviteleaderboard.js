const { EmbedBuilder } = require('discord.js');
const { errorEmbed, formatNumber } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

function readDB(name) {
  const fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '../../../data', `${name}.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

module.exports = {
  name: 'inviteleaderboard',
  aliases: ['invitelb', 'davetliste', 'toplaminvite'],
  description: 'Sunucunun davet sıralamasını gösterir.',
  usage: '!inviteleaderboard',
  category: 'info',
  cooldown: 10000,

  async execute(message, args, client) {
    const all = readDB('invites');
    const guildData = all[message.guild.id] || {};

    if (Object.keys(guildData).length === 0) {
      return message.reply({ embeds: [errorEmbed('Henüz davet verisi yok.')] });
    }

    // Sıralama (gerçek davetlere göre)
    const sorted = Object.entries(guildData)
      .map(([userId, stats]) => ({
        userId,
        total: stats.total || 0,
        left:  stats.left  || 0,
        real:  Math.max(0, (stats.total || 0) - (stats.left || 0) - (stats.fake || 0)),
      }))
      .sort((a, b) => b.real - a.real)
      .slice(0, 15);

    const medals = ['🥇', '🥈', '🥉'];
    const lines  = sorted.map((entry, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${entry.userId}> — \`${entry.real}\` gerçek (\`${entry.total}\` toplam, \`${entry.left}\` ayrıldı)`;
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setAuthor({ name: `${message.guild.name} — Davet Sıralaması`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription(lines.join('\n') || 'Veri yok.')
      .setFooter({ text: `Toplam ${Object.keys(guildData).length} davetçi` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
