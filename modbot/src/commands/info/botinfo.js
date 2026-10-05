const { EmbedBuilder } = require('discord.js');
const { formatDuration, formatNumber, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const os     = require('os');

module.exports = {
  name: 'botinfo',
  aliases: ['bot', 'about', 'hakkında', 'info'],
  description: 'Bot hakkında detaylı bilgi ve istatistik gösterir.',
  usage: '!botinfo',
  category: 'info',
  cooldown: 10000,

  async execute(message, args, client) {
    const memMB      = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const totalMemMB = (os.totalmem() / 1024 / 1024).toFixed(0);
    const uptimeData = client.uptimeData;
    const sessions   = uptimeData?.sessions || [];
    const prevSess   = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
    const guildCount = client.guilds.cache.size;
    const memberCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `${client.user.username} — Bot Bilgisi`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: '⏰ Çalışma Durumu',
          value: [
            `> 🟢 **Durum:** Çevrimiçi`,
            `> 📅 **Başlangıç:** ${discordTimestamp(client.sessionStart, 'R')}`,
            `> ⏱️ **Uptime:** \`${formatDuration(client.uptime)}\``,
            `> 🔢 **Oturum No:** \`#${sessions.length}\``,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📊 İstatistikler',
          value: [
            `> 🏠 **Sunucu:** \`${formatNumber(guildCount)}\``,
            `> 👥 **Üye:** \`${formatNumber(memberCount)}\``,
            `> 📦 **Komut:** \`${client.commands.size}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '⚙️ Teknik',
          value: [
            `> 🟩 **Node.js:** \`${process.version}\``,
            `> 💜 **Discord.js:** \`v${require('discord.js').version}\``,
            `> 💾 **RAM:** \`${memMB} MB\``,
            `> 🖥️ **Platform:** \`${process.platform}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔴 Son Kapanış',
          value: prevSess?.endTime
            ? [
                `> 📅 **Tarih:** ${discordTimestamp(new Date(prevSess.endTime), 'R')}`,
                `> ⏱️ **Önceki Uptime:** \`${prevSess.uptime || 'Bilinmiyor'}\``,
                `> ${prevSess.status === 'crash' ? '💥 **Beklenmedik kapanma**' : '✅ **Normal kapanma**'}`,
              ].join('\n')
            : '> `Kayıt yok (ilk oturum)`',
          inline: false,
        },
        { name: '🆔 Bot ID', value: `\`${client.user.id}\``, inline: true },
        { name: '👑 Sahibi', value: `<@${config.ownerID}>`,  inline: true },
      )
      .setFooter({ text: `ModBot v2 • Kapsamlı Discord Moderasyon Botu` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
