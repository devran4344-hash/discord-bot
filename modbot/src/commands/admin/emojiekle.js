// ╔══════════════════════════════════════════════════════════════════════╗
// ║         !emojiekle — Sunucuya emoji ekle                            ║
// ║  URL'den, dosyadan veya başka bir emojiden kopyala                 ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp, sendLog } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'emojiekle',
  aliases: ['emojiadd', 'addemo', 'emojiupload'],
  description: 'Sunucuya emoji ekler. URL, dosya veya başka emoji kopyalayabilirsin.',
  usage: '!emojiekle <isim> <url | dosya-ekle | <:emoji:id>>',
  example: '!emojiekle mutlu https://i.imgur.com/xxx.png',
  category: 'admin',
  cooldown: 5000,

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({ embeds: [errorEmbed('**Emoji ve Etiket Yönet** iznine ihtiyacın var.')] });
    }

    if (!args[0]) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('😀 Emoji Ekleme — Kullanım')
          .addFields(
            { name: '🔗 URL\'den Ekle',       value: '`!emojiekle <isim> <resim-url>`',           inline: false },
            { name: '📁 Dosyadan Ekle',        value: '`!emojiekle <isim>` + resim dosyası ekle',  inline: false },
            { name: '😀 Emojiden Kopyala',     value: '`!emojiekle <isim> <:emojiadı:emojiID>`',  inline: false },
          )
          .setFooter({ text: 'İsim sadece harf, rakam ve _ içerebilir (maks 32 karakter)' })],
      });
    }

    const emojiName = args[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);

    if (emojiName.length < 2) {
      return message.reply({ embeds: [errorEmbed('Emoji ismi en az **2 karakter** olmalı ve harf/rakam/_  içermeli.')] });
    }

    // İsim çakışması kontrolü
    const existing = message.guild.emojis.cache.find(em => em.name === emojiName);
    if (existing) {
      return message.reply({ embeds: [errorEmbed(`\`${emojiName}\` isimli bir emoji zaten var: ${existing}`)] });
    }

    let emojiImage = null;

    // ── 1. Dosya eki ────────────────────────────────────────────────
    const attachment = message.attachments.first();
    if (attachment) {
      if (!attachment.contentType?.startsWith('image/')) {
        return message.reply({ embeds: [errorEmbed('Sadece resim dosyaları desteklenir (PNG, JPG, GIF).')] });
      }
      emojiImage = attachment.url;
    }

    // ── 2. Başka bir emoji ─────────────────────────────────────────
    if (!emojiImage && args[1]) {
      const emojiMatch = args[1].match(/^<(a?):([^:]+):(\d+)>$/);
      if (emojiMatch) {
        const animated = emojiMatch[1] === 'a';
        const id       = emojiMatch[3];
        emojiImage     = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
      }
    }

    // ── 3. URL ─────────────────────────────────────────────────────
    if (!emojiImage && args[1]) {
      const urlMatch = args[1].match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
      if (urlMatch) {
        emojiImage = args[1];
      } else {
        return message.reply({ embeds: [errorEmbed('Geçerli bir resim URL\'si, dosya ekle veya emoji belirt.')] });
      }
    }

    if (!emojiImage) {
      return message.reply({ embeds: [errorEmbed('Resim kaynağı belirtmelisin. URL, dosya ekle veya bir emoji belirt.')] });
    }

    // Emoji limiti kontrolü
    const maxEmojis = message.guild.premiumTier === 3 ? 500 :
                      message.guild.premiumTier === 2 ? 300 :
                      message.guild.premiumTier === 1 ? 200 : 100;
    const currentCount = message.guild.emojis.cache.size;

    if (currentCount >= maxEmojis) {
      return message.reply({ embeds: [errorEmbed(`Sunucu emoji limiti doldu! (\`${currentCount}/${maxEmojis}\`)\nBoost seviyesi artırarak limit yükseltilebilir.`)] });
    }

    const loadMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription(`⏳ **${emojiName}** emojisi ekleniyor...`)],
    });

    try {
      const newEmoji = await message.guild.emojis.create({
        attachment: emojiImage,
        name:       emojiName,
        reason:     `${message.author.tag} tarafından eklendi`,
      });

      await loadMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: 'Emoji Eklendi!', iconURL: message.guild.iconURL({ dynamic: true }) })
          .setDescription(`${newEmoji} Emoji başarıyla eklendi!`)
          .setThumbnail(newEmoji.imageURL({ size: 256 }))
          .addFields(
            { name: '🏷️ İsim',          value: `\`:${newEmoji.name}:\``,                         inline: true },
            { name: '🆔 ID',             value: `\`${newEmoji.id}\``,                              inline: true },
            { name: '✨ Animasyonlu',    value: newEmoji.animated ? '✅ Evet (GIF)' : '❌ Hayır', inline: true },
            { name: '📋 Kullanım Kodu', value: `\`${newEmoji.animated ? `<a:${newEmoji.name}:${newEmoji.id}>` : `<:${newEmoji.name}:${newEmoji.id}>`}\``, inline: false },
            { name: '👮 Ekleyen',        value: message.author.tag,                                inline: true },
            { name: '📅 Tarih',          value: discordTimestamp(new Date(), 'R'),                 inline: true },
            { name: '📊 Sunucu Emojileri', value: `\`${message.guild.emojis.cache.size}/${maxEmojis}\``, inline: true },
          )
          .setTimestamp()],
      });

      // Log
      await sendLog(message.guild, 'serverLog', new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('😀 Emoji Eklendi')
        .setThumbnail(newEmoji.imageURL({ size: 128 }))
        .addFields(
          { name: '🏷️ İsim',    value: `${newEmoji} \`:${newEmoji.name}:\``,                inline: true },
          { name: '🆔 ID',      value: `\`${newEmoji.id}\``,                                 inline: true },
          { name: '✨ GIF',     value: newEmoji.animated ? '✅' : '❌',                     inline: true },
          { name: '👮 Ekleyen', value: `${message.author.tag}\n\`${message.author.id}\``,   inline: true },
          { name: '📅 Tarih',   value: discordTimestamp(new Date(), 'F'),                    inline: true },
        )
        .setTimestamp());

    } catch (err) {
      await loadMsg.edit({
        embeds: [errorEmbed(
          `Emoji eklenemedi: \`${err.message}\`\n\n` +
          `> Olası sebepler:\n` +
          `> • Dosya boyutu 256KB\'dan büyük\n` +
          `> • Geçersiz resim formatı\n` +
          `> • URL erişilemiyor\n` +
          `> • Emoji limiti dolu`,
        )],
      });
    }
  },
};
