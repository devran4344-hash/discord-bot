const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'lockdown',
  aliases: ['sunucukilit', 'serverlock'],
  description: 'Sunucudaki tüm metin kanallarını kilitler veya kilidini açar.',
  usage: '!lockdown <kapat|aç> [sebep]',
  example: '!lockdown kapat Raid oluyor',
  category: 'admin',
  cooldown: 10000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const mode = args[0]?.toLowerCase();
    if (!mode || !['kapat', 'ac', 'aç', 'open', 'close'].includes(mode))
      return message.reply({ embeds: [errorEmbed('Mod belirt: `kapat` veya `aç`\n> **Kullanım:** `!lockdown <kapat|aç> [sebep]`')] });

    const isLocking = ['kapat', 'close'].includes(mode);
    const reason    = args.slice(1).join(' ') || (isLocking ? 'Güvenlik önlemi' : 'Kilit kaldırıldı');

    const textChannels = message.guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText &&
      c.id !== config.channels.botLog &&
      c.permissionsFor(message.guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages) !== undefined
    );

    const progressMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`⏳ ${isLocking ? '🔒 Sunucu kilitleniyor...' : '🔓 Kilit kaldırılıyor...'} (${textChannels.size} kanal)`)],
    });

    let done = 0;
    for (const [, channel] of textChannels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: isLocking ? false : null,
        }, { reason: `${message.author.tag} | ${reason}` });
        done++;
        await new Promise(r => setTimeout(r, 200));
      } catch {}
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(isLocking ? config.colors.error : config.colors.success)
      .setAuthor({
        name: isLocking ? '🔒 Sunucu Kilitlendi' : '🔓 Kilit Kaldırıldı',
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        isLocking
          ? `⚠️ **${message.guild.name}** sunucusu kilitlendi!\nHiç kimse mesaj gönderemiyor.`
          : `✅ **${message.guild.name}** sunucusunun kilidi açıldı!\nÜyeler tekrar mesaj gönderebilir.`
      )
      .addFields(
        { name: '📢 Kilitlenen Kanal', value: `\`${done}\` / \`${textChannels.size}\``, inline: true },
        { name: '👮 Yetkili',          value: message.author.tag,                        inline: true },
        { name: '📋 Sebep',            value: reason,                                    inline: false },
        { name: '📅 Tarih',            value: discordTimestamp(new Date(), 'R'),         inline: true },
      )
      .setTimestamp();

    await progressMsg.edit({ embeds: [resultEmbed] });

    // Kanallara bildirim
    message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(isLocking ? config.colors.error : config.colors.success)
        .setDescription(
          isLocking
            ? `🔒 **Sunucu kilitleme modu aktif!**\n> Sebep: ${reason}\n> Yetkili: ${message.author.tag}`
            : `🔓 **Sunucu kilidi kaldırıldı!**\n> Sebep: ${reason}\n> Yetkili: ${message.author.tag}`
        )
        .setTimestamp()],
    }).catch(() => null);

    await sendLog(message.guild, 'serverLog', new EmbedBuilder()
      .setColor(isLocking ? config.colors.error : config.colors.success)
      .setTitle(isLocking ? '🔒 Sunucu Kilitlendi' : '🔓 Sunucu Kilidi Açıldı')
      .addFields(
        { name: '📢 Etkilenen',  value: `\`${done}\` kanal`,                               inline: true },
        { name: '👮 Yetkili',    value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
        { name: '📋 Sebep',      value: reason,                                             inline: false },
        { name: '📅 Tarih',      value: discordTimestamp(new Date(), 'F'),                  inline: true },
      )
      .setTimestamp());
  },
};
