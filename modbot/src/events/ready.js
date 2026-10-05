const { EmbedBuilder, ActivityType } = require('discord.js');
const { discordTimestamp, formatNumber, formatDuration } = require('../utils/helpers');
const config  = require('../config');
const e       = require('../emojiConfig');
const chalk   = require('chalk');
const moment  = require('moment');

function loadArrayEvents(client) {
  const files = ['../events/channelEvents','../events/roleEvents','../events/guildUpdate','../events/reactionEvents'];
  for (const f of files) {
    try {
      const events = require(f);
      if (!Array.isArray(events)) continue;
      events.forEach(ev => {
        if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
        else         client.on(ev.name,   (...args) => ev.execute(...args, client));
      });
    } catch (_) {}
  }
}

module.exports = {
  name: 'clientReady',
  once: true,

  async execute(client) {
    loadArrayEvents(client);

    const memberCount  = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const guildCount   = client.guilds.cache.size;
    const channelCount = client.channels.cache.size;

    console.log(chalk.green('\n╔══════════════════════════════════════════╗'));
    console.log(chalk.green(`║  ✅  ${client.user.tag} HAZIR!`));
    console.log(chalk.green('╚══════════════════════════════════════════╝'));
    console.log(chalk.cyan(`  🏠 Sunucu:   ${guildCount}`));
    console.log(chalk.cyan(`  👥 Üye:      ${memberCount}`));
    console.log(chalk.cyan(`  📢 Kanal:    ${channelCount}`));
    console.log(chalk.cyan(`  📦 Komut:    ${client.commands.size}`));
    console.log(chalk.cyan(`  🕐 Tarih:    ${moment().format('DD.MM.YYYY HH:mm:ss')}\n`));

    const typeMap = { PLAYING: ActivityType.Playing, WATCHING: ActivityType.Watching, LISTENING: ActivityType.Listening, COMPETING: ActivityType.Competing };
    let statusIdx = 0;
    const updateStatus = () => {
      const s = config.statusMessages[statusIdx % config.statusMessages.length];
      const text = s.text.replace('{memberCount}', memberCount.toString()).replace('{serverCount}', guildCount.toString());
      client.user.setActivity(text, { type: typeMap[s.type] || ActivityType.Playing });
      statusIdx++;
    };
    updateStatus();
    setInterval(updateStatus, config.statusInterval * 60 * 1000);

    if (!config.logging.botStartup) return;

    const uptimeData  = client.uptimeData;
    const sessions    = uptimeData?.sessions || [];
    const prevSession = sessions.length >= 2 ? sessions[sessions.length - 2] : null;

    const startEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: `${client.user.username} — Çevrimiçi`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`${e.startup} Bot Başlatıldı`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`**${client.user.tag}** başarıyla başlatıldı ve tüm sistemler aktif!`)
      .addFields(
        { name: `${e.server} Sunucu`,      value: `\`${guildCount}\``,                              inline: true  },
        { name: `${e.member} Üye`,         value: `\`${formatNumber(memberCount)}\``,               inline: true  },
        { name: '📦 Komut',               value: `\`${client.commands.size}\``,                    inline: true  },
        { name: `${e.uptime} Başlangıç`,   value: discordTimestamp(client.sessionStart, 'F'),       inline: true  },
        { name: `${e.id} Oturum No`,       value: `\`#${sessions.length}\``,                       inline: true  },
        { name: '⚙️ Node.js',             value: `\`${process.version}\``,                        inline: true  },
        {
          name: `${e.shutdown} Son Kapanış`,
          value: prevSession?.endTime
            ? `${discordTimestamp(new Date(prevSession.endTime), 'F')}\n${prevSession.status === 'crash' ? `${e.crash} Beklenmedik kapanma` : `${e.success} Normal kapanma`}`
            : '`İlk oturum`',
          inline: false,
        },
        ...(prevSession?.uptime ? [{ name: `${e.uptime} Önceki Uptime`, value: `\`${prevSession.uptime}\``, inline: true }] : []),
      )
      .setFooter({ text: `ModBot v2 • Tüm sistemler aktif • ${moment().format('DD.MM.YYYY HH:mm')}` })
      .setTimestamp();

    client.guilds.cache.forEach(guild => {
      const ch = config.channels.botLog ? guild.channels.cache.get(config.channels.botLog) : null;
      if (ch) ch.send({ embeds: [startEmbed] }).catch(() => null);
    });
  },
};
