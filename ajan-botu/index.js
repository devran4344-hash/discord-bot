require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder 
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
        GatewayIntentBits.GuildVoiceStates
    ] 
});

const missions = new Map(); 
const activeBombs = new Map(); 
const forcedTags = new Map(); 

async function getUser(userId) {
    if (!db) return { ap: 0, completed: 0, inventory: [], buff: 0, shield: false };
    const doc = await db.collection('ajanlar').doc(userId).get();
    if (!doc.exists) return { ap: 0, completed: 0, inventory: [], buff: 0, shield: false };
    return doc.data();
}

async function saveUser(userId, userData) {
    if (!db) return;
    await db.collection('ajanlar').doc(userId).set(userData, { merge: true });
}

function getRank(ap) {
    if (ap >= 50) return { name: "?? Efsanevi Ajan", color: "#f1c40f" };
    if (ap >= 30) return { name: "?? Gizli Kaptan", color: "#e67e22" };
    if (ap >= 15) return { name: "? Gölge Forvet", color: "#9b59b6" };
    if (ap >= 5) return { name: "?? Çaylak Ajan", color: "#3498db" };
    return { name: "Öğrenci", color: "#95a5a6" };
}

function getProgressBar(ap) {
    if (ap >= 50) return "MAX SEVİYE ??";
    let current = 0, next = 5;
    if (ap >= 30) { current = 30; next = 50; }
    else if (ap >= 15) { current = 15; next = 30; }
    else if (ap >= 5) { current = 5; next = 15; }
    const total = next - current;
    const progress = ap - current;
    const percentage = Math.floor((progress / total) * 10);
    const bar = '-'.repeat(percentage) + '-'.repeat(10 - percentage);
    return `${bar} (**${ap}** / ${next} AP)`;
}

// --- YENİLENMİŞ VE OP MARKET ---
const marketItems = {
    'bedava_kutu': { name: '?? Bedava Şans Kutusu', price: 0, desc: 'İçinden 1-5 arası AP çıkabilir! (Bedava)', needsTarget: false },
    'kraliyet_muhru': { name: '?? Kraliyet Mührü', price: 100, desc: 'Hedefin TÜM AP\'sini SIFIRLAR! (Çok OP)', needsTarget: true },
    'ap_cal': { name: '?? AP Çal', price: 25, desc: 'Hedefin kasasından 3 AP çalıp sana ekler.', needsTarget: true },
    'bomba_pasla': { name: '?? Bomba Pasla', price: 15, desc: 'Hedefe bomba atarsın, 30 sn içinde paslamalı.', needsTarget: true },
    'ifsa_et': { name: '????>? İfşa Et', price: 20, desc: 'Birinin eski mesajını anonim atarsın.', needsTarget: true },
    'gorev_kesif': { name: '????>? Görev Keşif', price: 15, desc: 'Hedefin aktif görevini herkese ifşa eder!', needsTarget: true },
    'zorla_etiket': { name: '?? Zorla Etiket', price: 10, desc: 'Hedef, bir sonraki mesajında seni etiketlemek zorunda.', needsTarget: true },
    'sahte_hapis': { name: '?? Sahte Hapis', price: 12, desc: 'Hedefi 1 dakikalığına hapse tıkar (Eğlence amaçlı).', needsTarget: true },
    'tokata_at': { name: '?? Tokat At', price: 5, desc: 'Hedefe komik bir tokat GIF\'i atar.', needsTarget: true },
    'ters_psikoloji': { name: '?? Ters Psikoloji', price: 15, desc: 'Hedef sana cevap verirse +3 AP kazanırsın.', needsTarget: true },
    'hizlandirici': { name: '?? Hızlandırıcı', price: 8, desc: 'Sonraki görevden +2 bonus AP kazanırsın.', needsTarget: false },
    'kalkan': { name: '??? Kalkan', price: 20, desc: 'Bir sonraki başarısız görev cezasından muaf olursun.', needsTarget: false }
};

// --- DENGELENMİŞ GÖREV ÜRETİCİ (Zor görevler kaldırıldı) ---
const randomWords = ['karpuz', 'elma', 'futbol', 'gol', 'hakem', 'ofsayt', 'kaleci', 'penaltı'];
const randomEmojis = ['?', '??', '??', '??', '??', '??', '??', '??'];
const randomQuestions = ['nasılsın?', 'ne yapıyorsun?', 'maçı izledin mi?'];
function generateMission() {
    const types = ['random_word', 'tag_2', 'random_question', 'random_reaction', 'emoji_only', 'caps'];
    const type = types[Math.floor(Math.random() * types.length)];
    let mission = { type: type, expireAt: Date.now() + 5 * 60 * 1000, progress: 0 };
    if (type === 'random_word') {
        const word = randomWords[Math.floor(Math.random() * randomWords.length)];
        mission.text = `Şu kelimeyi birine söylet: **"${word}"**`; mission.extra = word;
    } else if (type === 'tag_2') {
        mission.text = `5 dakika içinde 2 farklı kişiye seni etiketlet.`; mission.extra = 2; // 3'ten 2'ye düşürüldü
    } else if (type === 'random_question') {
        mission.text = `Birine soru sordur.`; mission.extra = '?';
    } else if (type === 'random_reaction') {
        const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
        mission.text = `Attığın bir mesaja ${emoji} tepkisi aldır.`; mission.extra = emoji;
    } else if (type === 'emoji_only') {
        mission.text = `Birinin sadece emojilerden oluşan bir mesaj atmasını sağla.`; mission.extra = null;
    } else if (type === 'caps') {
        mission.text = `BÜYÜK HARFLERLE 2 mesaj at.`; mission.extra = 2; // 3'ten 2'ye düşürüldü
    }
    return mission;
}

client.once('clientReady', async () => {
    console.log(`[AJAN BOT] ${client.user.tag} aktif!`);
    const commands = [
        new SlashCommandBuilder().setName('gorev-al').setDescription('Gizli bir görev alırsın.'),
        new SlashCommandBuilder().setName('gorev-iptal').setDescription('Aktif görevini iptal edersin.'),
        new SlashCommandBuilder().setName('profil').setDescription('Ajan profilinizi gösterir.'),
        new SlashCommandBuilder().setName('liderlik').setDescription('En iyi ajanları listeler.'),
        new SlashCommandBuilder().setName('market').setDescription('Ajan Marketini açar.'),
        // OWNER KOMUTLARI
        new SlashCommandBuilder()
            .setName('ap-ver')
            .setDescription('[OWNER] Hedefe AP verir.')
            .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef').setRequired(true))
            .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar').setRequired(true)),
        new SlashCommandBuilder()
            .setName('ap-kaldir')
            .setDescription('[OWNER] Hedefin AP\'sini siler.')
            .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef').setRequired(true))
            .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar').setRequired(true))
    ].map(cmd => cmd.toJSON());
    try { await client.application.commands.set(commands); } catch (e) {}
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu()) return;
    const userId = interaction.user.id;
    const user = await getUser(userId);

    // --- SLASH KOMUTLARI ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        
        // OWNER KONTROLÜ
        const ownerId = process.env.OWNER_ID;
        if (['ap-ver', 'ap-kaldir'].includes(commandName) && userId !== ownerId) {
            return interaction.reply({ content: '? Bu komutu sadece botun sahibi kullanabilir!', flags: 64 });
        }

        try {
                    await interaction.deferReply({ flags: 64 });
                } catch (e) {
                    if (e.code === 10062) return; // Süresi geçmiş etkileşimleri yoksay
                    throw e;
                }

        if (commandName === 'gorev-al') {
            if (missions.has(userId)) return interaction.editReply({ content: '? Zaten aktif bir görevin var!' });
            const mission = generateMission();
            missions.set(userId, mission);

            const dmEmbed = new EmbedBuilder().setColor('#e74c3c').setTitle('????>? GİZLİ DOSYA')
                .setDescription(`Ajan **${interaction.user.username}**, görevi tamamla.\n\n**HEDEF:**\n\`\`\`\n${mission.text}\n\`\`\``)
                .addFields({ name: '?? Süre', value: '`5 Dakika`', inline: true }, { name: '?? Ödül', value: '`1 veya 2 AP (Şansa Bağlı)`', inline: true });
            try {
                await interaction.user.send({ embeds: [dmEmbed] });
                interaction.editReply({ content: '?? Görev DM\'den gönderildi.' });
            } catch (e) {
                interaction.editReply({ content: '? DM kutun kapalı!' });
                missions.delete(userId);
            }
        }

        if (commandName === 'gorev-iptal') {
            if (missions.has(userId)) { missions.delete(userId); interaction.editReply({ content: '??? Görev iptal edildi.' }); }
            else { interaction.editReply({ content: 'Zaten aktif görevin yok.' }); }
        }

        if (commandName === 'profil') {
            const rank = getRank(user.ap);
            const embed = new EmbedBuilder().setColor(rank.color).setTitle(`????>? ${interaction.user.username}`)
                .addFields(
                    { name: '?? Rütbe', value: `\`\`\`${rank.name}\`\`\``, inline: false },
                    { name: '? Ajan Puanı', value: `**${user.ap} AP**`, inline: true },
                    { name: '?? İlerleme', value: getProgressBar(user.ap), inline: false }
                );
            interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'liderlik') {
            let desc = 'Henüz kimse görev yapmadı.';
            if (db) {
                const snapshot = await db.collection('ajanlar').orderBy('ap', 'desc').limit(10).get();
                if (!snapshot.empty) {
                    const sorted = []; snapshot.forEach(doc => sorted.push({ id: doc.id, ...doc.data() }));
                    desc = sorted.map((d, i) => `${i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : '??'} <@${d.id}> | **${d.ap} AP**`).join('\n');
                }
            }
            interaction.editReply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setTitle('?? EN İYİ AJANLAR').setDescription(desc)] });
        }

        if (commandName === 'market') {
            const options = Object.entries(marketItems).map(([id, item]) => ({ label: item.name, description: `${item.price} AP - ${item.desc}`, value: id }));
            const select = new StringSelectMenuBuilder().setCustomId('market_buy').setPlaceholder('Satın almak istediğin eşyayı seç...').addOptions(options);
            const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('?? AJAN MARKETİ').setDescription(`?? **Bakiyen:** \`${user.ap} AP\``);
            interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
        }

        // --- OWNER KOMUTLARI İŞLEMLERİ ---
        if (commandName === 'ap-ver') {
            const target = interaction.options.getUser('kullanici');
            const amount = interaction.options.getInteger('miktar');
            const targetData = await getUser(target.id);
            targetData.ap = (targetData.ap || 0) + amount;
            await saveUser(target.id, targetData);
            interaction.editReply({ content: `? **${target.username}** adlı kişiye **${amount} AP** verildi.` });
        }

        if (commandName === 'ap-kaldir') {
            const target = interaction.options.getUser('kullanici');
            const amount = interaction.options.getInteger('miktar');
            const targetData = await getUser(target.id);
            targetData.ap = Math.max(0, (targetData.ap || 0) - amount);
            await saveUser(target.id, targetData);
            interaction.editReply({ content: `? **${target.username}** adlı kişiden **${amount} AP** silindi.` });
        }
    }

    // --- MARKETTEN EŞYA SEÇİMİ ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'market_buy') {
        await interaction.deferUpdate();
        const itemId = interaction.values[0]; 
        const item = marketItems[itemId];
        
        if (user.ap < item.price) return interaction.followUp({ content: `? Yetersiz AP!`, flags: 64 });
        
        user.ap -= item.price; 
        await saveUser(userId, user);

        if (item.needsTarget) {
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId(`target_${itemId}`)
                .setPlaceholder(`Kime ${item.name} kullanmak istiyorsun?`);
            return interaction.followUp({ 
                content: `? **${item.name}** satın alındı! Şimdi hedefini seç:`, 
                components: [new ActionRowBuilder().addComponents(userSelect)],
                flags: 64 
            });
        }

        let effectMsg = `? **${item.name}** satın alındı ve kullanıldı!`;
        
        // ANLIK KULLANILANLAR
        if (itemId === 'bedava_kutu') {
            const kazanc = Math.floor(Math.random() * 5) + 1;
            user.ap += kazanc;
            await saveUser(userId, user);
            effectMsg += `\n?? Kutudan **${kazanc} AP** çıktı!`;
        }
        if (itemId === 'hizlandirici') {
            user.buff = (user.buff || 0) + 2;
            await saveUser(userId, user);
            effectMsg += `\nSonraki görevinden **+2 bonus AP** kazanacaksın!`;
        }
        if (itemId === 'kalkan') {
            user.shield = true;
            await saveUser(userId, user);
            effectMsg += `\nKalkan aktif edildi! Başarısız görevden etkilenmeyeceksin.`;
        }
        if (itemId === 'gozdagi') {
            interaction.channel.send(`?? **GİZLİ MESAJ:** Aranızda bir hain var... Kimseye güvenmeyin. Bir sonraki hedef siz olabilirsiniz.`);
        }

        return interaction.followUp({ content: effectMsg, flags: 64 });
    }

    // --- HEDEF SEÇİLDİKTEN SONRA ---
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('target_')) {
        await interaction.deferUpdate();
        const itemId = interaction.customId.replace('target_', '');
        const targetUser = interaction.users.first();
        
        if (targetUser.id === userId) return interaction.followUp({ content: '? Kendine eşya kullanamazsın!', flags: 64 });

        const item = marketItems[itemId];
        let resultMsg = '';

        // --- OP EŞYALAR VE DİĞERLERİ ---
        if (itemId === 'kraliyet_muhru') {
            const targetData = await getUser(targetUser.id);
            const stolenAp = targetData.ap || 0;
            targetData.ap = 0;
            await saveUser(targetUser.id, targetData);
            interaction.channel.send(`?? **KRALİYET MÜHRÜ KULLANILDI!**\nAjan ${interaction.user}, ${targetUser}'in tüm Ajan Puanlarını (${stolenAp} AP) sıfırladı! Sıfırdan başlıyorsun ${targetUser}...`);
            resultMsg = `${targetUser.username} adlı kişinin TÜM AP'sini sıfırladın!`;
        }

        if (itemId === 'gorev_kesif') {
            const targetMission = missions.get(targetUser.id);
            if (targetMission) {
                interaction.channel.send(`????>? **GÖREV İFŞA EDİLDİ!**\nAjan ${interaction.user}, ${targetUser} adlı kişinin gizli görevini buldu!\n\n**Görevi:** \`${targetMission.text}\`\n*Şimdi bu görevi yapmasını engelleyin!*`);
                resultMsg = `${targetUser.username} adlı kişinin görevini ifşa ettin!`;
            } else {
                resultMsg = `${targetUser.username} adlı kişinin aktif bir görevi yok.`;
            }
        }

        if (itemId === 'ap_cal') {
            const targetData = await getUser(targetUser.id);
            const stolenAmount = Math.min(3, targetData.ap || 0);
            
            if (stolenAmount > 0) {
                targetData.ap -= stolenAmount;
                user.ap += stolenAmount;
                await saveUser(targetUser.id, targetData);
                await saveUser(userId, user);
                interaction.channel.send(`?? **SOYGUN!**\nAjan ${interaction.user}, ${targetUser} adlı kişinin kasasından **${stolenAmount} AP** çaldı!`);
                resultMsg = `${targetUser.username} adlı kişiden ${stolenAmount} AP çaldın!`;
            } else {
                resultMsg = `${targetUser.username} adlı kişinin çalacak AP'si yok.`;
            }
        }

        if (itemId === 'bomba_pasla') {
            activeBombs.set(targetUser.id, { sender: userId, timeout: setTimeout(() => {
                interaction.channel.send(`?? **BOMBA PATLADI!**\n${targetUser} bombayı kimseye paslayamadı ve havaya uçtu!`);
                activeBombs.delete(targetUser.id);
            }, 30000) });
            interaction.channel.send(`?? **BOMBA ATILDI!**\n${targetUser}'e bomba atıldı! 30 saniye içinde başka birine paslamalı. (Paslamak için sohbete \`!pasla @kisi\` yazmalı)`);
            resultMsg = `${targetUser.username} adlı kişiye bomba attın.`;
        }

        if (itemId === 'ifsa_et') {
            try {
                const messages = await interaction.channel.messages.fetch({ limit: 50 });
                const targetMsg = messages.find(m => m.author.id === targetUser.id);
                if (targetMsg) {
                    const anonEmbed = new EmbedBuilder().setColor('#34495e').setAuthor({ name: 'Gizli İfşa' })
                        .setDescription(`**${targetUser.username}** adlı kişinin geçmişteki bir mesajı:\n\n> ${targetMsg.content}`);
                    interaction.channel.send({ embeds: [anonEmbed] });
                    resultMsg = `${targetUser.username} adlı kişinin bir mesajını anonim olarak ifşa ettin!`;
                } else { resultMsg = `Bu kanalda ${targetUser.username} adlı kişinin eski bir mesajını bulamadım.`; }
            } catch (e) { resultMsg = `Mesajları tararken hata oluştu.`; }
        }

        if (itemId === 'zorla_etiket') {
            forcedTags.set(targetUser.id, userId);
            interaction.channel.send(`?? **ETİKET ZORUNLULUĞU!**\n${targetUser}, bir sonraki mesajında ${interaction.user}'i etiketlemek zorunda! Aksi takdirde 5 AP kaybedecek.`);
            resultMsg = `${targetUser.username} adlı kişiye etiket zorunluluğu getirdin.`;
        }

        if (itemId === 'sahte_hapis') {
            interaction.channel.send(`?? **POLİS OPERASYONU!**\nAjan ${interaction.user}'in ihbarı üzerine ${targetUser} gözaltına alındı ve 1 dakikalığına hapse tıkıldı! (Eğlence amaçlıdır)`);
            resultMsg = `${targetUser.username} adlı kişiyi hapse attın.`;
        }

        if (itemId === 'tokata_at') {
            const slapGifs = ['https://media.tenor.com/8Q9W4wAAAAAj/slap.gif', 'https://media.tenor.com/L7aXq9zAAAAi/slap-anime.gif'];
            const gif = slapGifs[Math.floor(Math.random() * slapGifs.length)];
            interaction.channel.send(`?? **PAT!**\nAjan ${interaction.user}, ${targetUser}'e tokadı yapıştırdı!\n${gif}`);
            resultMsg = `${targetUser.username} adlı kişiye tokat attın.`;
        }

        if (itemId === 'ters_psikoloji') {
            interaction.channel.send(`?? **GİZEMLİ MESAJ!**\n${targetUser}, ${interaction.user} sana bir şey söylemek istiyor... Cevap verirsen ne olacağını göreceksin.`);
            resultMsg = `${targetUser.username} adlı kişiye tuzak kurdun.`;
        }

        return interaction.followUp({ content: `? **${item.name}** ${targetUser.username} üzerinde kullanıldı!\n${resultMsg}`, flags: 64 });
    }
});

// --- MESAJ DİNLEME ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (forcedTags.has(message.author.id)) {
        const requiredUserId = forcedTags.get(message.author.id);
        if (message.mentions.users.has(requiredUserId)) {
            forcedTags.delete(message.author.id);
            message.channel.send(`? ${message.author} üzerine düşeni yaptı ve etiketledi.`);
        } else {
            forcedTags.delete(message.author.id);
            const targetData = await getUser(message.author.id);
            targetData.ap = Math.max(0, (targetData.ap || 0) - 5);
            await saveUser(message.author.id, targetData);
            message.channel.send(`? ${message.author} etiketlemedi ve **-5 AP** cezası aldı!`);
        }
    }

    if (message.content.startsWith('!pasla')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('Kimi etiketliyorsun? `!pasla @kisi` şeklinde yaz.');
        
        if (activeBombs.has(message.author.id)) {
            const bombData = activeBombs.get(message.author.id);
            clearTimeout(bombData.timeout); 
            activeBombs.delete(message.author.id);
            
            activeBombs.set(target.id, { sender: message.author.id, timeout: setTimeout(() => {
                message.channel.send(`?? **BOMBA PATLADI!**\n${target} bombayı kimseye paslayamadı ve havaya uçtu!`);
                activeBombs.delete(target.id);
            }, 30000) });
            
            message.channel.send(`?? **BOMBA PASLANDI!**\n${message.author} bombayı ${target}'e pasladı! 30 saniyesi var!`);
        }
    }

    missions.forEach(async (mission, userId) => {
        if (Date.now() > mission.expireAt) {
            missions.delete(userId);
            return;
        }

        if (message.author.id === userId) {
            if (mission.type === 'caps' && message.content === message.content.toUpperCase() && message.content.length > 5) {
                mission.progress++;
                if (mission.progress >= mission.extra) completeMission(userId, mission, message);
            }
            return; 
        }

        const msgLower = message.content.toLowerCase();
        if (mission.type === 'random_word' && msgLower.includes(mission.extra)) completeMission(userId, mission, message);
        if (mission.type === 'tag_2' && message.mentions.users.has(userId)) {
            mission.progress++;
            if (mission.progress >= mission.extra) completeMission(userId, mission, message);
        }
        if (mission.type === 'random_question' && message.content.endsWith('?')) completeMission(userId, mission, message);
        if (mission.type === 'emoji_only') {
            const emojiRegex = /^[\p{Emoji}\s]+$/u;
            if (emojiRegex.test(message.content) && message.content.length > 0) completeMission(userId, mission, message);
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

// --- ÖDÜL SİSTEMİ (1 veya 2 AP) ---
async function completeMission(userId, mission, contextMessage) {
    missions.delete(userId); 
    const user = await getUser(userId);
    
    // Rastgele 1 veya 2 AP kazanma şansı
    let baseReward = Math.floor(Math.random() * 2) + 1; 
    const reward = baseReward + (user.buff || 0); 
    
    user.ap = (user.ap || 0) + reward; 
    user.completed = (user.completed || 0) + 1; 
    user.buff = 0; 
    await saveUser(userId, user);
    
    const rank = getRank(user.ap);
    const discordUser = await client.users.fetch(userId).catch(() => null);
    
    if (discordUser) {
        discordUser.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('?? GÖREV BAŞARILI').setDescription(`**Kazanılan:** \`+${reward} AP\``)] }).catch(() => null);
    }

    if (contextMessage && contextMessage.channel) {
        contextMessage.channel.send({ embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('?? OPERASYON BAŞARILI! ??')
            .setDescription(`Ajan <@${userId}>, gizli görevini tamamladı!`)
            .addFields({ name: '? Kazanılan AP', value: `\`+${reward} AP\``, inline: true })
        ] });
    }
}

client.login(process.env.AJAN_TOKEN || process.env.DISCORD_TOKEN);

