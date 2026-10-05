/**
 * KrX NSFW Guard v2 — Veritabanı (lowdb v1, JSON)
 */
const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = low(new FileSync(path.join(dataDir, 'krx_nsfw.json')));

db.defaults({
  guilds: [], ihlaller: [], uyarilar: [], ceza_adimlari: [],
  silinen_log: [], antispam: [], kelime_filtre: [], link_filtre: [],
  _id: { g:0, i:0, u:0, c:0, s:0, k:0, l:0 },
}).write();

function uid(k) {
  const n = db.get(`_id.${k}`).value() + 1;
  db.set(`_id.${k}`, n).write();
  return n;
}

// ─── GUILD ──────────────────────────────────────────────────────────────────
const DEF = {
  aktif:true, nsfw_aktif:true, mod:'tum_kanallar',
  secili_kanallar:[], muaf_kanallar:[], muaf_roller:[],
  log_kanal_id:null, mod_log_kanal_id:null,
  ai_aktif:true, discord_flag_aktif:true, min_guven_skoru:0.75,
  taranacak_tipler:['image','gif','video'],
  sayac_sifirlama_gun:30, spoiler_kontrol:true, davet_filtresi:false,
  raid_aktif:false, raid_esik:10, raid_esik_sure:10, raid_aksiyon:'kick',
  spam_aktif:false, spam_limit:5, spam_sure:5, spam_aksiyon:'mute', spam_mute_dk:10,
  link_filtre_aktif:false, link_muaf_roller:[],
  kelime_filtre_aktif:false, kilitli:false, olusturma:0,
};

function guildGetir(gid) {
  let g = db.get('guilds').find({ guild_id: gid }).value();
  if (!g) { g = { id:uid('g'), guild_id:gid, ...DEF, olusturma:Date.now() }; db.get('guilds').push(g).write(); }
  return g;
}
function guildAyarla(gid, f) {
  if (!db.get('guilds').find({ guild_id:gid }).value())
    db.get('guilds').push({ id:uid('g'), guild_id:gid, ...DEF, ...f, olusturma:Date.now() }).write();
  else db.get('guilds').find({ guild_id:gid }).assign(f).write();
}

// ─── CEZA ────────────────────────────────────────────────────────────────────
function cezaEkle(gid,adim,tip,dk,saat,gun,sebep) {
  const v = db.get('ceza_adimlari').find({ guild_id:gid, adim_no:adim, aktif:true }).value();
  const d = { tip, sure_dk:dk||0, sure_saat:saat||0, sure_gun:gun||0, sebep:sebep||'NSFW İhlali' };
  if (v) { db.get('ceza_adimlari').find({ guild_id:gid, adim_no:adim, aktif:true }).assign(d).write(); return v.id; }
  const id = uid('c');
  db.get('ceza_adimlari').push({ id, guild_id:gid, adim_no:adim, ...d, aktif:true, olusturma:Date.now() }).write();
  return id;
}
function cezaListele(gid)     { return db.get('ceza_adimlari').filter({ guild_id:gid, aktif:true }).sortBy('adim_no').value(); }
function cezaGetir(gid,adim)  { return db.get('ceza_adimlari').find({ guild_id:gid, adim_no:adim, aktif:true }).value()||null; }
function cezaSil(gid,adim)    { db.get('ceza_adimlari').find({ guild_id:gid, adim_no:adim, aktif:true }).assign({ aktif:false }).write(); }

// ─── İHLAL ───────────────────────────────────────────────────────────────────
function ihlalinArtir(gid,userId,mesajId,kanalId,tip) {
  const v = db.get('ihlaller').find({ guild_id:gid, user_id:userId }).value();
  const kayit = { mesaj_id:mesajId, kanal_id:kanalId, tespit_tipi:tip, zaman:Date.now() };
  if (!v) { db.get('ihlaller').push({ id:uid('i'), guild_id:gid, user_id:userId, toplam:1, aktif:1, son_ihlal:Date.now(), ilk_ihlal:Date.now(), gecmis:[kayit] }).write(); return 1; }
  const yeni = v.aktif + 1;
  db.get('ihlaller').find({ guild_id:gid, user_id:userId }).assign({ toplam:v.toplam+1, aktif:yeni, son_ihlal:Date.now(), gecmis:[...(v.gecmis||[]).slice(-49), kayit] }).write();
  return yeni;
}
function ihlalinBul(gid,uid_)     { return db.get('ihlaller').find({ guild_id:gid, user_id:uid_ }).value()||null; }
function ihlalinSifirla(gid,uid_) { db.get('ihlaller').find({ guild_id:gid, user_id:uid_ }).assign({ aktif:0 }).write(); }
function ihlalinTemizle(gid,uid_) { db.get('ihlaller').remove({ guild_id:gid, user_id:uid_ }).write(); }
function ihlalListesi(gid,lim)    { return db.get('ihlaller').filter({ guild_id:gid }).sortBy(i=>-i.son_ihlal).take(lim||20).value(); }
function sayacOtomatik(gid,gun)   {
  if (!gun) return;
  const sinir = gun*86400000;
  db.get('ihlaller').filter({ guild_id:gid }).each(k=>{ if (k.aktif>0 && Date.now()-k.son_ihlal>sinir) k.aktif=0; }).write();
}

// ─── UYARI ────────────────────────────────────────────────────────────────────
function uyariEkle(gid,userId,sebep,yetkili) { const id=uid('u'); db.get('uyarilar').push({ id, guild_id:gid, user_id:userId, sebep, yetkili_id:yetkili, zaman:Date.now() }).write(); return id; }
function uyariListesi(gid,userId)            { return db.get('uyarilar').filter({ guild_id:gid, user_id:userId }).sortBy('zaman').value(); }
function uyariSil(id)                        { db.get('uyarilar').remove({ id }).write(); }
function sunucuUyariListesi(gid,lim)         { return db.get('uyarilar').filter({ guild_id:gid }).sortBy(u=>-u.zaman).take(lim||20).value(); }

// ─── SİLİNEN ──────────────────────────────────────────────────────────────────
function silinenKaydet(gid,userId,kanalId,mesajId,url,tespit,skor) {
  db.get('silinen_log').push({ id:uid('s'), guild_id:gid, user_id:userId, kanal_id:kanalId, mesaj_id:mesajId, dosya_url:url, tespit_tipi:tespit, guven_skoru:skor, zaman:Date.now() }).write();
}
function silinenListesi(gid,lim) { return db.get('silinen_log').filter({ guild_id:gid }).sortBy(s=>-s.zaman).take(lim||50).value(); }

// ─── SPAM ─────────────────────────────────────────────────────────────────────
function spamEkle(gid,userId,zaman) {
  const v = db.get('antispam').find({ guild_id:gid, user_id:userId }).value();
  if (v) db.get('antispam').find({ guild_id:gid, user_id:userId }).assign({ mesajlar:[...v.mesajlar, zaman] }).write();
  else db.get('antispam').push({ guild_id:gid, user_id:userId, mesajlar:[zaman] }).write();
}
function spamTemizle(gid,userId,pencere) {
  const v = db.get('antispam').find({ guild_id:gid, user_id:userId }).value();
  if (!v) return 0;
  const yeni = v.mesajlar.filter(t=>Date.now()-t < pencere*1000);
  db.get('antispam').find({ guild_id:gid, user_id:userId }).assign({ mesajlar:yeni }).write();
  return yeni.length;
}

// ─── KELİME / LİNK ────────────────────────────────────────────────────────────
function kelimeEkle(gid,k)  { if (!db.get('kelime_filtre').find({ guild_id:gid, kelime:k.toLowerCase() }).value()) db.get('kelime_filtre').push({ id:uid('k'), guild_id:gid, kelime:k.toLowerCase(), olusturma:Date.now() }).write(); }
function kelimeSil(gid,k)   { db.get('kelime_filtre').remove({ guild_id:gid, kelime:k.toLowerCase() }).write(); }
function kelimeListesi(gid) { return db.get('kelime_filtre').filter({ guild_id:gid }).value(); }
function linkEkle(gid,d)    { if (!db.get('link_filtre').find({ guild_id:gid, domain:d.toLowerCase() }).value()) db.get('link_filtre').push({ id:uid('l'), guild_id:gid, domain:d.toLowerCase(), olusturma:Date.now() }).write(); }
function linkSil(gid,d)     { db.get('link_filtre').remove({ guild_id:gid, domain:d.toLowerCase() }).write(); }
function linkListesi(gid)   { return db.get('link_filtre').filter({ guild_id:gid }).value(); }

// ─── YARDIMCI ─────────────────────────────────────────────────────────────────
function sureyeMs(dk,saat,gun) { return ((gun||0)*86400+(saat||0)*3600+(dk||0)*60)*1000; }
function sureyiBicimle(dk,saat,gun) {
  const p=[];
  if (gun>0)  p.push(`${gun} gün`);
  if (saat>0) p.push(`${saat} saat`);
  if (dk>0)   p.push(`${dk} dakika`);
  return p.length ? p.join(' ') : 'Süresiz';
}

module.exports = {
  guildGetir, guildAyarla,
  cezaEkle, cezaListele, cezaGetir, cezaSil,
  ihlalinArtir, ihlalinBul, ihlalinSifirla, ihlalinTemizle, ihlalListesi, sayacOtomatik,
  uyariEkle, uyariListesi, uyariSil, sunucuUyariListesi,
  silinenKaydet, silinenListesi,
  spamEkle, spamTemizle,
  kelimeEkle, kelimeSil, kelimeListesi,
  linkEkle, linkSil, linkListesi,
  sureyeMs, sureyiBicimle,
};
