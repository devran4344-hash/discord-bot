const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'emojiinfo',
  aliases: ['emojibilgi', 'emojidetay'],
  description: 'Bir emoji hakkında detaylı bilgi gösterir.',
  usage: '!emojiinfo <:emoji:id | isim | ID>',
  category: 'info',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('emojiinfo')
    .setDescription('Bir emoji hakkında bilgi gösterir.')
    .addStringOption(o => o.setName('emoji').setDescription(':emoji: veya emoji ID\'si').setRequired(true)),

  async executeSlash(interaction, client) {
    const query = interaction.options.getString('emoji');
    const match = query.match(/^<(a?):(\w+):(\d+)>$/);
    let emoji;
    if (match) emoji = interaction.guild.emojis.cache.get(match[3]);
    else emoji = interaction.guild.emojis.cache.find(e => e.name === query || e.id === query);
    if (!emoji) return interaction.reply({ embeds: [errorEmbed('Emoji bulunamadı.')], flags: 64 });
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${emoji.animated ? '🎥' : '🖼️'} ${emoji.name}`)
      .setThumbnail(emoji.imageURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: '🆔 ID',        value: `\`${emoji.id}\``,                               inline: true },
        { name: '📛 İsim',      value: `\`${emoji.name}\``,                             inline: true },
        { name: '🎥 Animasyonlu', value: emoji.animated ? 'Evet' : 'Hayır',             inline: true },
        { name: '📅 Eklenme',   value: discordTimestamp(emoji.createdAt, 'R'),           inline: true },
        { name: '🔗 URL',       value: `[Aç](${emoji.imageURL({ dynamic: true, size: 512 })})`, inline: true },
        { name: '💬 Kullanım',  value: `\`<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>\``, inline: false },
      ).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Bir emoji belirt.')] });
    const query = args[0];
    let emoji   = null;

    // <:name:id> veya <a:name:id>
    const customMatch = query.match(/^<(a?):([^:]+):(\d+)>$/);
    if (customMatch) {
      // Önce sunucuda ara
      emoji = message.guild.emojis.cache.get(customMatch[3]);
      // Sunucuda yoksa dev portal'da ara
      if (!emoji) {
        const devEmojis = await client.application?.emojis.fetch().catch(() => null);
        emoji = devEmojis?.get(customMatch[3]);
      }
    }

    if (!emoji && /^\d{15,20}$/.test(query)) {
      emoji = message.guild.emojis.cache.get(query);
    }

    if (!emoji) {
      const name = query.replace(/:/g, '').trim().toLowerCase();
      emoji = message.guild.emojis.cache.find(em => em.name.toLowerCase() === name);
    }

    if (!emoji) return message.reply({ embeds: [errorEmbed(`\`${query}\` ile eşleşen emoji bulunamadı.`)] });

    const imageURL  = emoji.imageURL({ size: 4096 });
    const usage     = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
    const source    = emoji.guild ? (emoji.guild.id === message.guild.id ? '🏠 Bu Sunucu' : '🌐 Başka Sunucu') : '🤖 Dev Portal';
    const ageMs     = Date.now() - emoji.createdTimestamp;
    const ageDays   = Math.floor(ageMs / 86400000);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `${emoji.name} — Emoji Bilgisi`, iconURL: imageURL })
      .setThumbnail(imageURL)
      .addFields(
        { name: '🏷️ İsim',           value: `\`:${emoji.name}:\``,                       inline: true },
        { name: '🆔 ID',              value: `\`${emoji.id}\``,                           inline: true },
        { name: '✨ Animasyonlu',     value: emoji.animated ? '✅ GIF' : '❌ PNG/JPG',   inline: true },
        { name: '🗂️ Kaynak',          value: source,                                      inline: true },
        { name: '📅 Oluşturulma',     value: `${discordTimestamp(emoji.createdAt, 'D')} *(${ageDays} gün önce)*`, inline: true },
        { name: '🔗 Direkt URL',       value: `[İndir](${imageURL})`,                     inline: true },
        {
          name:  '📋 Kullanım Kodları',
          value: [
            `**Embed/Mesaj:**`,
            `\`\`\`${usage}\`\`\``,
            `**Küçük format:**`,
            `\`\`\`:${emoji.name}:\`\`\``,
          ].join('\n'),
          inline: false,
        },
      )
      .setImage(imageURL)
      .setFooter({ text: `ID: ${emoji.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Tam Boyut Aç')
        .setEmoji('🔍')
        .setStyle(ButtonStyle.Link)
        .setURL(imageURL),
      new ButtonBuilder()
        .setLabel('PNG İndir')
        .setEmoji('📥')
        .setStyle(ButtonStyle.Link)
        .setURL(emoji.imageURL({ size: 4096, extension: 'png' })),
    );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
