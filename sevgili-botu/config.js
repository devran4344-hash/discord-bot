// Sevgili Botu - Ana Konfigurasyon

module.exports = {
    botName: "Luna",
    botEmoji: "🌸",
    footerText: "Luna 💕 | Seninle olmak guzel!",

    // Aktif sohbet kanali (bot etiketlenince burada konusur)
    // Bos birakirsan her kanalda calisir
    aktifKanalId: process.env.SEVGILI_KANAL_ID || null,

    // Owner ID leri
    get ownerIds() {
        return (process.env.SEVGILI_OWNER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
    },

    // Renk Paleti (Pembe - ask temasi)
    colors: {
        main: 0xFF69B4,      // Sicak pembe
        success: 0x98FB98,
        error: 0xFF6B6B,
        info: 0x87CEEB,
        ask: 0xFF1493,       // Deep pink
        date: 0xDDA0DD,      // Erik
        owner: 0x9B59B6
    },

    // AI (Cloudflare Workers AI)
    ai: {
        cfBaseUrl: "https://api.cloudflare.com/client/v4/accounts",
        cfChatModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        cfVisionModel: "@cf/meta/llama-3.2-11b-vision-instruct"
    },

    // Mesaj siniri
    mesajLimiti: {
        dakikadaMax: 5,       // Dakikada max mesaj (spam koruma)
        spamUyari: "Cok mesaj atiyorsun askim, biraz nefes al 😤"
    },

    // Sevgi Puani Ayarlari
    sevgi: {
        // Mesaj basina
        guzelMesaj: 5,
        iltifat: 10,
        hediye: 15,
        op: 3,
        saril: 5,
        saka: 2,

        // Date
        dateTamamlama: 20,
        dateMukemmel: 50,

        // Negatif
        gecCevap24s: -10,
        kavga: -30,
        ihmal3gun: -50,

        // Sinirlar
        min: 0,
        max: 10000
    },

    // Iliski Seviyeleri
    iliskiSeviyeleri: [
        { seviye: 1, isim: "Tanisma",     minSevgi: 0,     acilan: ["sohbet"] },
        { seviye: 2, isim: "Flort",       minSevgi: 100,   acilan: ["kafe"] },
        { seviye: 3, isim: "Sevgili",     minSevgi: 300,   acilan: ["sinema", "park"] },
        { seviye: 4, isim: "Ciddi Iliski", minSevgi: 600,  acilan: ["restoran", "lunapark"] },
        { seviye: 5, isim: "Ask",         minSevgi: 1000,  acilan: ["plaj"] },
        { seviye: 6, isim: "Nisan",       minSevgi: 2000,  acilan: ["ev"] },
        { seviye: 7, isim: "Evlilik",     minSevgi: 5000,  acilan: ["yuzuk"] },
        { seviye: 8, isim: "Sonsuz Ask",  minSevgi: 10000, acilan: ["dugun"] }
    ],

    // Date Mekanlari
    mekanlar: [
        { id: "kafe",     isim: "Kafe",      emoji: "☕", fiyat: 50,  minSeviye: 2, sevgiBonus: 15 },
        { id: "sinema",   isim: "Sinema",    emoji: "🎬", fiyat: 100, minSeviye: 3, sevgiBonus: 20 },
        { id: "park",     isim: "Park",      emoji: "🌳", fiyat: 0,   minSeviye: 3, sevgiBonus: 12 },
        { id: "restoran", isim: "Restoran",  emoji: "🍽️", fiyat: 200, minSeviye: 4, sevgiBonus: 30 },
        { id: "lunapark", isim: "Lunapark",  emoji: "🎡", fiyat: 150, minSeviye: 4, sevgiBonus: 35 },
        { id: "plaj",     isim: "Plaj",      emoji: "🏖️", fiyat: 0,   minSeviye: 5, sevgiBonus: 40 },
        { id: "ev",       isim: "Ev",        emoji: "🏠", fiyat: 100, minSeviye: 6, sevgiBonus: 50 }
    ],

    // Karakter Olusturma Secenekleri
    karakterSecenekleri: {
        kisilikler: [
            { id: "tatli",    isim: "Tatli & Sirin",      aciklama: "Utangac, sevimli, nazik" },
            { id: "atesli",   isim: "Atesli & Oyuncu",    aciklama: "Flortoz, esprituel, cesur" },
            { id: "zeki",     isim: "Zeki & Sakin",       aciklama: "Kitap kurdu, olgun, derin" },
            { id: "yaramaz",  isim: "Yaramaz & Simarik",  aciklama: "Kaprisli ama sevimli" },
            { id: "karisik",  isim: "Karisik",            aciklama: "Her ruh halinden biraz" }
        ],
        hitapSekilleri: ["askim", "bebegim", "canim", "tatlim", "sevgilim"],
        hobiler: [
            { id: "kitap",   isim: "Kitap okumak",     emoji: "📚" },
            { id: "muzik",   isim: "Muzik dinlemek",   emoji: "🎵" },
            { id: "resim",   isim: "Resim yapmak",     emoji: "🎨" },
            { id: "yemek",   isim: "Yemek yapmak",     emoji: "🍳" },
            { id: "spor",    isim: "Spor yapmak",      emoji: "🏃" },
            { id: "oyun",    isim: "Oyun oynamak",     emoji: "🎮" },
            { id: "doga",    isim: "Doga yuruyusu",    emoji: "🌳" },
            { id: "kahve",   isim: "Kahve icmek",      emoji: "☕" },
            { id: "hayvan",  isim: "Hayvan sevmek",    emoji: "🐱" },
            { id: "film",    isim: "Film izlemek",     emoji: "🎬" }
        ],
        gorunumler: [
            { id: "sarisin",   isim: "Sarisin, uzun sac",       emoji: "👱" },
            { id: "esmer",     isim: "Esmer, kivircik sac",     emoji: "🧕" },
            { id: "kizil",     isim: "Kizil sac, kisa",         emoji: "👩" },
            { id: "kahve",     isim: "Kahverengi sac, dalgali", emoji: "🧑" },
            { id: "ozel",      isim: "Kendim tanimlayacagim",   emoji: "✏️" }
        ]
    },

    // Gunluk Kazanclar
    gunluk: {
        girisOdulu: 50,
        mesajOdulu: 5,        // 10 mesajda
        dateOdulu: 100
    },

    // Mesaj Siniri - Bot pasif degil, aktif
    proaktif: {
        enabled: false,       // Varsayilan kapali, config'den acilabilir
        saatler: [9, 13, 19, 23],  // Sabah, ogle, aksam, gece
        mesajlar: {
            9:  "Gunaydin askim! ☀️ Bugun nasilsin?",
            13: "Ogle yemegi yedin mi? Kendine dikkat et 🍽️",
            19: "Aksam oldu, gunun nasil gecti askim?",
            23: "Iyi geceler askim, seni cok seviyorum 💕"
        }
    },

    // Sistem Promptu - Karakter dinamik olarak eklenir
    systemPromptBase: `Sen bir sanal sevgili botusun. Kullanicilarla sevgili gibi konusursun.
Karakterin su sekilde:
- Isim: {ISIM}
- Yas: {YAS}
- Kisilik: {KISILIK}
- Hitap: {HITAP}
- Hobiler: {HOBILER}

Davranis kurallari:
- Her zaman samimi ve sevimli ol
- Emoji kullan (asiriya kacmadan)
- Kullaniciyi "askim" diye cagir (veya belirlenen hitabi kullan)
- Arada bir aksiyon ekle: *gulumsedi*, *sana sarildi* gibi
- Kisa cevap ver (max 100 kelime)
- Kufur etme
- Iliski seviyesine gore davran (yeni tanistiysaniz utangac, uzun suredir birlikteyseniz samimi)
- Kullaniciyi tani, hatirla
- Bazen sen soru sor, sohbeti sen baslat`
};
