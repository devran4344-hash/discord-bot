/**
 * KrX Medya Kaydedici v4
 * ─────────────────────────────────────────────────────────
 * • Haftalık klasörleme (2026-W40 gibi)
 * • Tüm medya (resim, gif, video, ses, ses kaydı, emoji)
 * • Ses: süre + mp3 dönüştürme + yazıya çevirme (Whisper)
 * • Avatar değişince otomatik kaydet
 * • v!kanal → log kanalı ayarla, indirilen her şey oraya bildirilsin
 * • v!kanal-sifirla → log kanalını kaldır
 * • v!durum → sistem durumu
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');
const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ─── Opsiyonel Paketler ──────────────────────────────────────────────────────
let ffmpegPath = null;
try { ffmpegPath = require('ffmpeg-static'); }
catch { console.log('[Medya] ⚠️ ffmpeg-static yok — mp3 dönüştürme kapalı'); }

let mm = null;
try { mm = require('music-metadata'); }
catch { console.log('[Medya] ⚠️ music-metadata yok — süre alma kapalı'); }

let OpenAI = null;
try { OpenAI = require('openai'); }
catch { console.log('[Medya] ⚠️ openai yok — yazıya çevirme kapalı'); }

const OPENAI_KEY = process.env.OPENAI_API_KEY || null;
const openai = (OpenAI && OPENAI_KEY) ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// ─── Ayar Dosyası ────────────────────────────────────────────────────────────
const AYAR_DOSYASI = path.join(__dirname, 'medya-ayar.json');

function ayarOku() {
  try {
    if (fs.existsSync(AYAR_DOSYASI)) return JSON.parse(fs.readFileSync(AYAR_DOSYASI, 'utf8'));
  } catch {}
  return { logKanallari: {}, komutPrefix: 'v!' };
}
function ayarYaz(ayar) {
  try { fs.writeFileSync(AYAR_DOSYASI, JSON.stringify(ayar, null, 2), 'utf8'); } catch {}
}
let AYAR = ayarOku();
if (!AYAR.logKanallari) AYAR.logKanallari = {};

// ─── Haftalık Klasör ─────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function haftaEtiketi(tarih = new Date()) {
  return `${tarih.getFullYear()}-W${String(getISOWeek(tarih)).padStart(2, '0')}`;
}

// ─── Klasör Yolları ──────────────────────────────────────────────────────────
const ANA_KLASOR = path.join(__dirname, 'Dosyalar');
const ALT_KLASORLER = ['resimler','gifler','videolar','sesler','emojiler','avatarlar','diger'];

function haftaKlasoru(tarih = new Date()) {
  const yol = path.join(ANA_KLASOR, haftaEtiketi(tarih));
  for (const alt of ALT_KLASORLER) {
    const tam = path.join(yol, alt);
    if (!fs.existsSync(tam)) fs.mkdirSync(tam, { recursive: true });
  }
  return yol;
}
haftaKlasoru();

function klasorAl(tip, tarih = new Date()) {
  return path.join(haftaKlasoru(tarih), tip);
}

// ─── Uzantı → Klasör ─────────────────────────────────────────────────────────
const UZANTI_HARITA = {
  resimler: ['.png','.jpg','.jpeg','.webp','.bmp','.tiff','.svg'],
  gifler:   ['.gif','.apng'],
  videolar: ['.mp4','.mov','.webm','.mkv','.avi'],
  sesler:   ['.mp3','.wav','.ogg','.oga','.m4a','.aac','.flac','.opus','.wma','.aiff','.alac','.amr','.weba'],
};
const SES_MIME = ['audio/', 'voice-message', 'application/ogg'];

function tipBelirle(uzanti, mime) {
  const u = (uzanti || '').toLowerCase();
  for (const [tip, uzantilar] of Object.entries(UZANTI_HARITA)) {
    if (uzantilar.includes(u)) return tip;
  }
  if (mime && SES_MIME.some(m => mime.includes(m))) return 'sesler';
  return 'diger';
}

// Tip isimleri (Türkçe)
const TIP_ISIM = {
  resimler: 'Resim',
  gifler: 'GIF',
  videolar: 'Video',
  sesler: 'Ses',
  emojiler: 'Emoji',
  avatarlar: 'Avatar',
  diger: 'Dosya',
};
const TIP_EMOJI = {
  resimler: '🖼️',
  gifler: '🎞️',
  videolar: '🎬',
  sesler: '🔊',
  emojiler: '😀',
  avatarlar: '👤',
  diger: '📦',
};
const TIP_RENK = {
  resimler: 0x3498DB,
  gifler:   0x9B59B6,
  videolar: 0xE74C3C,
  sesler:   0x1ABC9C,
  emojiler: 0xF1C40F,
  avatarlar: 0xE91E63,
  diger:    0x95A5A6,
};

// ─── İndirme ─────────────────────────────────────────────────────────────────
function indir(url, hedefYol) {
  return new Promise((resolve, reject) => {
    const istemci = url.startsWith('https') ? https : http;
    istemci.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 KrX-MediaSaver' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return indir(res.headers.location, hedefYol).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const dosya = fs.createWriteStream(hedefYol);
      res.pipe(dosya);
      dosya.on('finish', () => dosya.close(() => resolve()));
      dosya.on('error', reject);
    }).on('error', reject);
  });
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
function guvenliIsim(metin) {
  return String(metin).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}
function zamanDamgasi(tarih = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${tarih.getFullYear()}-${p(tarih.getMonth()+1)}-${p(tarih.getDate())}_${p(tarih.getHours())}-${p(tarih.getMinutes())}-${p(tarih.getSeconds())}`;
}
function boyutFormatla(bayt) {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Log Kanalına Bildir ─────────────────────────────────────────────────────
async function logGonder(client, guildId, veri) {
  try {
    const kanalId = AYAR.logKanallari[guildId];
    if (!kanalId) return;
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal || !kanal.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(TIP_RENK[veri.tip] || 0x95A5A6)
      .setAuthor({
        name: veri.gonderenTag || 'Bilinmeyen',
        iconURL: veri.gonderenAvatar || undefined,
      })
      .setTitle(`${TIP_EMOJI[veri.tip] || '📦'} ${TIP_ISIM[veri.tip] || 'Dosya'} kaydedildi`)
      .setTimestamp()
      .setFooter({ text: 'KrX Medya Arşivi' })
      .addFields(
        { name: '👤 Gönderen', value: `<@${veri.gonderenId}> (\`${veri.gonderenTag}\`)`, inline: true },
        { name: '📍 Kanal', value: veri.kanalAdi ? `#${veri.kanalAdi}` : 'Bilinmiyor', inline: true },
        { name: '📏 Boyut', value: `\`${veri.boyut}\``, inline: true },
      );

    if (veri.dosyaAdi) {
      embed.addFields({ name: '📄 Dosya Adı', value: `\`${veri.dosyaAdi}\``, inline: false });
    }
    if (veri.kayitYeri) {
      embed.addFields({ name: '💾 Kayıt Yeri', value: `\`${veri.kayitYeri}\``, inline: false });
    }
    if (veri.ekstra) {
      embed.addFields({ name: 'ℹ️ Ek Bilgi', value: veri.ekstra, inline: false });
    }
    if (veri.mesajLink) {
      embed.addFields({ name: '🔗 Mesaj Linki', value: `[Buraya tıkla](${veri.mesajLink})`, inline: false });
    }

    // Görsel önizleme (resim ve gif için)
    if ((veri.tip === 'resimler' || veri.tip === 'gifler') && veri.eklenti) {
      embed.setImage(veri.eklenti);
    }

    await kanal.send({ embeds: [embed] }).catch(() => {});
  } catch (e) {
    console.log(`[Medya] Log gönderme hatası: ${e.message}`);
  }
}

// ─── Ses: Süre ───────────────────────────────────────────────────────────────
async function sesSuresiAl(dosyaYolu) {
  if (!mm) return null;
  try {
    const metadata = await mm.parseFile(dosyaYolu);
    const saniye = Math.round(metadata.format.duration || 0);
    if (!saniye) return null;
    const dk = Math.floor(saniye / 60);
    const sn = saniye % 60;
    return dk > 0 ? `${dk}dk${sn}sn` : `${sn}sn`;
  } catch { return null; }
}

// ─── Ses: ogg → mp3 ──────────────────────────────────────────────────────────
async function sesDonustur(dosyaYolu) {
  if (!ffmpegPath) return null;
  if (!/\.(ogg|oga|opus|weba)$/i.test(dosyaYolu)) return null;
  const yeniYol = dosyaYolu.replace(/\.(ogg|oga|opus|weba)$/i, '.mp3');
  try {
    await execPromise(`"${ffmpegPath}" -i "${dosyaYolu}" -codec:a libmp3lame -qscale:a 4 -y "${yeniYol}"`);
    fs.unlinkSync(dosyaYolu);
    return yeniYol;
  } catch (e) {
    console.log(`[Medya] ⚠️ Dönüştürme hatası: ${e.message}`);
    return null;
  }
}

// ─── Ses: Yazıya Çevir ───────────────────────────────────────────────────────
async function sesYaziyaCevir(dosyaYolu) {
  if (!openai) return null;
  try {
    const t = await openai.audio.transcriptions.create({
      file: fs.createReadStream(dosyaYolu),
      model: 'whisper-1',
      language: 'tr',
    });
    return t.text;
  } catch (e) {
    console.log(`[Medya] ⚠️ Whisper hatası: ${e.message}`);
    return null;
  }
}

// ─── Attachment İndir ────────────────────────────────────────────────────────
async function attachmentIndir(client, attachment, mesaj) {
  try {
    let uzanti = path.extname(attachment.name || '');
    if (!uzanti) {
      if (attachment.contentType?.includes('ogg')) uzanti = '.ogg';
      else if (attachment.contentType?.includes('mpeg')) uzanti = '.mp3';
      else if (attachment.contentType?.includes('mp4')) uzanti = '.mp4';
      else if (attachment.contentType?.includes('wav')) uzanti = '.wav';
      else uzanti = '.bin';
    }

    const tip = tipBelirle(uzanti, attachment.contentType);
    const klasor = klasorAl(tip);
    const yazar = guvenliIsim(mesaj.author.username);
    const kanal = guvenliIsim(mesaj.channel.name || 'dm');
    const sesKaydiMi = attachment.contentType?.includes('voice-message') || attachment.contentType?.includes('audio/ogg');
    const etiket = sesKaydiMi ? 'seskaydi' : 'dosya';

    let dosyaAdi = `${zamanDamgasi()}_${yazar}_${kanal}_${etiket}_${attachment.id}${uzanti}`;
    let hedefYol = path.join(klasor, dosyaAdi);

    await indir(attachment.url, hedefYol);

    let ekstraBilgi = [];

    // Ses özel işlemler
    if (tip === 'sesler') {
      const sure = await sesSuresiAl(hedefYol);
      if (sure) {
        const yeniAd = dosyaAdi.replace(/(\.[^.]+)$/, `_${sure}$1`);
        const yeniYol = path.join(klasor, yeniAd);
        fs.renameSync(hedefYol, yeniYol);
        hedefYol = yeniYol; dosyaAdi = yeniAd;
        ekstraBilgi.push(`⏱️ Süre: \`${sure}\``);
      }
      const mp3Yol = await sesDonustur(hedefYol);
      if (mp3Yol) {
        hedefYol = mp3Yol; dosyaAdi = path.basename(mp3Yol);
        ekstraBilgi.push('🎵 mp3\'e dönüştürüldü');
      }
      const metin = await sesYaziyaCevir(hedefYol);
      if (metin) {
        const txtYol = hedefYol.replace(/\.[^.]+$/, '.txt');
        fs.writeFileSync(txtYol, `[${mesaj.author.tag}]\n${mesaj.createdAt.toISOString()}\n\n${metin}`, 'utf8');
        ekstraBilgi.push(`📝 Transkript: \`${path.basename(txtYol)}\``);
      }
    }

    const boyutBayt = fs.statSync(hedefYol).size;
    const boyut = boyutFormatla(boyutBayt);
    const kayitYeri = `${haftaEtiketi()}/${tip}/${dosyaAdi}`;

    console.log(`[Medya] 💾 ${kayitYeri} (${boyut})`);

    // Log kanalına bildir
    await logGonder(client, mesaj.guild.id, {
      tip,
      gonderenId: mesaj.author.id,
      gonderenTag: mesaj.author.tag,
      gonderenAvatar: mesaj.author.displayAvatarURL({ size: 128 }),
      kanalAdi: mesaj.channel.name,
      boyut,
      dosyaAdi,
      kayitYeri,
      ekstra: ekstraBilgi.length ? ekstraBilgi.join('\n') : null,
      mesajLink: mesaj.url,
      eklenti: (tip === 'resimler' || tip === 'gifler') ? attachment.url : null,
    });
  } catch (e) {
    console.log(`[Medya] ❌ İndirme hatası: ${e.message}`);
  }
}

// ─── Embed İndir ─────────────────────────────────────────────────────────────
async function embedIndir(client, embed, mesaj) {
  const urller = [embed.image?.url, embed.thumbnail?.url, embed.video?.url, embed.audio?.url].filter(Boolean);
  for (const url of urller) {
    try {
      const temizUrl = url.split('?')[0];
      let uzanti = path.extname(temizUrl) || '.bin';
      if (uzanti.length > 6) uzanti = '.bin';
      const tip = tipBelirle(uzanti);
      const klasor = klasorAl(tip);
      const yazar = guvenliIsim(mesaj.author.username);
      const kanal = guvenliIsim(mesaj.channel.name || 'dm');
      const dosyaAdi = `${zamanDamgasi()}_${yazar}_${kanal}_embed${uzanti}`;
      const hedefYol = path.join(klasor, dosyaAdi);

      await indir(url, hedefYol);
      const boyut = boyutFormatla(fs.statSync(hedefYol).size);
      const kayitYeri = `${haftaEtiketi()}/${tip}/${dosyaAdi}`;

      console.log(`[Medya] 💾 ${kayitYeri} (${boyut})`);

      await logGonder(client, mesaj.guild.id, {
        tip,
        gonderenId: mesaj.author.id,
        gonderenTag: mesaj.author.tag,
        gonderenAvatar: mesaj.author.displayAvatarURL({ size: 128 }),
        kanalAdi: mesaj.channel.name,
        boyut,
        dosyaAdi,
        kayitYeri,
        ekstra: '🔗 Embed içeriği',
        mesajLink: mesaj.url,
        eklenti: (tip === 'resimler' || tip === 'gifler') ? url : null,
      });
    } catch (e) {
      console.log(`[Medya] ❌ Embed hatası: ${e.message}`);
    }
  }
}

// ─── Emoji İndir ─────────────────────────────────────────────────────────────
const EMOJI_REGEX = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;

async function emojiIndir(client, icerik, mesaj) {
  const bulunanlar = new Set();
  let eslesme;
  while ((eslesme = EMOJI_REGEX.exec(icerik)) !== null) {
    const [, animasyonlu, isim, id] = eslesme;
    if (bulunanlar.has(id)) continue;
    bulunanlar.add(id);
    try {
      const uzanti = animasyonlu === 'a' ? '.gif' : '.png';
      const url = `https://cdn.discordapp.com/emojis/${id}${uzanti}`;
      const yazar = guvenliIsim(mesaj.author.username);
      const dosyaAdi = `${zamanDamgasi()}_${yazar}_${guvenliIsim(isim)}_${id}${uzanti}`;
      const hedefYol = path.join(klasorAl('emojiler'), dosyaAdi);

      await indir(url, hedefYol);
      const boyut = boyutFormatla(fs.statSync(hedefYol).size);
      const kayitYeri = `${haftaEtiketi()}/emojiler/${dosyaAdi}`;

      console.log(`[Medya] 😀 ${kayitYeri} (${boyut})`);

      await logGonder(client, mesaj.guild.id, {
        tip: 'emojiler',
        gonderenId: mesaj.author.id,
        gonderenTag: mesaj.author.tag,
        gonderenAvatar: mesaj.author.displayAvatarURL({ size: 128 }),
        kanalAdi: mesaj.channel.name,
        boyut,
        dosyaAdi,
        kayitYeri,
        ekstra: `Emoji adı: \`:${isim}:\``,
        mesajLink: mesaj.url,
        eklenti: url,
      });
    } catch (e) {
      console.log(`[Medya] ❌ Emoji hatası: ${e.message}`);
    }
  }
}

// ─── Mesaj İşle ──────────────────────────────────────────────────────────────
async function mesajiIsle(client, mesaj) {
  if (!mesaj.author || mesaj.author.bot) return;
  if (mesaj.attachments?.size) {
    for (const att of mesaj.attachments.values()) await attachmentIndir(client, att, mesaj);
  }
  if (mesaj.embeds?.length) {
    for (const embed of mesaj.embeds) await embedIndir(client, embed, mesaj);
  }
  if (mesaj.content) {
    await emojiIndir(client, mesaj.content, mesaj);
  }
}

// ─── Avatar Kaydet ───────────────────────────────────────────────────────────
async function avatarIndir(client, user, guildId, kanalAdi = 'genel') {
  try {
    const url = user.displayAvatarURL({ size: 1024, extension: 'png' });
    const dosyaAdi = `${zamanDamgasi()}_${guvenliIsim(user.username)}_${user.id}.png`;
    const hedefYol = path.join(klasorAl('avatarlar'), dosyaAdi);

    await indir(url, hedefYol);
    const boyut = boyutFormatla(fs.statSync(hedefYol).size);
    const kayitYeri = `${haftaEtiketi()}/avatarlar/${dosyaAdi}`;

    console.log(`[Medya] 🖼️ ${kayitYeri} (${boyut})`);

    await logGonder(client, guildId, {
      tip: 'avatarlar',
      gonderenId: user.id,
      gonderenTag: user.tag,
      gonderenAvatar: user.displayAvatarURL({ size: 128 }),
      kanalAdi,
      boyut,
      dosyaAdi,
      kayitYeri,
      ekstra: '👤 Kullanıcı avatarını değiştirdi',
      eklenti: url,
    });
  } catch (e) {
    console.log(`[Medya] ❌ Avatar hatası: ${e.message}`);
  }
}

// ─── Komut İşleyici (v!kanal, v!kanal-sifirla, v!durum) ──────────────────────
const PREFIX = 'v!';

async function komutIsle(client, mesaj) {
  if (!mesaj.guild || mesaj.author.bot) return false;
  if (!mesaj.content.startsWith(PREFIX)) return false;

  const args = mesaj.content.slice(PREFIX.length).trim().split(/\s+/);
  const komut = args[0]?.toLowerCase();

  // ── v!kanal ──
  if (komut === 'kanal') {
    if (!mesaj.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return mesaj.reply('❌ Bu komutu kullanmak için **Yönetici** yetkisi gerekli.').then(() => true);
    }

    AYAR.logKanallari[mesaj.guild.id] = mesaj.channel.id;
    ayarYaz(AYAR);

    const embed = new EmbedBuilder()
      .setColor(0x30D158)
      .setTitle('✅ Medya Log Kanalı Ayarlandı')
      .setDescription(`Bu kanal artık medya kayıt bildirimlerini alacak: <#${mesaj.channel.id}>`)
      .addFields(
        { name: '📢 Kanal', value: `<#${mesaj.channel.id}>`, inline: true },
        { name: '🛠️ Ayar', value: `\`v!kanal-sifirla\` ile kaldırılabilir`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'KrX Medya Arşivi' });

    await mesaj.channel.send({ embeds: [embed] }).catch(() => {});
    return true;
  }

  // ── v!kanal-sifirla ──
  if (komut === 'kanal-sifirla' || komut === 'kanal-sıfırla') {
    if (!mesaj.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return mesaj.reply('❌ Bu komutu kullanmak için **Yönetici** yetkisi gerekli.').then(() => true);
    }
    delete AYAR.logKanallari[mesaj.guild.id];
    ayarYaz(AYAR);
    await mesaj.reply('✅ Medya log kanalı kaldırıldı. Yeni kanal için `v!kanal` yaz.').catch(() => {});
    return true;
  }

  // ── v!durum ──
  if (komut === 'durum') {
    const kanalId = AYAR.logKanallari[mesaj.guild.id];
    const embed = new EmbedBuilder()
      .setColor(kanalId ? 0x30D158 : 0xFF9500)
      .setTitle('📊 KrX Medya Arşivi — Durum')
      .addFields(
        { name: '📢 Log Kanalı', value: kanalId ? `<#${kanalId}>` : '`Ayarlanmamış` — `v!kanal` yaz', inline: false },
        { name: '📅 Aktif Hafta', value: `\`${haftaEtiketi()}\``, inline: true },
        { name: '📂 Kayıt Tipleri', value: '`resim, gif, video, ses, emoji, avatar`', inline: true },
        { name: '🔊 Ses İşleme', value: [
          `• Süre: ${mm ? '✅' : '❌'}`,
          `• mp3 dönüştürme: ${ffmpegPath ? '✅' : '❌'}`,
          `• Transkript: ${openai ? '✅' : '❌'}`,
        ].join('\n'), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'KrX Medya Arşivi' });

    await mesaj.reply({ embeds: [embed] }).catch(() => {});
    return true;
  }

  // ── v!yardim ──
  if (komut === 'yardim' || komut === 'yardım' || komut === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 KrX Medya Arşivi — Komutlar')
      .setDescription('Medya kayıt sistemi komutları:')
      .addFields(
        { name: '`v!kanal`', value: 'Bulunduğun kanalı medya log kanalı olarak ayarlar.', inline: false },
        { name: '`v!kanal-sifirla`', value: 'Log kanalı ayarını kaldırır.', inline: false },
        { name: '`v!durum`', value: 'Sistem durumunu ve aktif ayarları gösterir.', inline: false },
        { name: '`v!yardim`', value: 'Bu yardım mesajını gösterir.', inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'KrX Medya Arşivi' });
    await mesaj.reply({ embeds: [embed] }).catch(() => {});
    return true;
  }

  return false;
}

// ─── Başlat ──────────────────────────────────────────────────────────────────
function baslat(client) {
  client.on(Events.MessageCreate, async (mesaj) => {
    // Önce komut mu diye bak
    const komutMu = await komutIsle(client, mesaj).catch(() => false);
    if (komutMu) return;
    // Değilse medya işle
    mesajiIsle(client, mesaj).catch(e => console.log(`[Medya] Genel hata: ${e.message}`));
  });

  client.on(Events.MessageUpdate, (_eski, yeni) => {
    if (yeni.partial) return;
    if (!yeni.attachments?.size && !yeni.embeds?.length) return;
    mesajiIsle(client, yeni).catch(e => console.log(`[Medya] Update hatası: ${e.message}`));
  });

  client.on(Events.GuildMemberUpdate, async (eski, yeni) => {
    try {
      if (eski.displayAvatarURL({ size: 1024 }) !== yeni.displayAvatarURL({ size: 1024 })) {
        console.log(`[Medya] 👤 Avatar değişti: ${yeni.user.tag}`);
        await avatarIndir(client, yeni.user, yeni.guild.id);
      }
    } catch (e) {
      console.log(`[Medya] ❌ Avatar takip: ${e.message}`);
    }
  });

  console.log('[Medya] ✅ Medya kaydedici v4 aktif');
  console.log(`[Medya] 📅 Haftalık klasör: ${haftaEtiketi()}`);
  console.log('[Medya] 📂 Tipler: resim, gif, video, ses, ses kaydı, emoji, avatar');
  console.log('[Medya] 🔊 Ses: süre' + (ffmpegPath ? ' + mp3' : '') + (openai ? ' + transkript' : ''));
  console.log('[Medya] 💬 Komutlar: v!kanal, v!kanal-sifirla, v!durum, v!yardim');
}

module.exports = { baslat, ANA_KLASOR };