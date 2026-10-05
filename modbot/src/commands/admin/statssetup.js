const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'statssetup',
  aliases: ['statkanal', 'istatistikkanal', 'statscreate'],
  description: 'Otomatik güncellenen istatistik kanalları oluşturur.',
  usage: '!statssetup',
  category: 'admin',
  cooldown: 30000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const loadMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setColor(config.colors.info)
      .setDescription(`${e.loading} İstatistik kanalları oluşturuluyor...`)] });

    try {
      // Kategori oluştur
      const category = await message.guild.channels.create({
        name: '📊 Sunucu İstatistikleri',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: message.guild.roles.everyone, deny: ['Connect', 'SendMessages'] },
        ],
      });

      await message.guild.members.fetch().catch(() => null);
      const total   = message.guild.memberCount;
      const bots    = message.guild.members.cache.filter(m => m.user.bot).size;
      const humans  = total - bots;
      const channels = message.guild.channels.cache.filter(c => c.type === 0 || c.type === 2).size;
      const boosts   = message.guild.premiumSubscriptionCount || 0;

      // Kanalları oluştur
      const channelDefs = [
        { name: `👥 Toplam Üye: ${total}`,     key: 'totalMembersChannel' },
        { name: `👤 Üye: ${humans}`,            key: 'humansChannel' },
        { name: `🤖 Bot: ${bots}`,              key: 'botsChannel' },
        { name: `📢 Kanal: ${channels}`,        key: 'channelsChannel' },
        { name: `💎 Boost: ${boosts}`,          key: 'boostsChannel' },
      ];

      const created = [];
      for (const def of channelDefs) {
        const ch = await message.guild.channels.create({
          name:   def.name,
          type:   ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: [
            { id: message.guild.roles.everyone, deny: ['Connect'] },
          ],
        });
        created.push({ key: def.key, id: ch.id, name: def.name });
        await new Promise(r => setTimeout(r, 600));
      }

      // Config'e ID'leri bildir
      const configLines = created.map(c => `${c.key}: '${c.id}'`).join('\n');

      await loadMsg.edit({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${e.success} İstatistik Kanalları Oluşturuldu!`)
        .setDescription('Kanallar oluşturuldu ve otomatik güncellenecek (10 dakikada bir).')
        .addFields(
          { name: '📁 Kategori',    value: `${category}`,                    inline: true  },
          { name: '📊 Oluşturulan', value: `${created.length} kanal`,        inline: true  },
          { name: '⏰ Güncelleme',  value: 'Her 10 dakika',                  inline: true  },
          {
            name: '⚙️ config.js\'e Eklemesi Gereken',
            value: `\`\`\`js\nstatChannels: {\n  enabled: true,\n${configLines.split('\n').map(l => '  ' + l).join('\n')}\n}\`\`\``,
            inline: false,
          },
        )
        .setTimestamp()] });

    } catch (err) {
      await loadMsg.edit({ embeds: [errorEmbed(`Kanallar oluşturulamadı: \`${err.message}\``)] });
    }
  },
};
