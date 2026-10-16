// Cloudflare Workers AI - Sohbet ve Vision
const config = require('../config');

const CF_ACCOUNT_ID = process.env.KAWAI_CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.KAWAI_CF_API_TOKEN;
const CF_BASE = `${config.ai.cfBaseUrl}/${CF_ACCOUNT_ID}/ai/run`;

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
        throw new Error(`CF API hatasi (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.result?.response || '';
}

// Karakter bilgisine gore dinamik system prompt olustur
function buildSystemPrompt(karakter, iliski, hatiralar) {
    let prompt = config.systemPromptBase
        .replace('{ISIM}', karakter.isim || 'Luna')
        .replace('{YAS}', karakter.yas || '22')
        .replace('{KISILIK}', karakter.kisilik || 'tatli')
        .replace('{HITAP}', karakter.hitap || 'askim')
        .replace('{HOBILER}', (karakter.hobiler || []).join(', ') || 'kitap, kahve');

    prompt += `\n\nIliski Durumu:
- Sevgi Puani: ${iliski.sevgiPuani || 0}
- Seviye: ${iliski.seviye || 1}
- Ruh Hali: ${iliski.ruhHali || 'mutlu'}`;

    if (iliski.kavgaSebebi) {
        prompt += `\n- KULLANICIYA KIZGINSIN! Sebep: ${iliski.kavgaSebebi}. Kisa ve ters cevap ver.`;
    }

    if (hatiralar && Object.keys(hatiralar).length > 0) {
        prompt += `\n\nHatiralar (bunlari hatirla):`;
        for (const [k, v] of Object.entries(hatiralar)) {
            prompt += `\n- ${k}: ${v}`;
        }
    }

    return prompt;
}

// Ana sohbet
async function sohbet(userMessage, karakter, iliski, hatiralar, gecmis) {
    const messages = [
        { role: 'system', content: buildSystemPrompt(karakter, iliski, hatiralar) }
    ];

    // Son 10 mesaji ekle (baglam icin)
    if (gecmis && gecmis.length > 0) {
        const son10 = gecmis.slice(-10);
        for (const m of son10) {
            messages.push({ role: m.rol, content: m.mesaj });
        }
    }

    messages.push({ role: 'user', content: userMessage });
    return callCF(config.ai.cfChatModel, messages, 400);
}

// Date sahnesi icin ozel
async function dateSahnesi(sahneTipi, karakter, iliski, kullaniciSecim, baglam) {
    const messages = [
        {
            role: 'system',
            content: buildSystemPrompt(karakter, iliski, {}) +
                `\n\nSu an kullanicinla bir DATE'tesin. Sahne: ${sahneTipi}.
Onceki baglam: ${baglam || 'Date yeni basladi.'}
Kullanicinin secimi: ${kullaniciSecim || 'Henuz secim yok'}

KURAL: Kisa bir sahne yaz (max 80 kelime), aksiyonlarla birlikte (*parantez icinde*).
Sonunda kullaniciya 2-3 secenek sun veya bir soru sor.`
        },
        { role: 'user', content: kullaniciSecim || 'Baslayalim' }
    ];

    return callCF(config.ai.cfChatModel, messages, 400);
}

// Bot aktif mesaj atsin (proaktif)
async function proaktifMesaj(karakter, iliski, saat) {
    const mesajlar = config.proaktif.mesajlar[saat] || "Seni ozledim askim 💕";
    const messages = [
        {
            role: 'system',
            content: buildSystemPrompt(karakter, iliski, {}) +
                `\n\nKullaniciya KENDILIGINDEN mesaj atiyorsun (o sana yazmadi).
Saat: ${saat}:00
Temel mesaj: "${mesajlar}"

KURAL: Bu mesaji karakterine uygun sekilde genislet. Max 60 kelime. Samimi ve dogal olsun.`
        },
        { role: 'user', content: 'Mesaj yaz' }
    ];

    return callCF(config.ai.cfChatModel, messages, 300);
}

// Saka yap
async function saka(karakter) {
    const messages = [
        { role: 'system', content: `Sen ${karakter.isim} adinda bir sanal sevgilisin. Kullaniciya sevimli bir saka yap. Max 50 kelime. Sonunda emoji ekle.` },
        { role: 'user', content: 'Bana bir saka yap' }
    ];
    return callCF(config.ai.cfChatModel, messages, 200);
}

// Siir yaz
async function siir(karakter, kullaniciAdi) {
    const messages = [
        { role: 'system', content: `Sen ${karakter.isim} adinda bir sanal sevgilisin. ${kullaniciAdi} icin kisa ve romantik bir siir yaz. 4-8 satir. Cok guzel olsun.` },
        { role: 'user', content: 'Bana bir siir yaz' }
    ];
    return callCF(config.ai.cfChatModel, messages, 300);
}

module.exports = {
    callCF,
    sohbet,
    dateSahnesi,
    proaktifMesaj,
    saka,
    siir,
    buildSystemPrompt
};
