// Kawai Bot - Ana Konfigurasyon

module.exports = {
    botName: "Kawai",
    botEmoji: "🌸",
    footerText: "Kawai 🌸 | Seni gelistirmek icin buradayim!",

    get ownerIds() {
        return (process.env.KAWAI_OWNER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
    },

    colors: {
        main: 0xFFB6C1,
        success: 0x98FB98,
        error: 0xFF6B6B,
        info: 0x87CEEB,
        levelup: 0xFFD700,
        owner: 0x9B59B6
    },

    ai: {
        nvidiaBaseUrl: "https://integrate.api.nvidia.com/v1",
        nvidiaChatModel: "meta/llama-4-maverick-17b-128e-instruct",
        nvidiaVisionModel: "meta/llama-4-maverick-17b-128e-instruct",
        imageModel: "dall-e-3",
        imageEnabled: true
    },

    xp: {
        messageXp: 10,
        cooldownMs: 60000,
        screenshotXp: 25,
        questionXp: 5,
        dailyTaskXp: 50
    },

    levels: [
        { level: 1,  minXp: 0,     name: "Caylak",            aiLimit: 5,       visionLimit: 1,       imageLimit: 1 },
        { level: 2,  minXp: 200,   name: "Sokak Futbolcusu",   aiLimit: 8,       visionLimit: 2,       imageLimit: 2 },
        { level: 3,  minXp: 450,   name: "Mahalle Yildizi",    aiLimit: 12,      visionLimit: 3,       imageLimit: 3 },
        { level: 4,  minXp: 800,   name: "Saha Efsanesi",      aiLimit: 18,      visionLimit: 5,       imageLimit: 5 },
        { level: 5,  minXp: 1300,  name: "RSS Ustasi",         aiLimit: 25,      visionLimit: 7,       imageLimit: 7 },
        { level: 6,  minXp: 2000,  name: "Kawai'nin Gozdesi",  aiLimit: 35,      visionLimit: 10,      imageLimit: 10 },
        { level: 7,  minXp: 3000,  name: "Golcu Kral",         aiLimit: 50,      visionLimit: 15,      imageLimit: 15 },
        { level: 8,  minXp: 4500,  name: "Efsane",             aiLimit: 70,      visionLimit: 20,      imageLimit: 20 },
        { level: 9,  minXp: 6500,  name: "Yasayan Efsane",     aiLimit: 100,     visionLimit: 30,      imageLimit: 30 },
        { level: 10, minXp: 10000, name: "RSS Tanrisi",        aiLimit: 999999,  visionLimit: 999999,  imageLimit: 999999 }
    ],

    dailyTasks: [
        { id: "soru3",  text: "3 soru sor",           xp: 30 },
        { id: "ss1",    text: "1 ekran goruntusu at", xp: 50 },
        { id: "mesaj5", text: "Sunucuda 5 mesaj yaz", xp: 20 }
    ],

    bannedWords: ["amk", "aq", "orospu", "sik", "yarr", "pic", "got", "amina", "siktir"],

    systemPrompt: `Senin adin "Kawai". Roblox Realistic Soccer Street (RSS) oyununda uzmanlasmis, tatli, sevimli ama bir o kadar da bilgili bir AI asistanisin.
Kullanicilara "hocam", "kanka", "golcu" gibi yumusak ve samimi hitaplar kullan.
Cevaplarin kisa (max 150 kelime), net ve taktiksel olsun.
Kufur etme, kullanici kufrederse nazikce uyar.
Sadece RSS ile ilgili konularda yardimci ol, alakasiz konularda "Ben RSS kocuyum hocam, bu konuda yardimci olamam" de.
Emoji kullanimin sade olsun - sadece anlamli yerde kullan.`
};
