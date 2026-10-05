const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('📖 Tüm komutları listele'),

  async execute(i) {
    await i.deferReply({ ephemeral: true });

    const e = new EmbedBuilder()
      .setColor(0x5856D6)
      .setTitle('🛡️ KrX NSFW Guard v2 — Komut Rehberi')
      .setThumbnail(i.client.user.displayAvatarURL())
      .setDescription('Tüm komutlar `/` prefix ile çalışır. Yönetici yetkisi gereklidir.')
      .addFields(
        {
          name: '⚙️ /ayarla',
          value: [
            '`goster` — Tüm ayarları göster',
            '`log` — NSFW log kanalı',
            '`modlog` — Moderasyon log kanalı',
            '`mod` — Tarama modu (tüm/seçili)',
            '`ai` — AI tespiti aç/kapat',
            '`guvenskoru` — AI hassasiyeti',
            '`sayac` — Sayaç sıfırlama süresi',
            '`spoiler` — Spoiler bypass koruması',
            '`davet` — Davet linki filtresi',
            '`sistem` — Botu aç/kapat',
            '`muafrolu` — Muaf rol ekle/kaldır',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚖️ /ceza',
          value: [
            '`ekle adim tip [sure] [sebep]` — Ceza basamağı ekle',
            '`duzenle adim [yeni ayarlar]` — Düzenle',
            '`kaldir adim` — Kaldır',
            '`liste` — Tüm basamakları göster',
            '`hepsini_sil` — Tümünü sil',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📡 /nsfw',
          value: [
            '`kanal ekle/kaldir/liste` — Taranacak kanallar',
            '`muaf ekle/kaldir` — Muaf kanallar',
            '`test kanal` — Kanalı test tara',
            '`istatistik` — Silinen içerik istatistikleri',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📋 /ihlaller',
          value: [
            '`kullanici @kişi` — İhlal geçmişi',
            '`liste` — Sunucu sıralaması',
            '`sifirla @kişi` — Sayaç sıfırla',
            '`temizle @kişi` — Kayıt sil',
            '`silinenler` — Son silinen içerikler',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🛡️ /koruma',
          value: [
            '`spam ayarla/durum` — Anti-spam',
            '`raid ayarla/durum` — Anti-raid',
            '`link ayarla/ekle/sil/liste` — Link filtresi',
            '`kelime ayarla/ekle/sil/liste` — Kelime filtresi',
          ].join('\n'),
          inline: false,
        },
        {
          name: '👮 /moderasyon',
          value: [
            '`uyar @kişi sebep` — Uyarı ver',
            '`uyarilar @kişi` — Uyarı geçmişi',
            '`uyarisil id` — Uyarı sil',
            '`mute @kişi [dakika] [sebep]`',
            '`unmute @kişi`',
            '`kick @kişi [sebep]`',
            '`ban @kişi [gün] [sebep]`',
            '`unban kullanici_id`',
            '`temizle adet [@kişi]`',
            '`kilit true/false [sebep]`',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📊 Diğer',
          value: '`/durum` — Sistem durumu\n`/yardim` — Bu rehber',
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'KrX NSFW Guard v2 — Dünyanın En Kapsamlı NSFW Koruma Sistemi' });

    return i.editReply({ embeds: [e] });
  },
};
