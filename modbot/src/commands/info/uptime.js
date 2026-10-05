const { EmbedBuilder } = require('discord.js');
const { formatDuration, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'uptime',
  aliases: ['süre', 'çalışmasüresi', 'oturumlar'],
  description: 'Botun çalışma süresini ve geçmiş oturumları gösterir.',
  usage: '!uptime',
  category: 'info',
  cooldown: 10000,

  async execute(message, args, client) {
    const uptimeData = client.uptimeData;
    const sessions   = uptimeData?.sessions || [];
    const recent     = sessions.slice(-6).reverse();

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: `${client.user.username} — Çalışma Süresi`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .addFields({
        name: '🟢 Mevcut Oturum',
        value: [
          `> 📅 **Başlangıç:** ${discordTimestamp(client.sessionStart, 'F')}`,
          `> ⏱️ **Süre:** \`${formatDuration(client.uptime)}\``,
          `> 🔢 **Oturum No:** \`#${sessions.length}\``,
          `> ✅ **Durum:** Çevrimiçi`,
        ].join('\n'),
        inline: false,
      })
      .setFooter({ text: `Toplam ${sessions.length} oturum kaydı` })
      .setTimestamp();

    // Önceki oturumlar
    const prev = recent.slice(1, 6);
    if (prev.length > 0) {
      const sessionLines = prev.map(s => {
        const icon      = s.status === 'crash' ? '💥' : '🟢';
        const startTime = s.startTime ? discordTimestamp(new Date(s.startTime), 'R') : '?';
        const uptime    = s.uptime || 'Bilinmiyor';
        const status    = s.status === 'crash' ? 'Çöktü' : 'Normal';
        return `> ${icon} **#${s.id}** — ${startTime} — \`${uptime}\` — ${status}`;
      }).join('\n');

      embed.addFields({
        name: '📋 Son Oturumlar',
        value: sessionLines,
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
