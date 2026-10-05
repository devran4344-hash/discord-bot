const { EmbedBuilder } = require('discord.js');
const { discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'ping',
  aliases: ['gecikme', 'latency', 'ms'],
  description: 'Botun gecikme ve API ping değerlerini gösterir.',
  usage: '!ping',
  category: 'info',
  cooldown: 5000,

  async execute(message, args, client) {
    const sent    = await message.reply({ content: '⏳ Ölçülüyor...' });
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const api     = Math.round(client.ws.ping);

    const getColor  = ms => ms < 100 ? config.colors.success : ms < 250 ? config.colors.warning : config.colors.error;
    const getBar    = ms => {
      const bars = ms < 80 ? 10 : ms < 150 ? 8 : ms < 250 ? 5 : ms < 400 ? 3 : 1;
      return '█'.repeat(bars) + '░'.repeat(10 - bars);
    };
    const getStatus = ms => ms < 100 ? '🟢 Mükemmel' : ms < 250 ? '🟡 İyi' : '🔴 Kötü';

    const embed = new EmbedBuilder()
      .setColor(getColor(api))
      .setAuthor({ name: '🏓 Pong!', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .addFields(
        {
          name: '📡 Bot Gecikmesi',
          value: `\`${getBar(latency)}\`\n**${latency}ms** — ${getStatus(latency)}`,
          inline: true,
        },
        {
          name: '🌐 API Gecikmesi',
          value: `\`${getBar(api)}\`\n**${api}ms** — ${getStatus(api)}`,
          inline: true,
        },
        {
          name: '⏰ Uptime',
          value: `${discordTimestamp(new Date(Date.now() - client.uptime), 'R')}`,
          inline: true,
        },
      )
      .setFooter({ text: `Discord.js v${require('discord.js').version} • Node.js ${process.version}` })
      .setTimestamp();

    await sent.edit({ content: null, embeds: [embed] });
  },
};
