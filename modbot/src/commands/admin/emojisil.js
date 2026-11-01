// ╔══════════════════════════════════════════════════════════════════════╗
// ║         !emojisil — Sunucudan emoji sil                             ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'emojisil',
  aliases: ['emojidelete', 'removeemoji', 'delemo'],
  description: 'Sunucudan emoji siler.',
  usage: '!emojisil <:emoji:id | isim | ID>',
  example: '!emojisil :mutlu:',
  category: 'admin',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('emojisil')
    .setDescription('Sunucudan emoji siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
    .addStringOption(o => o.setName('emoji').setDescription('<:emoji:id> | emoji adı | emoji ID').setRequired(true)),

  async executeSlash(interaction, client) {
    const query = interaction.options.getString('emoji');
    let emoji = null;

    const customMatch = query.match(/^<a?:([^:]+):(\d+)>$/);
    if (customMatch) emoji = interaction.guild.emojis.cache.get(customMatch[2]);
    if (!emoji && /^\d{15,20}$/.test(query)) emoji = interaction.guild.emojis.cache.get(query);
    if (!emoji) { const name = query.replace(/:/g, '').trim(); emoji = interaction.guild.emojis.cache.find(em => em.name === name || em.name.toLowerCase() === name.toLowerCase()); }

    if (!emoji) return interaction.reply({ embeds: [errorEmbed('Emoji bulunamadı.')], flags: 64 });

    const confirmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🗑️ Emoji Silme — Onay')
      .setThumbnail(emoji.imageURL({ size: 256 }))
      .setDescription(`**${emoji.name}** emojisini silmek üzeresin.\n\nBu işlem **geri alınamaz!**`)
      .addFields(
        { name: '🏷️ İsim', value: `${emoji} \`:${emoji.name}:\``, inline: true },
        { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
        { name: '✨ Animasyonlu', value: emoji.animated ? '✅ GIF' : '❌', inline: true },
      ).setFooter({ text: '30 saniye içinde onayla veya iptal et.' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('emo_del_confirm').setLabel('Evet, Sil').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('emo_del_cancel').setLabel('İptal').setEmoji('❌').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], flags: 64 });
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000, max: 1 });
    collector.on('collect', async i => {
      if (i.customId === 'emo_del_cancel') {
        return i.update({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('❌ Silme işlemi iptal edildi.')], components: [] });
      }
      if (i.customId === 'emo_del_confirm') {
        const emojiName = emoji.name, emojiId = emoji.id, emojiURL = emoji.imageURL({ size: 128 });
        try {
          await emoji.delete(`${interaction.user.tag} tarafından silindi`);
          await i.update({ embeds: [new EmbedBuilder()
            .setColor(config.colors.success)
            .setAuthor({ name: 'Emoji Silindi!', iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setThumbnail(emojiURL)
            .addFields(
              { name: '🏷️ Silinen Emoji', value: `\`:${emojiName}:\``, inline: true },
              { name: '🆔 ID', value: `\`${emojiId}\``, inline: true },
              { name: '👮 Silen', value: interaction.user.tag, inline: true },
              { name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true },
              { name: '📊 Kalan Emoji', value: `\`${interaction.guild.emojis.cache.size}\``, inline: true },
            ).setTimestamp()], components: [] });
          await sendLog(interaction.guild, 'serverLog', new EmbedBuilder()
            .setColor(config.colors.error).setTitle('🗑️ Emoji Silindi').setThumbnail(emojiURL)
            .addFields(
              { name: '🏷️ İsim', value: `\`:${emojiName}:\``, inline: true },
              { name: '🆔 ID', value: `\`${emojiId}\``, inline: true },
              { name: '👮 Silen', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
              { name: '📅 Tarih', value: discordTimestamp(new Date(), 'F'), inline: true },
            ).setTimestamp());
        } catch (err) {
          await i.update({ embeds: [errorEmbed(`Emoji silinemedi: \`${err.message}\``)], components: [] });
        }
      }
    });
    collector.on('end', collected => { if (collected.size === 0) interaction.editReply({ components: [] }).catch(() => null); });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({ embeds: [errorEmbed('**Emoji ve Etiket Yönet** iznine ihtiyacın var.')] });
    }

    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Silinecek emojiyi belirt.\n> **Kullanım:** `!emojisil <:emoji:id | isim | ID>`')] });
    }

    const query = args[0];
    let emoji   = null;

    // <:name:id> veya <a:name:id> formatı
    const customMatch = query.match(/^<a?:([^:]+):(\d+)>$/);
    if (customMatch) {
      emoji = message.guild.emojis.cache.get(customMatch[2]);
    }

    // Sadece ID
    if (!emoji && /^\d{15,20}$/.test(query)) {
      emoji = message.guild.emojis.cache.get(query);
    }

    // İsim ile ara (:mutlu: veya mutlu)
    if (!emoji) {
      const name = query.replace(/:/g, '').trim();
      emoji = message.guild.emojis.cache.find(em => em.name === name || em.name.toLowerCase() === name.toLowerCase());
    }

    if (!emoji) {
      return message.reply({ embeds: [errorEmbed(`\`${query}\` ile eşleşen emoji bulunamadı.\n> Emoji adı veya ID'sini doğru girdiğinden emin ol.`)] });
    }

    // Onay embed
    const confirmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🗑️ Emoji Silme — Onay')
      .setThumbnail(emoji.imageURL({ size: 256 }))
      .setDescription(`**${emoji.name}** emojisini silmek üzeresin.\n\nBu işlem **geri alınamaz!**`)
      .addFields(
        { name: '🏷️ İsim',       value: `${emoji} \`:${emoji.name}:\``,  inline: true },
        { name: '🆔 ID',          value: `\`${emoji.id}\``,               inline: true },
        { name: '✨ Animasyonlu', value: emoji.animated ? '✅ GIF' : '❌', inline: true },
      )
      .setFooter({ text: '30 saniye içinde onayla veya iptal et.' })
      .setTimestamp();

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('emo_del_confirm').setLabel('Evet, Sil').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('emo_del_cancel').setLabel('İptal').setEmoji('❌').setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 30000,
      max: 1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'emo_del_cancel') {
        return interaction.update({
          embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('❌ Silme işlemi iptal edildi.')],
          components: [],
        });
      }

      if (interaction.customId === 'emo_del_confirm') {
        // Emoji bilgilerini sakla (silindikten sonra erişilemez)
        const emojiName     = emoji.name;
        const emojiId       = emoji.id;
        const emojiAnimated = emoji.animated;
        const emojiURL      = emoji.imageURL({ size: 128 });

        try {
          await emoji.delete(`${message.author.tag} tarafından silindi`);

          await interaction.update({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.success)
              .setAuthor({ name: 'Emoji Silindi!', iconURL: message.guild.iconURL({ dynamic: true }) })
              .setThumbnail(emojiURL)
              .addFields(
                { name: '🏷️ Silinen Emoji', value: `\`:${emojiName}:\``,                         inline: true },
                { name: '🆔 ID',            value: `\`${emojiId}\``,                              inline: true },
                { name: '✨ GIF',           value: emojiAnimated ? '✅' : '❌',                  inline: true },
                { name: '👮 Silen',         value: message.author.tag,                            inline: true },
                { name: '📅 Tarih',         value: discordTimestamp(new Date(), 'R'),             inline: true },
                { name: '📊 Kalan Emoji',   value: `\`${message.guild.emojis.cache.size}\``,      inline: true },
              )
              .setTimestamp()],
            components: [],
          });

          await sendLog(message.guild, 'serverLog', new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('🗑️ Emoji Silindi')
            .setThumbnail(emojiURL)
            .addFields(
              { name: '🏷️ İsim',    value: `\`:${emojiName}:\``,                              inline: true },
              { name: '🆔 ID',      value: `\`${emojiId}\``,                                   inline: true },
              { name: '👮 Silen',   value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
              { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'F'),                  inline: true },
            )
            .setTimestamp());

        } catch (err) {
          await interaction.update({
            embeds: [errorEmbed(`Emoji silinemedi: \`${err.message}\``)],
            components: [],
          });
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
