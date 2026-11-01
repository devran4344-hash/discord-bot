// ╔══════════════════════════════════════════════════════════════════════╗
// ║         !emojiduzenle — Emoji adını değiştir                        ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'emojiduzenle',
  aliases: ['emojirename', 'emojiad', 'renameemoji'],
  description: 'Sunucudaki bir emojinin adını değiştirir.',
  usage: '!emojiduzenle <:emoji:id | isim | ID> <yeni-isim>',
  example: '!emojiduzenle :eski: yenikk',
  category: 'admin',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('emojiduzenle')
    .setDescription('Sunucudaki bir emojinin adını değiştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
    .addStringOption(o => o.setName('emoji').setDescription('<:emoji:id> | emoji adı | emoji ID').setRequired(true))
    .addStringOption(o => o.setName('yeni_isim').setDescription('Emojiye verilecek yeni ad').setRequired(true)),

  async executeSlash(interaction, client) {
    const query    = interaction.options.getString('emoji');
    const newName  = interaction.options.getString('yeni_isim').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
    if (newName.length < 2) return interaction.reply({ embeds: [errorEmbed('Yeni isim en az 2 karakter olmalı.')], flags: 64 });

    let emoji = null;
    const customMatch = query.match(/^<a?:([^:]+):(\d+)>$/);
    if (customMatch)   emoji = interaction.guild.emojis.cache.get(customMatch[2]);
    if (!emoji && /^\d{15,20}$/.test(query)) emoji = interaction.guild.emojis.cache.get(query);
    if (!emoji) { const name = query.replace(/:/g, '').trim(); emoji = interaction.guild.emojis.cache.find(em => em.name.toLowerCase() === name.toLowerCase()); }
    if (!emoji) return interaction.reply({ embeds: [errorEmbed('Emoji bulunamadı.')], flags: 64 });

    const oldName = emoji.name;
    try {
      await emoji.setName(newName, `${interaction.user.tag} tarafından yeniden adlandırıldı`);
      await interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✏️ Emoji Adı Değiştirildi')
        .setThumbnail(emoji.imageURL({ size: 256 }))
        .addFields(
          { name: '📝 Eski Ad', value: `\`:${oldName}:\``, inline: true },
          { name: '✏️ Yeni Ad', value: `\`:${newName}:\` ${emoji}`, inline: true },
          { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
          { name: '👮 Yapan', value: interaction.user.tag, inline: true },
          { name: '📅 Tarih', value: discordTimestamp(new Date(), 'R'), inline: true },
        ).setTimestamp()] });
      await sendLog(interaction.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✏️ Emoji Yeniden Adlandırıldı')
        .addFields(
          { name: '📝 Eski Ad', value: `\`:${oldName}:\``, inline: true },
          { name: '✏️ Yeni Ad', value: `\`:${newName}:\``, inline: true },
          { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
          { name: '👮 Yapan', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
        ).setTimestamp());
    } catch (err) {
      interaction.reply({ embeds: [errorEmbed(`İsim değiştirilemedi: \`${err.message}\``)], flags: 64 });
    }
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({ embeds: [errorEmbed('**Emoji ve Etiket Yönet** iznine ihtiyacın var.')] });
    }

    if (!args[0] || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Emoji ve yeni isim belirtmelisin.\n> **Kullanım:** `!emojiduzenle <:emoji:id | isim> <yeni-isim>`')] });
    }

    const query = args[0];
    let emoji   = null;

    const customMatch = query.match(/^<a?:([^:]+):(\d+)>$/);
    if (customMatch)   emoji = message.guild.emojis.cache.get(customMatch[2]);
    if (!emoji && /^\d{15,20}$/.test(query)) emoji = message.guild.emojis.cache.get(query);
    if (!emoji) {
      const name = query.replace(/:/g, '').trim();
      emoji = message.guild.emojis.cache.find(em => em.name.toLowerCase() === name.toLowerCase());
    }

    if (!emoji) return message.reply({ embeds: [errorEmbed(`\`${query}\` ile eşleşen emoji bulunamadı.`)] });

    const newName = args[1].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
    if (newName.length < 2) return message.reply({ embeds: [errorEmbed('Yeni isim en az 2 karakter olmalı.')] });

    const oldName = emoji.name;

    try {
      await emoji.setName(newName, `${message.author.tag} tarafından yeniden adlandırıldı`);

      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✏️ Emoji Adı Değiştirildi')
          .setThumbnail(emoji.imageURL({ size: 256 }))
          .addFields(
            { name: '📝 Eski Ad', value: `\`:${oldName}:\``,             inline: true },
            { name: '✏️ Yeni Ad', value: `\`:${newName}:\` ${emoji}`,    inline: true },
            { name: '🆔 ID',      value: `\`${emoji.id}\``,              inline: true },
            { name: '👮 Yapan',   value: message.author.tag,             inline: true },
            { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'R'), inline: true },
          )
          .setTimestamp()],
      });

      await sendLog(message.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✏️ Emoji Yeniden Adlandırıldı')
        .addFields(
          { name: '📝 Eski Ad', value: `\`:${oldName}:\``,              inline: true },
          { name: '✏️ Yeni Ad', value: `\`:${newName}:\``,              inline: true },
          { name: '🆔 ID',      value: `\`${emoji.id}\``,               inline: true },
          { name: '👮 Yapan',   value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
        )
        .setTimestamp());

    } catch (err) {
      message.reply({ embeds: [errorEmbed(`İsim değiştirilemedi: \`${err.message}\``)] });
    }
  },
};
