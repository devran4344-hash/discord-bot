/**
 * KrX NSFW Guard v2 — Tespit Motoru (Düzeltilmiş)
 *
 * Katman 1: Dosya adı + Discord NSFW flag
 * Katman 2: Sightengine API (ücretsiz 500/gün)
 * Katman 3: Sharp lokal deri tonu (fallback, eşik düşürüldü)
 * Katman 4: Spoiler bypass
 * Katman 5: Davet / link / kelime filtresi
 */

const axios = require('axios');
const path  = require('path');
const fs    = require('fs');

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); } catch (_) {}

// Desteklenen uzantılar
const GORSEL_UZ = new Set(['jpg','jpeg','png','webp','bmp','tiff','avif']);
const GIF_UZ    = new Set(['gif']);
const VIDEO_UZ  = new Set(['mp4','webm','mov','avi','mkv']);

const DAVET_RE  = /discord(?:app)?\.(?:com\/invite|gg)\/[\w-]+/i;
const URL_RE    = /https?:\/\/([^\s/]+)/gi;

// NSFW içerikli dosya adı kalıpları
const NSFW_AD_KALIPLARI = [
  'nsfw','porn','nude','naked','xxx','hentai','lewd','adult','18+','explicit',
  'sexy','boobs','ass','dick','cock','pussy','sex','erotic','onlyfans',
];

// ─── YARDIMCI ─────────────────────────────────────────────────────────────────
function uzantiAl(url) {
  try { return path.extname(url.split('?')[0]).slice(1).toLowerCase(); } catch { return ''; }
}

function dosyaTipiBelirle(uz) {
  if (GORSEL_UZ.has(uz)) return 'image';
  if (GIF_UZ.has(uz))    return 'gif';
  if (VIDEO_UZ.has(uz))  return 'video';
  return 'diger';
}

async function dosyaIndir(url) {
  try {
    const r = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 50 * 1024 * 1024,
      headers: { 'User-Agent': 'KrX-NSFW-Guard/2.0' },
    });
    return Buffer.from(r.data);
  } catch { return null; }
}

// ─── KATMAN 1: Dosya adı + Discord flag ──────────────────────────────────────
function katman1_flagVeAd(attachment) {
  // Discord NSFW flag (bit 4)
  const bitfield = attachment.flags?.bitfield ?? attachment.flags ?? 0;
  if (typeof bitfield === 'number' && (bitfield & 4)) {
    return { tespit: true, tip: 'discord_flag', skor: 1.0, detay: 'Discord NSFW etiketi' };
  }

  // Dosya adından tespit
  const ad = (attachment.name || attachment.filename || '').toLowerCase();
  if (NSFW_AD_KALIPLARI.some(k => ad.includes(k))) {
    return { tespit: true, tip: 'dosya_adi', skor: 0.95, detay: `Dosya adında NSFW: "${ad}"` };
  }

  return null;
}

// ─── KATMAN 2: Sightengine API ────────────────────────────────────────────────
async function katman2_sightengine(url, minSkor) {
  if (!cfg.sightengine_user || !cfg.sightengine_secret) return null;
  try {
    const r = await axios.get('https://api.sightengine.com/1.0/check.json', {
      params: {
        url,
        models: 'nudity-2.1,offensive',
        api_user: cfg.sightengine_user,
        api_secret: cfg.sightengine_secret,
      },
      timeout: 12000,
    });

    const n = r.data?.nudity;
    if (!n) return null;

    const skor = Math.max(
      n.raw                              || 0,
      n.partial                          || 0,
      n.sexual_activity                  || 0,
      n.sexual_display                   || 0,
      n.suggestive_classes?.very_suggestive || 0,
      n.suggestive_classes?.suggestive_nudity || 0,
    );

    return {
      tespit: skor >= minSkor,
      tip:    'ai_sightengine',
      skor,
      detay:  `Sightengine AI — %${Math.round(skor * 100)}`,
    };
  } catch (e) {
    console.warn('[KrX] Sightengine hatası:', e.message);
    return null;
  }
}

// ─── KATMAN 3: Sharp lokal deri tonu analizi ─────────────────────────────────
// Eşik düşürüldü: %45 (eski %65) — daha agresif
async function katman3_lokal(buffer, uz) {
  try {
    const sharp = require('sharp');
    const { data, info } = await sharp(buffer, { pages: 1 })
      .resize(96, 96, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let deri = 0;
    const toplam = info.width * info.height;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // YCbCr deri tonu modeli (daha güvenilir)
      const Y  =  0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
      const Cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;

      // Deri tonu YCbCr aralığı
      if (Y > 80 && Cb >= 85 && Cb <= 135 && Cr >= 135 && Cr <= 180) {
        deri++;
      }
    }

    const oran = deri / toplam;

    // Eşik: %62 — kedi/hayvan gibi ten tonlu görseller için yükseltildi
    // Lokal analiz sadece Sightengine yoksa devreye girer, false positive azaltmak için eşik yüksek
    if (oran >= 0.62) {
      return {
        tespit: true,
        tip:    'lokal_analiz',
        skor:   oran,
        detay:  `Lokal deri tonu analizi — %${Math.round(oran * 100)}`,
      };
    }

    return { tespit: false, tip: null, skor: oran, detay: 'Lokal: Temiz' };
  } catch (e) {
    console.warn('[KrX] Sharp analiz hatası:', e.message);
    return null;
  }
}

// ─── ANA TESPİT ───────────────────────────────────────────────────────────────
async function nsfwTespit(attachment, ayarlar) {
  const {
    ai_aktif          = true,
    discord_flag_aktif= true,
    min_guven_skoru   = 0.75,
    taranacak_tipler  = ['image', 'gif', 'video'],
  } = ayarlar;

  const url = attachment.url || attachment.proxyURL;
  if (!url) return { tespit: false, tip: null, skor: 0, detay: 'url_yok' };

  const uz  = uzantiAl(url);
  const tip = dosyaTipiBelirle(uz);

  // Tip kontrolü — 'image', 'gif', 'video' hepsi ayrı kontrol edilir
  const taranacakMi = taranacak_tipler.includes(tip) || taranacak_tipler.includes('image') && tip === 'image';
  if (!taranacakMi && tip !== 'image' && tip !== 'gif') {
    return { tespit: false, tip: null, skor: 0, detay: `muaf_tip:${tip}` };
  }

  // ── Katman 1: Discord flag + dosya adı ──────────────────────────────────
  if (discord_flag_aktif) {
    const k1 = katman1_flagVeAd(attachment);
    if (k1) return k1;
  }

  // ── Katman 2 + 3: AI (görsel ve gif için) ────────────────────────────────
  if (ai_aktif && (tip === 'image' || tip === 'gif')) {
    // Sightengine API varsa dene
    const k2 = await katman2_sightengine(url, min_guven_skoru);

    if (k2 !== null) {
      // Sightengine tespit etti → döndür
      if (k2.tespit) return k2;
      // Sightengine "temiz" dedi → YİNE DE lokal analizi çalıştır (çift kontrol)
      const buffer = await dosyaIndir(url);
      if (buffer) {
        const k3 = await katman3_lokal(buffer, uz);
        if (k3?.tespit) return k3;
      }
      return k2; // İkisi de temiz
    }

    // Sightengine yoksa sadece lokal
    const buffer = await dosyaIndir(url);
    if (buffer) {
      const k3 = await katman3_lokal(buffer, uz);
      if (k3) return k3;
    }
  }

  return { tespit: false, tip: null, skor: 0, detay: 'temiz' };
}

// ─── MESAJ TARAMA ─────────────────────────────────────────────────────────────
async function mesajiTara(mesaj, ayarlar) {
  // Spoiler bypass kontrolü
  if (ayarlar.spoiler_kontrol) {
    for (const [, att] of mesaj.attachments) {
      if (att.spoiler) {
        const r = await nsfwTespit(att, ayarlar);
        if (r.tespit) return { ...r, url: att.url, dosyaAdi: att.name, bypass: 'spoiler' };
      }
    }
  }

  // Normal attachment'lar
  for (const [, att] of mesaj.attachments) {
    const r = await nsfwTespit(att, ayarlar);
    if (r.tespit) return { ...r, url: att.url, dosyaAdi: att.name };
  }

  // Embed görselleri
  for (const embed of mesaj.embeds) {
    for (const u of [embed.image?.url, embed.thumbnail?.url].filter(Boolean)) {
      const uz  = uzantiAl(u);
      const sah = { url: u, proxyURL: u, name: `embed.${uz}`, filename: `embed.${uz}`, flags: 0 };
      const r   = await nsfwTespit(sah, ayarlar);
      if (r.tespit) return { ...r, url: u, dosyaAdi: 'embed_gorseli' };
    }
  }

  return null;
}

// ─── YARDIMCI TESPİTLER ───────────────────────────────────────────────────────
function davetTespit(icerik) {
  return DAVET_RE.test(icerik || '');
}

function linkTespit(icerik, yasakliDomainler) {
  if (!yasakliDomainler?.length) return null;
  const eslesme = [...(icerik || '').matchAll(URL_RE)];
  for (const m of eslesme) {
    const domain = m[1].toLowerCase();
    if (yasakliDomainler.some(d => domain.includes(d))) return domain;
  }
  return null;
}

function kelimeTespit(icerik, kelimeler) {
  const kucuk = (icerik || '').toLowerCase();
  return kelimeler?.find(k => kucuk.includes(k.kelime)) || null;
}

function kanalTaranmali(kanal, ayarlar) {
  if (!ayarlar.aktif || !ayarlar.nsfw_aktif) return false;
  if (ayarlar.muaf_kanallar?.includes(kanal.id)) return false;
  if (ayarlar.mod === 'tum_kanallar') return true;
  if (ayarlar.mod === 'secili_kanallar') return ayarlar.secili_kanallar?.includes(kanal.id) || false;
  return false;
}

module.exports = {
  nsfwTespit, mesajiTara, kanalTaranmali,
  davetTespit, linkTespit, kelimeTespit,
};
