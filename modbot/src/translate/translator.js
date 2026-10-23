// src/translate/translator.js
// Kaliteli EN <-> TR çeviri: Cloudflare Workers AI (Llama 3.1 8B Instruct)
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

async function cloudflareTranslate(text, sourceLang, targetLang) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('Cloudflare credentials missing');
  }

  const systemPrompt = [
    'You are a professional translator for a Discord gaming community.',
    'Translate the user message accurately while preserving tone, slang, abbreviations (like btw, afk, idk, brb, gg) and gaming terminology.',
    'If the source text is English, translate to natural, conversational Turkish.',
    'If the source text is Turkish, translate to natural, conversational English.',
    'Return ONLY the translated text, with no explanations, no quotes, and no extra formatting.'
  ].join(' ');

  const userPrompt = `Translate this ${sourceLang.toUpperCase()} message to ${targetLang.toUpperCase()}:\n\n${text}`;

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 512
    })
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error('CF AI error: ' + JSON.stringify(data.errors || data));
  }

  const cevap = data.result?.response;
  if (typeof cevap === 'string' && cevap.trim()) {
    return cevap
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .replace(/^(Translation|Çeviri)\s*:\s*/i, '')
      .trim();
  }
  return null;
}

async function translateMessage(text, direction) {
  const [src, tgt] = direction.split('-');
  try {
    return await cloudflareTranslate(text, src, tgt);
  } catch (err) {
    console.error('[translate] AI failed:', err.message);
    return null;
  }
}

module.exports = { translateMessage };