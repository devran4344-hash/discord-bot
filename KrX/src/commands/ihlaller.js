const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');
const lg = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ihlaller')
    .setDescription('📋 NSFW ihlal geçmişi')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('kullanici').setDescription('Kullanıcı ihlal geçmişi')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)))
    .addSubcommand(s => s.setName('liste').setDescription('Sunucu ihlal sıralaması'))
    .addSubcommand(s => s.setName('sifirla').setDescription('Kullanıcı sayacını sıfırla')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)))
    .addSubcommand(s => s.setName('temizle').setDescription('Kullanıcının tüm ihlal kaydını sil')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)))
    .addSubcommand(s => s.setName('silinenler').setDescription('Son silinen NSFW içerikler')),

  async execute(i) {
    await i.deferReply({ ephemeral: true });
    const g = i.guild, s = i.options.getSubcommand();

    // ── KULLANICI ────────────────────────────────────────────────────────────
    if (s === 'kullanici') {
      const user  = i.options.getUser('kullanici');
      const kayit = db.ihlalinBul(g.id, user.id);

      if (!kayit || kayit.toplam === 0) {
        return i.editReply({ embeds: [lg.bilgi('İhlal Geçmişi', `${user} için kayıtlı ihlal yok.`)] });
      }

      const cezaAdimlari = db.cezaListele(g.id);
      const sonraki = cezaAdimlari.find(a => a.adim_no === kayit.aktif + 1);
      const tipAd   = { uyari:'⚠️ Uyarı', mute:'🔇 Mute', kick:'👢 Kick', ban:'🔨 Ban' };

      const sonBes = (kayit.gecmis || []).slice(-5).reverse().map(k => {
        const emoji = k.tespit_tipi === 'ai_sightengine' ? '🤖' : k.tespit_tipi === 'discord_flag' ? '🏷️' : '🔬';
        return `${emoji} <#${k.kanal_id}> — <t:${Math.floor(k.zaman / 1000)}:R>`;
      }).join('\n') || '`Geçmiş yok`';

      const renk = kayit.aktif >= 4 ? 0xFF2D55 : kayit.aktif >= 2 ? 0xFF9500 : 0xFFCC00;

      const e = new EmbedBuilder()
        .setColor(renk)
        .setAuthor({ name: `${user.tag} — İhlal Geçmişi`, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '📊 Toplam İhlal',  value: `\`${kayit.toplam}\``,                                          inline: true },
          { name: '⚡ Aktif Sayaç',   value: `\`${kayit.aktif}\``,                                           inline: true },
          { name: '⚠️ Sonraki Ceza',  value: sonraki ? `${tipAd[sonraki.tip]} (${kayit.aktif + 1}. ihlal)` : '`Tanımlı değil`', inline: true },
          { name: '🕐 İlk İhlal',     value: `<t:${Math.floor(kayit.ilk_ihlal / 1000)}:R>`,                  inline: true },
          { name: '🕐 Son İhlal',     value: `<t:${Math.floor(kayit.son_ihlal / 1000)}:R>`,                  inline: true },
          { name: '🆔 Kullanıcı ID', value: `\`${user.id}\``,                                               inline: true },
          { name: '📝 Son 5 İhlal',   value: sonBes,                                                         inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `KrX NSFW Guard • ${g.name}` });

      return i.editReply({ embeds: [e] });
    }

    // ── LİSTE ────────────────────────────────────────────────────────────────
    if (s === 'liste') {
      const liste = db.ihlalListesi(g.id, 15);
      if (!liste.length) return i.editReply({ embeds: [lg.bilgi('İhlal Listesi', '✅ Bu sunucuda kayıtlı ihlal yok.')] });

      const e = new EmbedBuilder()
        .setColor(0x5856D6)
        .setTitle('📋 NSFW İhlal Sıralaması')
        .setDescription(`**${g.name}** — En fazla ihlal yapan 15 kullanıcı`)
        .setTimestamp()
        .setFooter({ text: `KrX NSFW Guard • ${g.name}` });

      liste.forEach((k, idx) => {
        const madalya = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`${idx + 1}.\``;
        e.addFields({
          name:  `${madalya} <@${k.user_id}>`,
          value: `Toplam: \`${k.toplam}\` | Aktif: \`${k.aktif}\` | Son: <t:${Math.floor(k.son_ihlal / 1000)}:R>`,
          inline: false,
        });
      });

      return i.editReply({ embeds: [e] });
    }

    // ── SIFIRLA ───────────────────────────────────────────────────────────────
    if (s === 'sifirla') {
      const user = i.options.getUser('kullanici');
      db.ihlalinSifirla(g.id, user.id);
      return i.editReply({ embeds: [lg.ok('Sayaç Sıfırlandı', `${user} aktif ihlal sayacı sıfırlandı.\n> Toplam ihlal kaydı korundu.`)] });
    }

    // ── TEMİZLE ───────────────────────────────────────────────────────────────
    if (s === 'temizle') {
      const user = i.options.getUser('kullanici');
      db.ihlalinTemizle(g.id, user.id);
      return i.editReply({ embeds: [lg.ok('Kayıt Silindi', `${user} tüm ihlal kaydı silindi.`)] });
    }

    // ── SİLİNENLER ────────────────────────────────────────────────────────────
    if (s === 'silinenler') {
      const liste = db.silinenListesi(g.id, 10);
      if (!liste.length) return i.editReply({ embeds: [lg.bilgi('Silinenenler', 'Henüz silinmiş içerik yok.')] });

      const tipEmoji = { ai_sightengine:'🤖', discord_flag:'🏷️', dosya_adi:'📁', lokal_analiz:'🔬' };

      const e = new EmbedBuilder()
        .setColor(0xFF2D55)
        .setTitle('🗑️ Son Silinen NSFW İçerikler')
        .setDescription('En son silinen 10 NSFW içerik')
        .setTimestamp()
        .setFooter({ text: `KrX NSFW Guard • ${g.name}` });

      for (const s of liste) {
        e.addFields({
          name:  `${tipEmoji[s.tespit_tipi] || '🔍'} <@${s.user_id}> — <#${s.kanal_id}>`,
          value: `Güven: \`%${Math.round((s.guven_skoru || 0) * 100)}\` | <t:${Math.floor(s.zaman / 1000)}:R>`,
          inline: false,
        });
      }

      return i.editReply({ embeds: [e] });
    }
  },
};
