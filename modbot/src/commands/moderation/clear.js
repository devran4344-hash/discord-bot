const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'clear',
  aliases: ['temizle', 'purge', 'sil'],
  description: 'Belirtilen sayıda mesajı toplu siler. İsteğe bağlı olarak belirli üyeye ait mesajları filtreler.',
  usage: '!clear <1-500> [@üye] [--bots] [--links]',
  example: '!clear 50 @Kullanıcı',
  category: 'moderation',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [errorEmbed('**Mesajları Yönet** iznine ihtiyacın var.')] });

    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 500)
      return message.reply({ embeds: [errorEmbed('**1** ile **500** arasında bir sayı belirt.')] });

    // Filtre argümanları
    const filterUser  = args.find(a => a.match(/^<@!?\d+>$/)) ? await findMember(message.guild, args.find(a => a.match(/^<@!?\d+>$/))) : null;
    const filterBots  = args.includes('--bots');
    const filterLinks = args.includes('--links');

    await message.delete().catch(() => null);

    try {
      let fetched = await message.channel.messages.fetch({ limit: Math.min(amount + 5, 100) });

      // 14 günden eski mesajları çıkar
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      let toDelete = fetched.filter(m => m.createdTimestamp > twoWeeksAgo);

      // Filtreler
      if (filterUser)  toDelete = toDelete.filter(m => m.author.id === filterUser.id);
      if (filterBots)  toDelete = toDelete.filter(m => m.author.bot);
      if (filterLinks) toDelete = toDelete.filter(m => /(https?:\/\/|discord\.gg)/i.test(m.content));

      if (toDelete.size > amount) toDelete = new Map([...toDelete].slice(0, amount));

      if (toDelete.size === 0) {
        return message.channel.send({ embeds: [errorEmbed('Silinebilecek mesaj bulunamadı.\n> (14 günden eski mesajlar bulk delete ile silinemez)')] })
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      const deleted = await message.channel.bulkDelete(toDelete, true);

      // Silinenlerin istatistikleri
      const uniqueUsers = new Set(deleted.map(m => m.author.id)).size;
      const botCount    = deleted.filter(m => m.author.bot).size;
      const imgCount    = deleted.filter(m => m.attachments.size > 0).size;

      const notif = await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: '🗑️ Mesajlar Temizlendi', iconURL: message.guild.iconURL({ dynamic: true }) })
          .setDescription(`Başarıyla **${deleted.size}** mesaj silindi.`)
          .addFields(
            { name: '🗑️ Silinen',      value: `**${deleted.size}** mesaj`,      inline: true },
            { name: '👥 Farklı Üye',   value: `**${uniqueUsers}** kişi`,        inline: true },
            { name: '🤖 Bot Mesajı',   value: `**${botCount}**`,                inline: true },
            { name: '🖼️ Medya',        value: `**${imgCount}** dosya`,          inline: true },
            { name: '👮 Yetkili',      value: message.author.tag,               inline: true },
            ...(filterUser ? [{ name: '🎯 Filtre',  value: filterUser.user.tag, inline: true }] : []),
          )
          .setFooter({ text: 'Bu mesaj 5 saniye sonra silinecek.' })
          .setTimestamp()],
      });
      setTimeout(() => notif.delete().catch(() => null), 5000);

      // Log
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.modlog)
        .setTitle('🗑️ Toplu Mesaj Silme')
        .addFields(
          { name: '🗑️ Silinen',    value: `**${deleted.size}** mesaj`,                        inline: true  },
          { name: '👮 Yetkili',    value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true  },
          { name: '📍 Kanal',      value: `${message.channel}`,                                inline: true  },
          { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'F'),                   inline: true  },
          { name: '👥 Farklı Üye', value: `${uniqueUsers}`,                                    inline: true  },
          ...(filterUser ? [{ name: '🎯 Filtre', value: filterUser.user.tag, inline: true }] : []),
        )
        .setTimestamp();
      await sendLog(message.guild, 'messageLog', logEmbed);

    } catch (err) {
      message.channel.send({ embeds: [errorEmbed(`Silme başarısız: \`${err.message}\``)] })
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }
  },
};
