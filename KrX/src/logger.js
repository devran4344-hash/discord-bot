/**
 * KrX NSFW Guard v2 — Premium Embed Logger
 * Her event için özel tasarlanmış, detaylı ve görsel Discord embeds.
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

// ─── Renk Paleti ──────────────────────────────────────────────────────────────
const R = {
  nsfw:     0xFF2D55,   // Kırmızı-pembe
  uyari:    0xFF9F0A,   // Turuncu
  mute:     0xFFD60A,   // Sarı
  kick:     0xFF6B00,   // Koyu turuncu
  ban:      0xC0392B,   // Koyu kırmızı
  bilgi:    0x5856D6,   // Discord moru
  basarili: 0x30D158,   // Yeşil
  hata:     0xFF3B30,   // Kırmızı
  mod:      0x0A84FF,   // Mavi
  spam:     0xFF6B00,   // Turuncu
  raid:     0xBF5AF2,   // Mor
  kelime:   0xFF2D55,   // Pembe
  link:     0xFF9F0A,   // Turuncu
  temiz:    0x30D158,   // Yeşil
};

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const TIP_AD = {
  uyari: '⚠️ Uyarı',
  mute:  '🔇 Susturma',
  kick:  '👢 Atma',
  ban:   '🔨 Yasaklama',
};
const TIP_RENK = { uyari: R.uyari, mute: R.mute, kick: R.kick, ban: R.ban };

const TESPIT_AD = {
  ai_sightengine: '🤖 Sightengine AI',
  discord_flag:   '🏷️ Discord Etiketi',
  dosya_adi:      '📁 Dosya Adı',
  lokal_analiz:   '🔬 Lokal Analiz',
};

function ts(ms)  { return `<t:${Math.floor((ms || Date.now()) / 1000)}:F>`; }
function tsR(ms) { return `<t:${Math.floor((ms || Date.now()) / 1000)}:R>`; }
function skor(s) { return `\`%${Math.round((s || 0) * 100)}\``; }

// ─── YARDIMCI EMBEDLER ───────────────────────────────────────────────────────
function temelEmbed(renk, baslik, aciklama) {
  return new EmbedBuilder()
    .setColor(renk)
    .setTitle(baslik)
    .setDescription(aciklama || null)
    .setTimestamp()
    .setFooter({ text: 'KrX NSFW Guard v2' });
}
function ok(b, a)    { return temelEmbed(R.basarili, `✅  ${b}`, a); }
function hata(b, a)  { return temelEmbed(R.hata,     `❌  ${b}`, a); }
function bilgi(b, a) { return temelEmbed(R.bilgi,     `ℹ️  ${b}`, a); }

// ══════════════════════════════════════════════════════════════════════════════
//  NSFW İÇERİK SİLİNDİ
// ══════════════════════════════════════════════════════════════════════════════
async function logNsfwSilindi({
  logKanal, guild, user, kanal, mesajId,
  dosyaUrl, tespit, skor: guvenSkor,
  ihlalinSayisi, cezaAdi, bypass,
}) {
  if (!logKanal) return;

  const tespitAdi = TESPIT_AD[tespit] || `\`${tespit}\``;
  const skorStr   = skor(guvenSkor);
  const renk      = guvenSkor >= 0.9 ? 0x8B0000 : guvenSkor >= 0.7 ? R.nsfw : R.uyari;

  // İhlal sayısına göre tehlike göstergesi
  const tehlike = ihlalinSayisi >= 5 ? '🔴 KRİTİK'
                : ihlalinSayisi >= 3 ? '🟠 Yüksek'
                : ihlalinSayisi >= 2 ? '🟡 Orta'
                : '🟢 İlk';

  const e = new EmbedBuilder()
    .setColor(renk)
    .setAuthor({
      name: `${user.tag}  —  NSFW İçerik Silindi`,
      iconURL: user.displayAvatarURL({ size: 64 }),
    })
    .setTitle(bypass
      ? '🕵️  Spoiler Bypass Tespit Edildi!'
      : '🔞  NSFW İçerik Tespit & Silindi')
    .setDescription(
      bypass
        ? `> ⚠️ Kullanıcı NSFW içeriği \`||spoiler||\` ile gizlemeye çalıştı.\n> Spoiler kaldırılarak analiz edildi.`
        : `> Kullanıcının gönderdiği içerik NSFW olarak tespit edildi ve **otomatik silindi**.`
    )
    .addFields(
      // Satır 1
      {
        name: '👤  Kullanıcı',
        value: `${user}\n\`${user.id}\``,
        inline: true,
      },
      {
        name: '📢  Kanal',
        value: `${kanal}\n\`${kanal.name}\``,
        inline: true,
      },
      {
        name: '🌐  Sunucu',
        value: `${guild.name}\n\`${guild.id}\``,
        inline: true,
      },
      // Satır 2
      {
        name: '🔍  Tespit Yöntemi',
        value: tespitAdi,
        inline: true,
      },
      {
        name: '📊  Güven Skoru',
        value: `${skorStr}\n${guvenSkor >= 0.9 ? '🔴 Çok Yüksek' : guvenSkor >= 0.7 ? '🟠 Yüksek' : guvenSkor >= 0.5 ? '🟡 Orta' : '🟢 Düşük'}`,
        inline: true,
      },
      {
        name: '⚡  İhlal Durumu',
        value: `\`${ihlalinSayisi}. ihlal\`\n${tehlike}`,
        inline: true,
      },
      // Satır 3
      {
        name: '⚖️  Uygulanan Ceza',
        value: cezaAdi || '`—  Ceza adımı tanımlı değil`',
        inline: true,
      },
      {
        name: '🆔  Mesaj ID',
        value: `\`${mesajId}\``,
        inline: true,
      },
      {
        name: '🕐  Zaman',
        value: ts(),
        inline: true,
      },
    )
    .setTimestamp()
    .setFooter({
      text: `KrX NSFW Guard v2  •  ${guild.name}`,
      iconURL: guild.iconURL() || undefined,
    });

  // Görsel önizleme — sadece statik resimler için (GIF Discord önizlemesi zaten var)
  if (dosyaUrl) {
    const uz = dosyaUrl.split('?')[0].split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(uz)) {
      e.setImage(dosyaUrl);
    }
    e.addFields({
      name: '🔗  Silinen Dosya',
      value: `[Önizleme Linki](${dosyaUrl})`,
      inline: false,
    });
  }

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  CEZA UYGULANDI
// ══════════════════════════════════════════════════════════════════════════════
async function logCeza({
  logKanal, guild, user, cezaTip,
  sure, ihlalinSayisi, sebep,
}) {
  if (!logKanal) return;

  const e = new EmbedBuilder()
    .setColor(TIP_RENK[cezaTip] || R.mod)
    .setAuthor({
      name: `${user.tag}  —  ${TIP_AD[cezaTip] || cezaTip}`,
      iconURL: user.displayAvatarURL({ size: 64 }),
    })
    .setTitle(`${TIP_AD[cezaTip] || cezaTip}  Uygulandı`)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .addFields(
      {
        name: '👤  Kullanıcı',
        value: `${user}\n\`${user.id}\``,
        inline: true,
      },
      {
        name: '⚖️  Ceza Türü',
        value: TIP_AD[cezaTip] || cezaTip,
        inline: true,
      },
      {
        name: '⚡  İhlal No',
        value: `\`${ihlalinSayisi}. ihlal\``,
        inline: true,
      },
      ...(sure ? [{
        name: '⏱️  Süre',
        value: `\`${sure}\``,
        inline: true,
      }] : []),
      {
        name: '📝  Sebep',
        value: sebep || 'NSFW İhlali',
        inline: true,
      },
      {
        name: '🕐  Zaman',
        value: ts(),
        inline: true,
      },
    )
    .setTimestamp()
    .setFooter({
      text: `KrX NSFW Guard v2  •  ${guild.name}`,
      iconURL: guild.iconURL() || undefined,
    });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  SPAM TESPİT
// ══════════════════════════════════════════════════════════════════════════════
async function logSpam({ logKanal, guild, user, kanal, mesajSayisi, aksiyon }) {
  if (!logKanal) return;

  const e = new EmbedBuilder()
    .setColor(R.spam)
    .setAuthor({
      name: `${user.tag}  —  Spam Tespit`,
      iconURL: user.displayAvatarURL({ size: 64 }),
    })
    .setTitle('🚫  Anti-Spam Tetiklendi')
    .addFields(
      { name: '👤  Kullanıcı',   value: `${user}\n\`${user.id}\``,  inline: true  },
      { name: '📢  Kanal',       value: `${kanal}`,                  inline: true  },
      { name: '📨  Mesaj Sayısı',value: `\`${mesajSayisi}\``,        inline: true  },
      { name: '⚖️  Aksiyon',     value: `\`${aksiyon}\``,            inline: true  },
      { name: '🕐  Zaman',       value: ts(),                        inline: true  },
    )
    .setTimestamp()
    .setFooter({ text: `KrX NSFW Guard v2  •  ${guild.name}` });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  FİLTRE (KELİME / LİNK)
// ══════════════════════════════════════════════════════════════════════════════
async function logFiltre({ logKanal, guild, user, kanal, mesajId, icerik, tip, detay }) {
  if (!logKanal) return;

  const baslik = tip === 'link' ? '🔗  Yasak Link Tespit' : '💬  Yasak Kelime Tespit';
  const renk   = tip === 'link' ? R.link : R.kelime;

  const e = new EmbedBuilder()
    .setColor(renk)
    .setAuthor({
      name: `${user.tag}  —  Filtre Tetiklendi`,
      iconURL: user.displayAvatarURL({ size: 64 }),
    })
    .setTitle(baslik)
    .addFields(
      { name: '👤  Kullanıcı',  value: `${user}\n\`${user.id}\``,                                    inline: true  },
      { name: '📢  Kanal',      value: `${kanal}`,                                                    inline: true  },
      { name: '🔍  Tespit',     value: `\`${detay}\``,                                                inline: true  },
      { name: '🆔  Mesaj ID',   value: `\`${mesajId}\``,                                              inline: true  },
      { name: '🕐  Zaman',      value: ts(),                                                           inline: true  },
      { name: '💬  İçerik',     value: `\`\`\`${(icerik || '').substring(0, 300)}\`\`\``,            inline: false },
    )
    .setTimestamp()
    .setFooter({ text: `KrX NSFW Guard v2  •  ${guild.name}` });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  MOD AKSİYON
// ══════════════════════════════════════════════════════════════════════════════
async function logMod({ logKanal, guild, hedefUser, yetkiliUser, aksiyon, sebep, sure }) {
  if (!logKanal) return;

  const aksiyonRenk = {
    mute: R.mute, unmute: R.basarili,
    kick: R.kick, ban: R.ban, unban: R.basarili,
    'Uyarı': R.uyari,
  };

  const e = new EmbedBuilder()
    .setColor(aksiyonRenk[aksiyon] || R.mod)
    .setAuthor({
      name: `Moderasyon  —  ${aksiyon}`,
      iconURL: guild.iconURL() || undefined,
    })
    .setTitle(`👮  ${aksiyon} Aksiyonu Uygulandı`)
    .setThumbnail(hedefUser.displayAvatarURL?.({ size: 128 }) || null)
    .addFields(
      { name: '🎯  Hedef',     value: `${hedefUser}\n\`${hedefUser.id}\``,    inline: true  },
      { name: '👮  Yetkili',   value: `${yetkiliUser}\n\`${yetkiliUser.id}\``, inline: true },
      { name: '⚖️  Aksiyon',   value: `\`${aksiyon}\``,                        inline: true  },
      ...(sure  ? [{ name: '⏱️  Süre',  value: `\`${sure}\``,  inline: true }] : []),
      ...(sebep ? [{ name: '📝  Sebep', value: sebep,           inline: false }] : []),
      { name: '🕐  Zaman',    value: ts(),                                      inline: true  },
    )
    .setTimestamp()
    .setFooter({ text: `KrX NSFW Guard v2  •  ${guild.name}` });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  AÇILIŞ TARAMASI
// ══════════════════════════════════════════════════════════════════════════════
async function logAcilisTarama({ logKanal, guild, taranan, silinen }) {
  if (!logKanal) return;

  const e = new EmbedBuilder()
    .setColor(silinen > 0 ? R.nsfw : R.basarili)
    .setTitle('🔍  Açılış Taraması Tamamlandı')
    .setDescription(
      silinen > 0
        ? `> Bot kapalıyken **${silinen}** NSFW içerik tespit edildi ve silindi.`
        : `> Bot kapalıyken gönderilen içerikler tarandı. NSFW bulunamadı.`
    )
    .addFields(
      { name: '📨  Taranan Mesaj', value: `\`${taranan}\``,  inline: true },
      { name: '🗑️  Silinen NSFW',  value: `\`${silinen}\``,  inline: true },
      { name: '🌐  Sunucu',        value: guild.name,         inline: true },
      { name: '🕐  Zaman',         value: ts(),               inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `KrX NSFW Guard v2  •  Açılış Taraması` });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  RAİD TESPİT
// ══════════════════════════════════════════════════════════════════════════════
async function logRaid({ logKanal, guild, kisiSayisi, surelik, aksiyon }) {
  if (!logKanal) return;

  const e = new EmbedBuilder()
    .setColor(R.raid)
    .setTitle('🚨  RAİD TESPİT EDİLDİ!')
    .setDescription(`> **${kisiSayisi} kullanıcı ${surelik} saniye** içinde sunucuya katıldı!\n> Otomatik aksiyon uygulandı.`)
    .addFields(
      { name: '👥  Katılan Kişi',  value: `\`${kisiSayisi}\``,  inline: true },
      { name: '⏱️  Süre',          value: `\`${surelik}sn\``,    inline: true },
      { name: '⚖️  Aksiyon',       value: `\`${aksiyon}\``,      inline: true },
      { name: '🕐  Zaman',         value: ts(),                  inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `KrX NSFW Guard v2  •  ${guild.name}` });

  await logKanal.send({ embeds: [e] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
//  KULLANICIYA DM UYARI
// ══════════════════════════════════════════════════════════════════════════════
async function dmUyari({ user, guild, cezaTip, ihlalinSayisi, sure, sebep }) {
  const e = new EmbedBuilder()
    .setColor(TIP_RENK[cezaTip] || R.uyari)
    .setAuthor({
      name: `${guild.name}  —  NSFW İhlal Bildirimi`,
      iconURL: guild.iconURL() || undefined,
    })
    .setTitle(`${TIP_AD[cezaTip] || '⚠️ Uyarı'}`)
    .setDescription(
      `**${guild.name}** sunucusunda **NSFW kural ihlali** tespit edildi.\n` +
      `Bu senin **${ihlalinSayisi}. ihlalin**.`
    )
    .addFields(
      { name: '⚖️  Uygulanan Ceza', value: TIP_AD[cezaTip] || cezaTip, inline: true },
      ...(sure  ? [{ name: '⏱️  Süre',  value: `\`${sure}\``, inline: true }] : []),
      { name: '🕐  Zaman',          value: ts(),               inline: true },
      ...(sebep ? [{ name: '📝  Sebep', value: sebep, inline: false }] : []),
    )
    .setFooter({ text: 'KrX NSFW Guard v2  •  İtiraz için sunucu yönetimine başvurun.' })
    .setTimestamp();

  await user.send({ embeds: [e] }).catch(() => {});
}

module.exports = {
  ok, hata, bilgi,
  logNsfwSilindi, logCeza, logSpam, logFiltre,
  logMod, logAcilisTarama, logRaid, dmUyari,
  R,
};
