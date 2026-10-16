// Cloudflare Workers AI - Sohbet + Vision
const config = require('../config');

const CF_ACCOUNT_ID = process.env.KAWAI_CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.KAWAI_CF_API_TOKEN;
const CF_BASE = `${config.ai.cfBaseUrl}/${CF_ACCOUNT_ID}/ai/run`;

function filterBadWords(text) {
    if (!text) return text;
    let out = text;
    for (const word of config.bannedWords) {
        const re = new RegExp(word, 'gi');
        out = out.replace(re, '*'.repeat(word.length));
    }
    return out;
}

async function callCF(model, messages, maxTokens = 500) {
    const res = await fetch(`${CF_BASE}/${model}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, max_tokens: maxTokens })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cloudflare API hatasi (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.result?.response || '';
}

async function askAI(userMessage, memorySummary) {
    const messages = [
        { role: 'system', content: config.systemPrompt + `\nKullanici Hafizasi: ${memorySummary || 'Yeni oyuncu.'}` },
        { role: 'user', content: userMessage }
    ];
    return filterBadWords(await callCF(config.ai.cfChatModel, messages, 500));
}

async function analyzeScreenshot(imageUrl, userMessage) {
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString('base64');

    const messages = [
        {
            role: 'system',
            content: config.systemPrompt +
                ' Kullanici sana oyun ici bir ekran goruntusu atti. Bu fotograftaki pozisyonu analiz et. Top kimde, defans nerede, oyuncu ne yapmali? Taktiksel ve motive edici bir yorum yap.'
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: userMessage || 'Bu pozisyonu analiz et' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
        }
    ];

    return filterBadWords(await callCF(config.ai.cfVisionModel, messages, 600));
}

async function askWiki(question) {
    const messages = [
        { role: 'system', content: config.systemPrompt + ' Kullanici RSS Wiki hakkinda soru soruyor. RSS oyunundaki skiller, karakterler, mekanlar hakkinda bilgi ver.' },
        { role: 'user', content: question }
    ];
    return filterBadWords(await callCF(config.ai.cfChatModel, messages, 500));
}

async function getTactic(situation) {
    const messages = [
        { role: 'system', content: config.systemPrompt + ' Kullanici oyun icinde taktik onerisi istiyor. Kisa ve net bir taktik ver.' },
        { role: 'user', content: situation }
    ];
    return filterBadWords(await callCF(config.ai.cfChatModel, messages, 400));
}

async function analyzeMatch(stats) {
    const messages = [
        { role: 'system', content: config.systemPrompt + ' Kullanici mac istatistiklerini paylasti. Yorumla, gelisim onerileri ver.' },
        { role: 'user', content: stats }
    ];
    return filterBadWords(await callCF(config.ai.cfChatModel, messages, 500));
}

async function webSearch(query) {
    const messages = [
        { role: 'system', content: config.systemPrompt + ' Kullanici bir konuyu arastirmani istiyor. Bildigin kadariyla en dogru bilgiyi ver.' },
        { role: 'user', content: query }
    ];
    return filterBadWords(await callCF(config.ai.cfChatModel, messages, 500));
}

async function generateImage(prompt) {
    throw new Error('Gorsel uretme su an devre disi.');
}

module.exports = {
    askAI,
    analyzeScreenshot,
    askWiki,
    getTactic,
    analyzeMatch,
    webSearch,
    generateImage,
    filterBadWords
};
