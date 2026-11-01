// src/commands/admin/emojisetup.js
const {
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');

module.exports = {
  name: 'emojisetup',
  aliases: ['emojikur', 'setupemoji', 'emojileriekle'],
  description: 'Botun Discord Developer Portal\'daki uygulama emojilerini sunucuya ekler.',
  usage: '!emojisetup',
  category: 'admin',
  cooldown: 30,

  data: new SlashCommandBuilder()
    .setName('emojisetup')
    .setDescription('Botun uygulama emojilerini sunucuya ekler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async executeSlash(interaction, client) {
    const hasPerm =
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuildExpressions);
    if (!hasPerm) return interaction.reply({ content: '❌ **Emojileri Yönet** veya **Yönetici** yetkisine sahip olmalısın.', flags: 64 });

    const guild = interaction.guild;
    await interaction.deferReply();

    let appEmojis;
    try { appEmojis = await client.application.emojis.fetch(); }
    catch (err) { return interaction.editReply(`❌ Uygulama emojileri çekilemedi.\n\`\`\`${err.message}\`\`\``); }

    if (!appEmojis.size) return interaction.editReply('ℹ️ Botun kayıtlı uygulama emojisi bulunmuyor.');

    const tierLimits = { 0: 50, 1: 100, 2: 150, 3: 250 };
    const maxEmojis = tierLimits[guild.premiumTier] ?? 50;
    const currentCount = guild.emojis.cache.size;
    const available = maxEmojis - currentCount;

    const existingNames = new Set(guild.emojis.cache.map(em => em.name.toLowerCase()));
    const toAdd = [...appEmojis.values()].filter(em => !existingNames.has(em.name.toLowerCase()));

    if (!toAdd.length) return interaction.editReply('✅ Tüm uygulama emojileri zaten sunucuda mevcut.');
    if (available <= 0) return interaction.editReply(`❌ Sunucu emoji limiti dolu! **${currentCount}/${maxEmojis}**\nÖnce birkaç emoji silmen lazım.`);

    const skipped = toAdd.length - Math.min(toAdd.length, available);
    const toProcess = toAdd.slice(0, available);

    await interaction.editReply(`⏳ **${toProcess.length}** emoji ekleniyor...\n📊 İlerleme: \`0/${toProcess.length}\``);

    let success = 0, failed = 0;
    const failedList = [];
    for (let i = 0; i < toProcess.length; i++) {
      const emoji = toProcess[i];
      try { await guild.emojis.create({ attachment: emoji.imageURL({ size: 128, extension: 'png' }), name: emoji.name, reason: `EmojiSetup | ${interaction.user.tag}` }); success++; }
      catch (err) { failed++; failedList.push(`${emoji.name}: ${err.message.slice(0, 60)}`); }
      if ((i + 1) % 3 === 0 || i === toProcess.length - 1) {
        await interaction.editReply(`⏳ **${toProcess.length}** emoji ekleniyor...\n📊 İlerleme: \`${i + 1}/${toProcess.length}\`\n✅ Başarılı: **${success}** | ❌ Başarısız: **${failed}**`).catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🎨 Emoji Kurulumu Tamamlandı')
      .setColor(failed === 0 ? 0x57f287 : 0xfee75c)
      .addFields(
        { name: '✅ Başarılı', value: `\`${success}\``, inline: true },
        { name: '❌ Başarısız', value: `\`${failed}\``, inline: true },
        { name: '📊 Sunucu Durumu', value: `\`${guild.emojis.cache.size}/${maxEmojis}\``, inline: true },
      ).setFooter({ text: `İşlemi yapan: ${interaction.user.tag}` }).setTimestamp();

    if (skipped > 0) embed.addFields({ name: '⚠️ Atlanan', value: `Limit dolduğu için **${skipped}** emoji eklenemedi.` });
    if (failedList.length) {
      const preview = failedList.slice(0, 5).join('\n');
      embed.addFields({ name: '⚠️ Başarısız Olanlar (İlk 5)', value: `\`\`\`${preview}${failedList.length > 5 ? `\n... +${failedList.length - 5} tane daha` : ''}\`\`\`` });
    }
    await interaction.editReply({ content: '', embeds: [embed] });
  },

  async execute(message, args, client) {
    // ─── Yetki Kontrolü ──────────────────────────────────────────
    const hasPerm =
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions);

    if (!hasPerm) {
      return message.reply('❌ Bu komutu kullanmak için **Emojileri Yönet** veya **Yönetici** yetkisine sahip olmalısın.');
    }

    const guild = message.guild;

    // ─── Uygulama Emojilerini Çek ─────────────────────────────────
    let appEmojis;
    try {
      appEmojis = await client.application.emojis.fetch();
    } catch (err) {
      return message.reply(
        `❌ Uygulama emojileri çekilemedi.\n\`\`\`${err.message}\`\`\`\n` +
        `💡 İpucu: Developer Portal → Applications → Botun → Emojis sekmesinden emoji yüklediğinden emin ol.`
      );
    }

    if (!appEmojis.size) {
      return message.reply('ℹ️ Botun kayıtlı uygulama emojisi bulunmuyor. Developer Portal\'dan emoji yükle.');
    }

    // ─── Sunucu Emoji Limiti ─────────────────────────────────────
    const tierLimits = { 0: 50, 1: 100, 2: 150, 3: 250 };
    const maxEmojis = tierLimits[guild.premiumTier] ?? 50;
    const currentCount = guild.emojis.cache.size;
    const available = maxEmojis - currentCount;

    // ─── Zaten Var Olanları Filtrele ─────────────────────────────
    const existingNames = new Set(
      guild.emojis.cache.map((e) => e.name.toLowerCase())
    );
    const toAdd = [...appEmojis.values()].filter(
      (e) => !existingNames.has(e.name.toLowerCase())
    );

    if (!toAdd.length) {
      return message.reply('✅ Tüm uygulama emojileri zaten sunucuda mevcut.');
    }

    if (available <= 0) {
      return message.reply(
        `❌ Sunucu emoji limiti dolu! **${currentCount}/${maxEmojis}**\n` +
        `Önce birkaç emoji silmen lazım.`
      );
    }

    const skipped = toAdd.length - Math.min(toAdd.length, available);
    const toProcess = toAdd.slice(0, available);

    // ─── İşlem Başlıyor ──────────────────────────────────────────
    const statusMsg = await message.reply({
      content:
        `⏳ **${toProcess.length}** emoji ekleniyor...\n` +
        `📊 İlerleme: \`0/${toProcess.length}\``,
    });

    let success = 0;
    let failed = 0;
    const failedList = [];

    for (let i = 0; i < toProcess.length; i++) {
      const emoji = toProcess[i];
      try {
        await guild.emojis.create({
          attachment: emoji.imageURL({ size: 128, extension: 'png' }),
          name: emoji.name,
          reason: `EmojiSetup | ${message.author.tag}`,
        });
        success++;
      } catch (err) {
        failed++;
        failedList.push(`${emoji.name}: ${err.message.slice(0, 60)}`);
      }

      // Her 3 emojide bir mesajı güncelle (rate limit dostu)
      if ((i + 1) % 3 === 0 || i === toProcess.length - 1) {
        await statusMsg
          .edit({
            content:
              `⏳ **${toProcess.length}** emoji ekleniyor...\n` +
              `📊 İlerleme: \`${i + 1}/${toProcess.length}\`\n` +
              `✅ Başarılı: **${success}** | ❌ Başarısız: **${failed}**`,
          })
          .catch(() => {});
      }
    }

    // ─── Sonuç Embed ─────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setTitle('🎨 Emoji Kurulumu Tamamlandı')
      .setColor(failed === 0 ? 0x57f287 : 0xfee75c)
      .addFields(
        { name: '✅ Başarılı', value: `\`${success}\``, inline: true },
        { name: '❌ Başarısız', value: `\`${failed}\``, inline: true },
        {
          name: '📊 Sunucu Durumu',
          value: `\`${guild.emojis.cache.size}/${maxEmojis}\``,
          inline: true,
        }
      )
      .setFooter({ text: `İşlemi yapan: ${message.author.tag}` })
      .setTimestamp();

    if (skipped > 0) {
      embed.addFields({
        name: '⚠️ Atlanan',
        value: `Limit dolduğu için **${skipped}** emoji eklenemedi.`,
      });
    }

    if (failedList.length) {
      const preview = failedList.slice(0, 5).join('\n');
      embed.addFields({
        name: '⚠️ Başarısız Olanlar (İlk 5)',
        value: `\`\`\`${preview}${failedList.length > 5 ? `\n... +${failedList.length - 5} tane daha` : ''}\`\`\``,
      });
    }

    await statusMsg.edit({ content: '', embeds: [embed] }).catch(() => {});
  },
};
