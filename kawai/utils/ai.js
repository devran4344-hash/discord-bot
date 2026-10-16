// NVIDIA NIM (sohbet + vision) + OpenAI (DALL-E gorsel uretme)
const OpenAI = require('openai');
const config = require('../config');

const nvidia = new OpenAI({
    baseURL: config.ai.nvidiaBaseUrl,
    apiKey: process.env.KAWAI_NVIDIA_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.KAWAI_OPENAI_API_KEY
});

// Kufur filtresi
function filterBadWords(text) {
    if (!text) return text;
    let out = text;
    for (const word of config.bannedWords) {
        const re = new RegExp(word, 'gi');
        out = out.replace(re, '*'.repeat(word.length));
    }
    return out;
}

// Sohbet
async function askAI(userMessage, memorySummary) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaChatModel,
        messages: [
            { role: 'system', content: config.systemPrompt + `\nKullanici Hafizasi: ${memorySummary || 'Yeni oyuncu.'}` },
            { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7
    });
    return filterBadWords(response.choices[0].message.content);
}

// Vision (SS analizi)
async function analyzeScreenshot(imageUrl, userMessage) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaVisionModel,
        messages: [
            {
                role: 'system',
                content: config.systemPrompt +
                    ' Kullanici sana oyun ici bir ekran goruntusu atti. Bu fotograftaki pozisyonu analiz et. Top kimde, defans nerede, oyuncu ne yapmali (sut mu, pas mi, dribling mi)? Taktiksel ve motive edici bir yorum yap.'
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userMessage || 'Bu pozisyonu analiz et' },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ]
            }
        ],
        max_tokens: 600,
        temperature: 0.7
    });
    return filterBadWords(response.choices[0].message.content);
}

// Wiki (RSS bilgisi)
async function askWiki(question) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaChatModel,
        messages: [
            {
                role: 'system',
                content: config.systemPrompt +
                    ' Kullanici RSS Wiki hakkinda soru soruyor. RSS oyunundaki skiller, karakterler, mekanlar ve mekanikler hakkinda bildigin her seyi kullanarak bilgi ver.'
            },
            { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.5
    });
    return filterBadWords(response.choices[0].message.content);
}

// Taktik onerisi
async function getTactic(situation) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaChatModel,
        messages: [
            {
                role: 'system',
                content: config.systemPrompt +
                    ' Kullanici oyun icinde bir taktik onerisi istiyor. Kisa, net ve uygulanabilir bir taktik ver.'
            },
            { role: 'user', content: situation }
        ],
        max_tokens: 400,
        temperature: 0.7
    });
    return filterBadWords(response.choices[0].message.content);
}

// Mac analizi
async function analyzeMatch(stats) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaChatModel,
        messages: [
            {
                role: 'system',
                content: config.systemPrompt +
                    ' Kullanici mac istatistiklerini paylasti. Bu istatistikleri yorumla, guclu ve zayif yonlerini soyle, gelisim onerileri ver.'
            },
            { role: 'user', content: stats }
        ],
        max_tokens: 500,
        temperature: 0.6
    });
    return filterBadWords(response.choices[0].message.content);
}

// Internet aramasi (NVIDIA NIM uzerinden - basit cevap)
async function webSearch(query) {
    const response = await nvidia.chat.completions.create({
        model: config.ai.nvidiaChatModel,
        messages: [
            {
                role: 'system',
                content: config.systemPrompt +
                    ' Kullanici bir konuyu arastirmani istiyor. Bildigin kadariyla en guncel ve dogru bilgiyi ver. Eger kesin bilmiyorsan "bu konuda kesin bilgim yok" de.'
            },
            { role: 'user', content: query }
        ],
        max_tokens: 500,
        temperature: 0.5
    });
    return filterBadWords(response.choices[0].message.content);
}

// DALL-E ile gorsel uretme
async function generateImage(prompt) {
    if (!config.ai.imageEnabled) {
        throw new Error('Gorsel uretme su an devre disi.');
    }
    const response = await openai.images.generate({
        model: config.ai.imageModel,
        prompt: `Roblox Realistic Soccer Street tarzinda, ${prompt}`,
        n: 1,
        size: '1024x1024'
    });
    return response.data[0].url;
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
