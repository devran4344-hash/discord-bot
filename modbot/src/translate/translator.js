// src/translate/translator.js
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_MODEL      = '@cf/meta/m2m100-1.2b';

const ABBREVIATIONS = {
  btw: 'bu arada', afk: 'klavyeden uzaktayım', brb: 'birazdan döneceğim',
  idk: 'bilmiyorum', tbh: 'dürüst olmak gerekirse', imo: 'bence',
  nvm: 'boşver', omw: 'yoldayım', irl: 'gerçek hayatta',
  ngl: 'yalan söylemeyeceğim', smh: 'kafamı sallıyorum', fr: 'gerçekten',
  lowkey: 'hafiften', highkey: 'fazlasıyla', gg: 'iyi oyun',
  wp: 'iyi oynadın', gl: 'iyi şanslar', hf: 'iyi eğlenceler',
  ty: 'teşekkürler', np: 'sorun değil', yw: 'rica ederim',
  wdym: 'ne demek istiyorsun', wyd: 'ne yapıyorsun', wbu: 'sen nasılsın',
  hbu: 'sen nasılsın', asl: 'yaş cinsiyet konum', bbl: 'sonra döneceğim',
  gtg: 'gitmem gerek', g2g: 'gitmem gerek', lol: 'kahkaha',
  lmao: 'çok güldüm', rofl: 'yerlerdeyim', ily: 'seni seviyorum',
  imy: 'seni özledim', dm: 'özel mesaj', pm: 'özel mesaj',
  fyi: 'bilgin olsun', asap: 'en kısa sürede', bbs: 'sonra görüşürüz',
  cya: 'görüşürüz', rn: 'şu anda', atm: 'şu anda',
  fomo: 'kaçırma korkusu', tldr: 'uzun lafın kısası', hmu: 'bana yaz',
  tbf: 'adil olmak gerekirse', iirc: 'yanlış hatırlamıyorsam', jk: 'şaka yapıyorum',
  ikr: 'değil mi', ofc: 'tabii ki', obv: 'belli ki',
  pls: 'lütfen', plz: 'lütfen', thx: 'teşekkürler',
  tyvm: 'çok teşekkürler', gn: 'iyi geceler', gm: 'günaydın',
  ge: 'iyi akşamlar'
};

function expandAbbreviations(text) {
  let out = text;
  for (const [abbr, tr] of Object.entries(ABBREVIATIONS)) {
    const re = new RegExp('\\b' + abbr + '\\b', 'gi');
    out = out.replace(re, tr);
  }
  return out;
}

async function cloudflareTranslate(text, sourceLang, targetLang) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error('Cloudflare credentials missing');
  const url = 'https://api.cloudflare.com/client/v4/accounts/' + CF_ACCOUNT_ID + '/ai/run/' + CF_MODEL;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + CF_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang })
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error('CF AI error: ' + JSON.stringify(data.errors || data));
  const r = data.result;
  if (!r) return null;
  if (typeof r === 'string') return r;
  return r.translated_text || r.translation || r.text || null;
}

async function translateMessage(text, direction) {
  const parts = direction.split('-');
  const src = parts[0], tgt = parts[1];
  const trimmedLower = text.trim().toLowerCase();
  if (src === 'en' && ABBREVIATIONS[trimmedLower]) return ABBREVIATIONS[trimmedLower];
  try {
    const translated = await cloudflareTranslate(text, src, tgt);
    if (translated && translated.trim()) return translated;
  } catch (err) {
    console.error('[translate] AI failed:', err.message);
  }
  return src === 'en' ? expandAbbreviations(text) : text;
}

module.exports = { translateMessage, expandAbbreviations, ABBREVIATIONS };