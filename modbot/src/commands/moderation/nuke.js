const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'nuke',
  aliases: ['kanaltemizle', 'channelwipe', 'nüke'],
  description: 'Kanalı klonlayıp siler — tüm mesajlar anında temizlenir.',
  usage: '!nuke [#kanal] [sebep]',
  example: '!nuke #spam-kanal Temizlik',
  category: 'moderation',
  cooldown: 30000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const targetChannel = message.mentions.channels.first() || message.channel;
    const reason        = args.filter(a => !a.startsWith('<#')).join(' ') || 'Sebep belirtilmedi';

    // Onay butonu
    const confirmEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('💣 NUKE — Onay Gerekiyor!')
      .setDescription(
        `${targetChannel} kanalındaki **TÜM MESAJLAR** silinecek!\n\n` +
        `> ⚠️ Bu işlem **geri alınamaz**!\n` +
        `> Kanal klonlanıp yeniden oluşturulacak.\n` +
        `> Devam etmek istiyor musun?`,
      )
      .addFields(
        { name: '📍 Kanal',   value: `${targetChannel}`,             inline: true },
        { name: '📋 Sebep',   value: reason,                          inline: true },
        { name: '👮 Yetkili', value: message.author.tag,             inline: true },
        { name: '⏰ Süre',    value: '30 saniye içinde onayla',       inline: true },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nuke_confirm').setLabel('EVET, NUKE!').setEmoji('💣').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('nuke_cancel').setLabel('İptal').setEmoji('❌').setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time:   30000,
      max:    1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'nuke_cancel') {
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('❌ Nuke iptal edildi.')],
          components: [],
        });
        return;
      }

      if (interaction.customId === 'nuke_confirm') {
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('💣 Nuke başlatılıyor...')],
          components: [],
        });

        try {
          // Kanal pozisyonu ve ayarlarını al
          const position    = targetChannel.position;
          const parent      = targetChannel.parent;
          const permissions = targetChannel.permissionOverwrites.cache;

          // Yeni kanalı oluştur (aynı yere)
          const newChannel = await targetChannel.clone({
            name:   targetChannel.name,
            reason: `NUKE — ${message.author.tag} | ${reason}`,
          });

          // Pozisyonu geri yükle
          await newChannel.setPosition(position).catch(() => null);

          // Eski kanalı sil
          await targetChannel.delete(`NUKE — ${message.author.tag} | ${reason}`);

          // Yeni kanala bildirim
          const nukeEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('💣 Kanal Nuke\'landı!')
            .setDescription('Bu kanal **nuke** edildi ve tüm mesajlar silindi.')
            .setImage('https://media.giphy.com/media/XUFPGrX5Zis6Y/giphy.gif')
            .addFields(
              { name: '👮 Yapan',   value: `${message.author.tag}`, inline: true },
              { name: '📋 Sebep',   value: reason,                   inline: true },
              { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'F'), inline: true },
            )
            .setTimestamp();

          const nukeMsg = await newChannel.send({ embeds: [nukeEmbed] });
          setTimeout(() => nukeMsg.delete().catch(() => null), 10000);

          // Log
          await sendLog(message.guild, 'modLog', new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`💣 Kanal Nuke'landı`)
            .addFields(
              { name: '📍 Eski Kanal',  value: `\`#${targetChannel.name}\` \`(${targetChannel.id})\``, inline: true  },
              { name: '📍 Yeni Kanal',  value: `${newChannel} \`(${newChannel.id})\``,                  inline: true  },
              { name: '👮 Yetkili',     value: `${message.author.tag}\n\`${message.author.id}\``,        inline: true  },
              { name: '📋 Sebep',       value: reason,                                                   inline: false },
              { name: '📅 Tarih',       value: discordTimestamp(new Date(), 'F'),                        inline: true  },
            )
            .setTimestamp());

        } catch (err) {
          await message.channel.send({ embeds: [errorEmbed(`Nuke başarısız: \`${err.message}\``)] }).catch(() => null);
        }
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        confirmMsg.edit({ components: [] }).catch(() => null);
      }
    });
  },
};
