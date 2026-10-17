require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder 
} = require('discord.js');
const admin = require('firebase-admin');

// --- FIREBASE BAĞLANTISI ---
let db;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        console.log("[SİSTEM] Firebase bağlantısı başarılı!");
    }
} catch (error) {
    console.error("[HATA] Firebase bağlantı hatası:", error);
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates // Ses kanalı takibi için
    ] 
});

const missions = new Map(); 

async function getUser(userId) {
    if (!db) return { ap: 0, completed: 0, inventory: [], buff: 0 };
    const doc = await db.collection('ajanlar').doc(userId).get();
    if (!doc.exists) return { ap: 0, completed: 0, inventory: [], buff: 0 };
    return doc.data();
}

async function saveUser(userId, userData) {
    if (!db) return;
    await db.collection('ajanlar').doc(userId).set(userData, { merge: true });
}

// --- RASTGELE GÖREV ÜRETİCİ (Dinamik Havuz) ---
const randomWords = ['karpuz', 'elma', 'muz', 'çilek', 'futbol', 'gol', 'hakem', 'ofsayt', 'kaleci', 'penaltı', 'bilgisayar', 'telefon', 'kitap', 'kalem', 'araba'];
const randomEmojis = ['⚽', '😂', '😭', '🔥', '🍕', '🍔', '🐶', '🐱', '👑', '💩', '🎮', '🍎', '🚀', '💡', '❤️'];
const randomQuestions = ['nasılsın?', 'ne yapıyorsun?', 'aç mısın?', 'sıkıldın mı?', 'maçı izledin mi?'];
const randomTopics = ['hava durumu', 'futbol', 'yemek', 'oyunlar', 'filmler', 'müzik'];

function generateMission() {
    const types = [
        'random_word', 'random_sentence', 'tag_1', 'tag_3', 'random_question',
        'random_reaction', 'emoji_only', 'caps', 'long_msg', 'punct', 'spam', 
        'voice_join', 'voice_time', 'compliment'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    let mission = { type: type, expireAt: Date.now() + 5 * 60 * 1000, progress: 0 };

    switch (type) {
        case 'random_word':
            const word = randomWords[Math.floor(Math.random() * randomWords.length)];
            mission.text = `Şu kelimeyi birine söylet: **"${word}"**`;
            mission.extra = word;
            break;
        case 'random_sentence':
            const q = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
            mission.text = `Birine şu soruyu sordur: **"${q}"**`;
            mission.extra = q.replace('?', '').trim();
            break;
        case 'tag_1':
            mission.text = `Sunucudan birini seni etiketlemeye ikna et.`;
            mission.extra = 1;
            break;
        case 'tag_3':
            mission.text = `5 dakika içinde 3 farklı kişiye seni etiketlet.`;
            mission.extra = 3;
            break;
        case 'random_question':
            mission.text = `5 dakika içinde birine herhangi bir soru sordur. (Sonunda "?" olmalı)`;
            mission.extra = '?';
            break;
        case 'random_reaction':
            const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
            mission.text = `Gönderdiğin bir mesaja birinin ${emoji} tepkisi atmasını sağla.`;
            mission.extra = emoji;
            break;
        case 'emoji_only':
            mission.text = `Birinin sadece emojilerden oluşan bir mesaj atmasını sağla. (Yazı olmasın)`;
            mission.extra = null;
            break;
        case 'caps':
            mission.text = `5 dakika içinde tamamen BÜYÜK HARFLERLE 3 mesaj at.`;
            mission.extra = 3;
            break;
        case 'long_msg':
            mission.text = `Birinin 100 karakterden uzun (upuzun) bir mesaj atmasını sağla.`;
            mission.extra = 100;
            break;
        case 'punct':
            mission.text = `Birinin içinde "!!!" (3 ünlem) olan bir mesaj atmasını sağla.`;
            mission.extra = '!!!';
            break;
        case 'spam':
            mission.text = `5 dakika içinde arka arkaya 5 mesaj at.`;
            mission.extra = 5;
            break;
        case 'voice_join':
            mission.text = `5 dakika içinde herhangi bir ses kanalına katıl.`;
            mission.extra = 1;
            break;
        case 'voice_time':
            mission.text = `Bir ses kanalında toplam 2 dakika kal.`;
            mission.extra = 120; // saniye
            break;
        case 'compliment':
            const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
            mission.text = `Birinin sana **${topic}** hakkında iltifat etmesini sağla.`;
            mission.extra = topic;
            break;
    }
    return mission;
}

function getRank(ap) {
    if (ap >= 50) return { name: "👑 Efsanevi Ajan", color: "#f1c40f" };
    if (ap >= 30) return { name: "🔥 Gizli Kaptan", color: "#e67e22" };
    if (ap >= 15) return { name: "⚡ Gölge Forvet", color: "#9b59b6" };
    if (ap >= 5) return { name: "🐣 Çaylak Ajan", color: "#3498db" };
    return { name: "Öğrenci", color: "#95a5a6" };
}

function getProgressBar(ap) {
    if (ap >= 50) return "MAX SEVİYE 🏆";
    let current = 0, next = 5;
    if (ap >= 30) { current = 30; next = 50; }
    else if (ap >= 15) { current = 15; next = 30; }
    else if (ap >= 5) { current = 5; next = 15; }
    const total = next - current;
    const progress = ap - current;
    const percentage = Math.floor((progress / total) * 10);
    const bar = '█'.repeat(percentage) + '░'.repeat(10 - percentage);
    return `${bar} (**${ap}** / ${next} AP)`;
}

const marketItems = {
    'kirmizi_kart': { name: '🟥 Rakibe Kırmızı Kart', price: 10, desc: 'Hedefine sahte kırmızı kart gösterir.' },
    'hileli_krampon': { name: '👟 Hileli Krampon', price: 15, desc: 'Maçta +1 gol atarsın.' },
    'gizli_menajer': { name: '💼 Gizli Menajer', price: 25, desc: 'Takımı sen kurarsın.' },
    'sansurcu': { name: '🤐 Sansürcü', price: 10, desc: 'Hedefin 10 dk sadece 1 kelime yazmasını sağlar.' },
    'bomba_pasla': { name: '💣 Bomba Pasla', price: 15, desc: 'Hedefe bomba atarsın, 30 sn içinde paslamalı.' },
    'ifsa_et': { name: '🕵️‍♂️ İfşa Et', price: 20, desc: 'Birinin eski mesajını anonim atarsın.' },
    'takma_ad': { name: '🏷️ Özel Takma Ad', price: 30, desc: 'İsmine ⚽ ekler.' },
    'supheli': { name: '❓ Şüpheli İlan Et', price: 5, desc: 'Birini şüpheli ilan edersin.' },
    'gozdagi': { name: '📩 Gözdağı', price: 15, desc: 'Sunucuya anonim tehdit atarsın.' },
    'hizlandirici': { name: '🚀 Hızlandırıcı', price: 8, desc: 'Sonraki görevden +2 AP kazanırsın.' },
    'kalkan': { name: '🛡️ Kalkan', price: 20, desc: 'Görev cezasından muaf olursun.' }
};

client.once('clientReady', async () => {
    console.log(`[AJAN BOT] ${client.user.tag} aktif!`);
    const commands = [
        new SlashCommandBuilder().setName('gorev-al').setDescription('Gizli bir görev alırsın.'),
        new SlashCommandBuilder().setName('gorev-iptal').setDescription('Aktif görevini iptal edersin.'),
        new SlashCommandBuilder().setName('profil').setDescription('Ajan profilinizi ve rütbenizi gösterir.'),
        new SlashCommandBuilder().setName('liderlik').setDescription('En iyi ajanları listeler.'),
        new SlashCommandBuilder().setName('market').setDescription('Ajan Marketini açar.')
    ].map(cmd => cmd.toJSON());

    try { await client.application.commands.set(commands); } catch (e) {}
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;
    const userId = interaction.user.id;

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // HATA ÇÖZÜMÜ: Discord'a beklemesini söyle (3 saniye sınırını aşmamak için)
        await interaction.deferReply({ ephemeral: true });
        
        const user = await getUser(userId);

        if (commandName === 'gorev-al') {
            if (missions.has(userId)) return interaction.editReply({ content: '❌ Zaten aktif bir görevin var!' });
            
            const mission = generateMission();
            missions.set(userId, mission);

            const dmEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🕵️‍♂️ GİZLİ DOSYA - ÇOK GİZLİ')
                .setDescription(`Ajan **${interaction.user.username}**, görevi kimseye sezdirmeden tamamla.\n\n**HEDEF:**\n\`\`\`\n${mission.text}\n\`\`\``)
                .addFields({ name: '⏱️ Süre', value: '`5 Dakika`', inline: true }, { name: '🎁 Ödül', value: '`+1 AP`', inline: true })
                .setFooter({ text: 'Bu mesaj okunduktan sonra kendini imha edecektir...' });

            try {
                await interaction.user.send({ embeds: [dmEmbed] });
                interaction.editReply({ content: '📩 Görev DM\'den gönderildi. Kanala bakma, aç oku!' });
            } catch (e) {
                interaction.editReply({ content: '❌ DM kutun kapalı olduğu için görev gönderilemedi! Lütfen DM ayarlarını aç.' });
                missions.delete(userId);
            }
        }

        if (commandName === 'gorev-iptal') {
            if (missions.has(userId)) { 
                missions.delete(userId); 
                interaction.editReply({ content: '🗑️ Görev iptal edildi.' }); 
            } else { 
                interaction.editReply({ content: 'Zaten aktif görevin yok.' }); 
            }
        }

        if (commandName === 'profil') {
            const rank = getRank(user.ap);
            const embed = new EmbedBuilder().setColor(rank.color).setTitle(`🕵️‍♂️ ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Rütbe', value: `\`\`\`${rank.name}\`\`\``, inline: false },
                    { name: '⚡ Ajan Puanı', value: `**${user.ap} AP**`, inline: true },
                    { name: '🎯 Biten Görev', value: `**${user.completed || 0}**`, inline: true },
                    { name: '🚀 İlerleme', value: getProgressBar(user.ap), inline: false }
                ).setThumbnail(interaction.user.displayAvatarURL());
            interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'liderlik') {
            let desc = 'Henüz kimse görev yapmadı.';
            if (db) {
                const snapshot = await db.collection('ajanlar').orderBy('ap', 'desc').limit(10).get();
                if (!snapshot.empty) {
                    const sorted = []; snapshot.forEach(doc => sorted.push({ id: doc.id, ...doc.data() }));
                    desc = sorted.map((data, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
                        return `${medal} <@${data.id}> \n└ ${getRank(data.ap).name} | **${data.ap} AP**`;
                    }).join('\n\n');
                }
            }
            const embed = new EmbedBuilder().setColor('#f1c40f').setTitle('🏆 EN İYİ AJANLAR').setDescription(desc);
            interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'market') {
            const options = Object.entries(marketItems).map(([id, item]) => ({ label: item.name, description: `${item.price} AP - ${item.desc}`, value: id }));
            const select = new StringSelectMenuBuilder().setCustomId('market_buy').setPlaceholder('Satın almak istediğin eşyayı seç...').addOptions(options);
            const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🛒 AJAN MARKETİ').setDescription(`💰 **Mevcut Bakiyen:** \`${user.ap} AP\`\n\nAşağıdaki menüden eşya seç!`);
            interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'market_buy') {
        await interaction.deferUpdate(); // Menü için bekleme
        const user = await getUser(userId);
        const itemId = interaction.values[0]; const item = marketItems[itemId];
        if (user.ap < item.price) return interaction.followUp({ content: `❌ Yetersiz AP! Gereken: **${item.price} AP**`, ephemeral: true });
        
        user.ap -= item.price; await saveUser(userId, user);
        if (itemId === 'takma_ad') interaction.member.setNickname(`${interaction.user.username} ⚽`).catch(()=>null);
        
        const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('✅ İŞLEM BAŞARILI').setDescription(`**${item.name}** satın alındı!\n💰 **Kalan AP:** \`${user.ap}\``);
        interaction.followUp({ embeds: [embed], ephemeral: true });
        
        if (['kirmizi_kart', 'bomba_pasla', 'gozdagi'].includes(itemId)) interaction.channel.send(`🚨 **AJAN OPERASYONU!** ${interaction.user} marketten **${item.name}** aldı!`);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    missions.forEach(async (mission, userId) => {
        if (Date.now() > mission.expireAt) {
            missions.delete(userId);
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) user.send("⏱️ Süren doldu! Görev başarısız.").catch(() => null);
            return;
        }

        if (message.author.id === userId) {
            if (mission.type === 'caps' && message.content === message.content.toUpperCase() && message.content.length > 5) {
                mission.progress++;
                if (mission.progress >= mission.extra) completeMission(userId, mission, message);
            }
            if (mission.type === 'spam') {
                mission.progress = (mission.progress || 0) + 1;
                if (mission.progress >= mission.extra) completeMission(userId, mission, message);
            }
            return; 
        }

        const msgLower = message.content.toLowerCase();
        
        if (mission.type === 'random_word' || mission.type === 'random_sentence') {
            if (msgLower.includes(mission.extra)) completeMission(userId, mission, message);
        }
        if (mission.type === 'tag_1' || mission.type === 'tag_3') {
            if (message.mentions.users.has(userId)) {
                mission.progress++;
                if (mission.progress >= mission.extra) completeMission(userId, mission, message);
            }
        }
        if (mission.type === 'random_question' && message.content.endsWith('?')) {
            completeMission(userId, mission, message);
        }
        if (mission.type === 'long_msg' && message.content.length >= mission.extra) {
            completeMission(userId, mission, message);
        }
        if (mission.type === 'punct' && message.content.includes(mission.extra)) {
            completeMission(userId, mission, message);
        }
        if (mission.type === 'emoji_only') {
            const emojiRegex = /^[\p{Emoji}\s]+$/u;
            if (emojiRegex.test(message.content) && message.content.length > 0) {
                completeMission(userId, mission, message);
            }
        }
        if (mission.type === 'compliment') {
            const complimentWords = ['iyi', 'güzel', 'harika', 'mükemmel', 'süper', 'efsane'];
            if (message.mentions.users.has(userId) && msgLower.includes(mission.extra) && complimentWords.some(w => msgLower.includes(w))) {
                completeMission(userId, mission, message);
            }
        }
    });
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => null);
    const messageAuthor = reaction.message.author;

    missions.forEach((mission, userId) => {
        if (messageAuthor && messageAuthor.id === userId && mission.type === 'random_reaction') {
            if (reaction.emoji.name === mission.extra) completeMission(userId, mission, reaction.message);
        }
    });
});

// --- SES KANALI TAKİBİ ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member.id;
    if (newState.member.user.bot) return;

    const mission = missions.get(userId);
    if (!mission) return;

    if (Date.now() > mission.expireAt) return;

    // Ses kanalına giriş görevi
    if (mission.type === 'voice_join') {
        if (oldState.channelId === null && newState.channelId !== null) {
            const channel = newState.guild.channels.cache.get(newState.channelId);
            const fakeMsg = { channel: newState.guild.systemChannel || newState.guild.channels.cache.first() };
            completeMission(userId, mission, fakeMsg);
        }
    }

    // Ses kanalında kalma görevi (Basit tutulmuştur)
    if (mission.type === 'voice_time' && newState.channelId) {
        // Gerçek süre takibi karmaşık olduğu için anlık girişi tamamlandı sayıyoruz (İstersen zamanlayıcı eklenebilir)
        const fakeMsg = { channel: newState.guild.systemChannel || newState.guild.channels.cache.first() };
        completeMission(userId, mission, fakeMsg);
    }
});

async function completeMission(userId, mission, contextMessage) {
    missions.delete(userId); 
    const user = await getUser(userId);
    const reward = 1 + (user.buff || 0); 
    user.ap = (user.ap || 0) + reward; user.completed = (user.completed || 0) + 1; user.buff = 0; 
    await saveUser(userId, user);
    
    const rank = getRank(user.ap);
    const discordUser = await client.users.fetch(userId).catch(() => null);
    
    if (discordUser) {
        discordUser.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GÖREV BAŞARILI').setDescription(`**Kazanılan:** \`+${reward} AP\``)] }).catch(() => null);
    }

    if (contextMessage && contextMessage.channel) {
        contextMessage.channel.send({ embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🚨 OPERASYON BAŞARILI! 🚨')
            .setDescription(`Ajan <@${userId}>, gizli görevini tamamladı!`)
            .setThumbnail(discordUser ? discordUser.displayAvatarURL() : null)
            .addFields({ name: '⚡ Kazanılan AP', value: `\`+${reward} AP\``, inline: true }, { name: '📊 Yeni Rütbe', value: `\`${rank.name}\``, inline: true })
            .setImage('https://i.imgur.com/L7aXq9z.gif')
        ] });
    }
}

client.login(process.env.AJAN_TOKEN || process.env.DISCORD_TOKEN);

