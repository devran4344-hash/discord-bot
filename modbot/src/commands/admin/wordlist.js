const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, isModerator } = require('../../utils/helpers');
const filter = require('../../utils/profanityFilter');
const config = require('../../config');
const e      = require('../../emojiConfig');

module.exports = {
  name: 'wordlist',
  aliases: ['kelimeliste', 'yasakliste', 'filtreliste'],
  description: 'Tüm yasaklı kelime kategorilerini ve AI durumunu gösterir.',
  usage: '!wordlist [kategori]',
  category: 'admin',
  cooldown: 10000,

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için moderatör olman gerekiyor.')] });

    const cfg     = config.wordFilter;
    const wordMap = filter.getWordList();
    const aiEnabled = cfg.ai?.enabled && !!cfg.ai?.apiKey;

    // Ana özet embed
    const mainEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: 'Küfür Filtresi — Genel Bakış', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription(
        `${e.shield} Bot **3 katmanlı** küfür koruması kullanıyor.\n` +
        `Mesaj gönderildiğinde sırasıyla kontrol edilir.`,
      )
      .addFields(
        {
          name: '📋 Katman 1 — Kelime Listesi',
          value: [
            `> ${e.success} **Durum:** Aktif`,
            `> 📦 **Toplam Kelime:** \`${filter.ALL_BANNED.length}\``,
            `> 🇹🇷 Türkçe Temel: \`${wordMap.turkce_temel?.length || 0}\``,
            `> 🔤 Türkçe Bypass: \`${wordMap.turkce_bypass?.length || 0}\``,
            `> 🇬🇧 İngilizce Temel: \`${wordMap.ingilizce_temel?.length || 0}\``,
            `> 🔤 İngilizce Bypass: \`${wordMap.ingilizce_bypass?.length || 0}\``,
            `> 🔞 Cinsel İçerik: \`${wordMap.cinsel?.length || 0}\``,
            `> ⚡ Şiddet/Tehdit: \`${wordMap.siddet?.length || 0}\``,
            `> ➕ Özel Eklenen: \`${wordMap.custom?.length || 0}\``,
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔤 Katman 2 — Bypass Koruması',
          value: [
            `> ${e.success} **Durum:** Aktif`,
            `> 🔄 L33tspeak: \`0→o, 1→i, 3→e, 4→a, @→a...\``,
            `> 🔄 Tekrar: \`fuuuck → fuck\``,
            `> 🔄 Ayraç: \`s.i.k → sik\``,
            `> 🔄 Yıldız: \`f*ck → fck\``,
          ].join('\n'),
          inline: false,
        },
        {
          name: `🤖 Katman 3 — OpenAI AI Moderasyon`,
          value: [
            `> **Durum:** ${aiEnabled ? `${e.success} Aktif` : `${e.no} Kapalı`}`,
            `> **Eşik:** %${Math.round((cfg.ai?.threshold || 0.75) * 100)} güven`,
            `> **Model:** omni-moderation-latest`,
            `> **Ücret:** Tamamen ücretsiz`,
            ...(!aiEnabled ? [`> \`OPENAI_MODERATION_ENABLED=true\` yaparak aktifleştir`] : []),
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚙️ Ceza Sistemi',
          value: [
            `> **${cfg.warnBeforeMute}. ihlalde:** ${e.mute} ${Math.floor(cfg.muteDuration / 60000)} dakika timeout`,
            `> **Her ihlalde:** Mesaj silinir + uyarı`,
            `> **DM Bildirim:** ${cfg.dmUser ? `${e.yes} Açık` : `${e.no} Kapalı`}`,
            `> **Log:** ${cfg.logDetections ? `${e.yes} Açık` : `${e.no} Kapalı`}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📝 Komutlar',
          value: [
            `> \`!addword <kelime>\` — Kelime ekle`,
            `> \`!removeword <kelime>\` — Kelime çıkar`,
            `> \`!wordlist\` — Bu menü`,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `Sunucu: ${message.guild.name} • OpenAI AI: ${aiEnabled ? 'Aktif' : 'Kapalı'}` })
      .setTimestamp();

    // AI nasıl aktifleştirilir butonu
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('wordlist_ai_how')
        .setLabel('AI Nasıl Aktifleştirilir?')
        .setEmoji('🤖')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wordlist_close')
        .setLabel('Kapat')
        .setEmoji(e.stop)
        .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.reply({ embeds: [mainEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: `${e.error} Bu menü sana ait değil.`, flags: 64 });

      if (i.customId === 'wordlist_close') {
        await msg.edit({ components: [] }).catch(() => null);
        return i.reply({ content: `${e.success} Kapatıldı.`, flags: 64 });
      }

      if (i.customId === 'wordlist_ai_how') {
        const aiEmbed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('🤖 OpenAI AI Moderasyonu Nasıl Aktifleştirilir?')
          .setDescription('OpenAI Moderation API tamamen **ücretsiz**! Aşağıdaki adımları izle:')
          .addFields(
            {
              name: '1️⃣ API Key Al',
              value: '> 1. [platform.openai.com](https://platform.openai.com/api-keys) adresine git\n> 2. Hesap oluştur (Gmail ile de olur)\n> 3. **"Create new secret key"** tıkla\n> 4. Keyi kopyala (`sk-...` ile başlar)',
              inline: false,
            },
            {
              name: '2️⃣ .env Dosyasını Güncelle',
              value: '```\nOPENAI_API_KEY=sk-buraya-keyi-yapistir\nOPENAI_MODERATION_ENABLED=true\nOPENAI_THRESHOLD=0.75\n```',
              inline: false,
            },
            {
              name: '3️⃣ Botu Yeniden Başlat',
              value: '> `start.bat` dosyasını kapatıp yeniden aç.\n> AI artık aktif olacak!',
              inline: false,
            },
            {
              name: '📊 AI Ne Tespit Eder?',
              value: [
                '> 🇹🇷 **Türkçe dahil** 90+ dil',
                '> 💬 Nefret söylemi, taciz',
                '> 🔞 Cinsel içerik',
                '> ⚡ Şiddet ve tehdit',
                '> 💀 Kendine zarar verme',
                '> 🔫 Yasadışı içerik',
              ].join('\n'),
              inline: false,
            },
          )
          .setFooter({ text: 'Moderation endpoint ücretsizdir — kredi kullanmaz!' })
          .setTimestamp();

        return i.reply({ embeds: [aiEmbed], flags: 64 });
      }
    });

    collector.on('end', () => msg.edit({ components: [] }).catch(() => null));
  },
};
