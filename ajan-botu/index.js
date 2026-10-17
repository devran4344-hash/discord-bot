require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder 
} = require('discord.js');
const admin = require('firebase-admin');

// --- FIREBASE BAÐLANTISI ---
let db;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        console.log("[SÝSTEM] Firebase baðlantýsý baþarýlý!");
    }
} catch (error) {
    console.error("[HATA] Firebase baðlantý hatasý:", error);
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
    return { name: "Öðrenci", color: "#95a5a6" };
}

function getProgressBar(ap) {
    if (ap >= 50) return "MAX SEVÝYE ??";
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

// --- YENÝLENMÝÞ VE OP MARKET ---
const marketItems = {
    'bedava_kutu': { name: '?? Bedava Þans Kutusu', price: 0, desc: 'Ýçinden 1-5 arasý AP çýkabilir! (Bedava)', needsTarget: false },
    'kraliyet_muhru': { name: '?? Kraliyet Mührü', price: 100, desc: 'Hedefin TÜM AP\'sini SIFIRLAR! (Çok OP)', needsTarget: true },
    'ap_cal': { name: '?? AP Çal', price: 25, desc: 'Hedefin kasasýndan 3 AP çalýp sana ekler.', needsTarget: true },
    'bomba_pasla': { name: '?? Bomba Pasla', price: 15, desc: 'Hedefe bomba atarsýn, 30 sn içinde paslamalý.', needsTarget: true },
    'ifsa_et': { name: '????>? Ýfþa Et', price: 20, desc: 'Birinin eski mesajýný anonim atarsýn.', needsTarget: true },
    'gorev_kesif': { name: '????>? Görev Keþif', price: 15, desc: 'Hedefin aktif görevini herkese ifþa eder!', needsTarget: true },
    'zorla_etiket': { name: '?? Zorla Etiket', price: 10, desc: 'Hedef, bir sonraki mesajýnda seni etiketlemek zorunda.', needsTarget: true },
    'sahte_hapis': { name: '?? Sahte Hapis', price: 12, desc: 'Hedefi 1 dakikalýðýna hapse týkar (Eðlence amaçlý).', needsTarget: true },
    'tokata_at': { name: '?? Tokat At', price: 5, desc: 'Hedefe komik bir tokat GIF\'i atar.', needsTarget: true },
    'ters_psikoloji': { name: '?? Ters Psikoloji', price: 15, desc: 'Hedef sana cevap verirse +3 AP kazanýrsýn.', needsTarget: true },
    'hizlandirici': { name: '?? Hýzlandýrýcý', price: 8, desc: 'Sonraki görevden +2 bonus AP kazanýrsýn.', needsTarget: false },
    'kalkan': { name: '??? Kalkan', price: 20, desc: 'Bir sonraki baþarýsýz görev cezasýndan muaf olursun.', needsTarget: false }
};

// --- DENGELENMÝÞ GÖREV ÜRETÝCÝ (Zor görevler kaldýrýldý) ---
const randomWords = ['karpuz', 'elma', 'futbol', 'gol', 'hakem', 'ofsayt', 'kaleci', 'penaltý'];
const randomEmojis = ['?', '??', '??', '??', '??', '??', '??', '??'];
const randomQuestions = ['nasýlsýn?', 'ne yapýyorsun?', 'maçý izledin mi?'];
function generateMission() {
    const types = ['random_word', 'tag_2', 'random_question', 'random_reaction', 'emoji_only', 'caps'];
    const type = types[Math.floor(Math.random() * types.length)];
    let mission = { type: type, expireAt: Date.now() + 5 * 60 * 1000, progress: 0 };
    if (type === 'random_word') {
        const word = randomWords[Math.floor(Math.random() * randomWords.length)];
        mission.text = `Þu kelimeyi birine söylet: **"${word}"**`; mission.extra = word;
    } else if (type === 'tag_2') {
        mission.text = `5 dakika içinde 2 farklý kiþiye seni etiketlet.`; mission.extra = 2; // 3'ten 2'ye düþürüldü
    } else if (type === 'random_question') {
        mission.text = `Birine soru sordur.`; mission.extra = '?';
    } else if (type === 'random_reaction') {
        const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
        mission.text = `Attýðýn bir mesaja ${emoji} tepkisi aldýr.`; mission.extra = emoji;
    } else if (type === 'emoji_only') {
        mission.text = `Birinin sadece emojilerden oluþan bir mesaj atmasýný saðla.`; mission.extra = null;
    } else if (type === 'caps') {
        mission.text = `BÜYÜK HARFLERLE 2 mesaj at.`; mission.extra = 2; // 3'ten 2'ye düþürüldü
    }
    return mission;
}

client.once('clientReady', async () => {
    console.log(`[AJAN BOT] ${client.user.tag} aktif!`);
    const commands = [
        new SlashCommandBuilder().setName('gorev-al').setDescription('Gizli bir görev alýrsýn.'),
        new SlashCommandBuilder().setName('gorev-iptal').setDescription('Aktif görevini iptal edersin.'),
        new SlashCommandBuilder().setName('profil').setDescription('Ajan profilinizi gösterir.'),
        new SlashCommandBuilder().setName('liderlik').setDescription('En iyi ajanlarý listeler.'),
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
            return interaction.reply({ content: '? Bu komutu sadece botun sahibi kullanabilir!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'gorev-al') {
            if (missions.has(userId)) return interaction.editReply({ content: '? Zaten aktif bir görevin var!' });
            const mission = generateMission();
            missions.set(userId, mission);

            const dmEmbed = new EmbedBuilder().setColor('#e74c3c').setTitle('????>? GÝZLÝ DOSYA')
                .setDescription(`Ajan **${interaction.user.username}**, görevi tamamla.\n\n**HEDEF:**\n\`\`\`\n${mission.text}\n\`\`\``)
                .addFields({ name: '?? Süre', value: '`5 Dakika`', inline: true }, { name: '?? Ödül', value: '`1 veya 2 AP (Þansa Baðlý)`', inline: true });
            try {
                await interaction.user.send({ embeds: [dmEmbed] });
                interaction.editReply({ content: '?? Görev DM\'den gönderildi.' });
            } catch (e) {
                interaction.editReply({ content: '? DM kutun kapalý!' });
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
                    { name: '? Ajan Puaný', value: `**${user.ap} AP**`, inline: true },
                    { name: '?? Ýlerleme', value: getProgressBar(user.ap), inline: false }
                );
            interaction.editReply({ embeds: [embed] });
        }

        if (commandName === 'liderlik') {
            let desc = 'Henüz kimse görev yapmadý.';
            if (db) {
                const snapshot = await db.collection('ajanlar').orderBy('ap', 'desc').limit(10).get();
                if (!snapshot.empty) {
                    const sorted = []; snapshot.forEach(doc => sorted.push({ id: doc.id, ...doc.data() }));
                    desc = sorted.map((d, i) => `${i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : '??'} <@${d.id}> | **${d.ap} AP**`).join('\n');
                }
            }
            interaction.editReply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setTitle('?? EN ÝYÝ AJANLAR').setDescription(desc)] });
        }

        if (commandName === 'market') {
            const options = Object.entries(marketItems).map(([id, item]) => ({ label: item.name, description: `${item.price} AP - ${item.desc}`, value: id }));
            const select = new StringSelectMenuBuilder().setCustomId('market_buy').setPlaceholder('Satýn almak istediðin eþyayý seç...').addOptions(options);
            const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('?? AJAN MARKETÝ').setDescription(`?? **Bakiyen:** \`${user.ap} AP\``);
            interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
        }

        // --- OWNER KOMUTLARI ÝÞLEMLERÝ ---
        if (commandName === 'ap-ver') {
            const target = interaction.options.getUser('kullanici');
            const amount = interaction.options.getInteger('miktar');
            const targetData = await getUser(target.id);
            targetData.ap = (targetData.ap || 0) + amount;
            await saveUser(target.id, targetData);
            interaction.editReply({ content: `? **${target.username}** adlý kiþiye **${amount} AP** verildi.` });
        }

        if (commandName === 'ap-kaldir') {
            const target = interaction.options.getUser('kullanici');
            const amount = interaction.options.getInteger('miktar');
            const targetData = await getUser(target.id);
            targetData.ap = Math.max(0, (targetData.ap || 0) - amount);
            await saveUser(target.id, targetData);
            interaction.editReply({ content: `? **${target.username}** adlý kiþiden **${amount} AP** silindi.` });
        }
    }

    // --- MARKETTEN EÞYA SEÇÝMÝ ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'market_buy') {
        await interaction.deferUpdate();
        const itemId = interaction.values[0]; 
        const item = marketItems[itemId];
        
        if (user.ap < item.price) return interaction.followUp({ content: `? Yetersiz AP!`, ephemeral: true });
        
        user.ap -= item.price; 
        await saveUser(userId, user);

        if (item.needsTarget) {
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId(`target_${itemId}`)
                .setPlaceholder(`Kime ${item.name} kullanmak istiyorsun?`);
            return interaction.followUp({ 
                content: `? **${item.name}** satýn alýndý! Þimdi hedefini seç:`, 
                components: [new ActionRowBuilder().addComponents(userSelect)],
                ephemeral: true 
            });
        }

        let effectMsg = `? **${item.name}** satýn alýndý ve kullanýldý!`;
        
        // ANLIK KULLANILANLAR
        if (itemId === 'bedava_kutu') {
            const kazanc = Math.floor(Math.random() * 5) + 1;
            user.ap += kazanc;
            await saveUser(userId, user);
            effectMsg += `\n?? Kutudan **${kazanc} AP** çýktý!`;
        }
        if (itemId === 'hizlandirici') {
            user.buff = (user.buff || 0) + 2;
            await saveUser(userId, user);
            effectMsg += `\nSonraki görevinden **+2 bonus AP** kazanacaksýn!`;
        }
        if (itemId === 'kalkan') {
            user.shield = true;
            await saveUser(userId, user);
            effectMsg += `\nKalkan aktif edildi! Baþarýsýz görevden etkilenmeyeceksin.`;
        }
        if (itemId === 'gozdagi') {
            interaction.channel.send(`?? **GÝZLÝ MESAJ:** Aranýzda bir hain var... Kimseye güvenmeyin. Bir sonraki hedef siz olabilirsiniz.`);
        }

        return interaction.followUp({ content: effectMsg, ephemeral: true });
    }

    // --- HEDEF SEÇÝLDÝKTEN SONRA ---
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('target_')) {
        await interaction.deferUpdate();
        const itemId = interaction.customId.replace('target_', '');
        const targetUser = interaction.users.first();
        
        if (targetUser.id === userId) return interaction.followUp({ content: '? Kendine eþya kullanamazsýn!', ephemeral: true });

        const item = marketItems[itemId];
        let resultMsg = '';

        // --- OP EÞYALAR VE DÝÐERLERÝ ---
        if (itemId === 'kraliyet_muhru') {
            const targetData = await getUser(targetUser.id);
            const stolenAp = targetData.ap || 0;
            targetData.ap = 0;
            await saveUser(targetUser.id, targetData);
            interaction.channel.send(`?? **KRALÝYET MÜHRÜ KULLANILDI!**\nAjan ${interaction.user}, ${targetUser}'in tüm Ajan Puanlarýný (${stolenAp} AP) sýfýrladý! Sýfýrdan baþlýyorsun ${targetUser}...`);
            resultMsg = `${targetUser.username} adlý kiþinin TÜM AP'sini sýfýrladýn!`;
        }

        if (itemId === 'gorev_kesif') {
            const targetMission = missions.get(targetUser.id);
            if (targetMission) {
                interaction.channel.send(`????>? **GÖREV ÝFÞA EDÝLDÝ!**\nAjan ${interaction.user}, ${targetUser} adlý kiþinin gizli görevini buldu!\n\n**Görevi:** \`${targetMission.text}\`\n*Þimdi bu görevi yapmasýný engelleyin!*`);
                resultMsg = `${targetUser.username} adlý kiþinin görevini ifþa ettin!`;
            } else {
                resultMsg = `${targetUser.username} adlý kiþinin aktif bir görevi yok.`;
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
                interaction.channel.send(`?? **SOYGUN!**\nAjan ${interaction.user}, ${targetUser} adlý kiþinin kasasýndan **${stolenAmount} AP** çaldý!`);
                resultMsg = `${targetUser.username} adlý kiþiden ${stolenAmount} AP çaldýn!`;
            } else {
                resultMsg = `${targetUser.username} adlý kiþinin çalacak AP'si yok.`;
            }
        }

        if (itemId === 'bomba_pasla') {
            activeBombs.set(targetUser.id, { sender: userId, timeout: setTimeout(() => {
                interaction.channel.send(`?? **BOMBA PATLADI!**\n${targetUser} bombayý kimseye paslayamadý ve havaya uçtu!`);
                activeBombs.delete(targetUser.id);
            }, 30000) });
            interaction.channel.send(`?? **BOMBA ATILDI!**\n${targetUser}'e bomba atýldý! 30 saniye içinde baþka birine paslamalý. (Paslamak için sohbete \`!pasla @kisi\` yazmalý)`);
            resultMsg = `${targetUser.username} adlý kiþiye bomba attýn.`;
        }

        if (itemId === 'ifsa_et') {
            try {
                const messages = await interaction.channel.messages.fetch({ limit: 50 });
                const targetMsg = messages.find(m => m.author.id === targetUser.id);
                if (targetMsg) {
                    const anonEmbed = new EmbedBuilder().setColor('#34495e').setAuthor({ name: 'Gizli Ýfþa' })
                        .setDescription(`**${targetUser.username}** adlý kiþinin geçmiþteki bir mesajý:\n\n> ${targetMsg.content}`);
                    interaction.channel.send({ embeds: [anonEmbed] });
                    resultMsg = `${targetUser.username} adlý kiþinin bir mesajýný anonim olarak ifþa ettin!`;
                } else { resultMsg = `Bu kanalda ${targetUser.username} adlý kiþinin eski bir mesajýný bulamadým.`; }
            } catch (e) { resultMsg = `Mesajlarý tararken hata oluþtu.`; }
        }

        if (itemId === 'zorla_etiket') {
            forcedTags.set(targetUser.id, userId);
            interaction.channel.send(`?? **ETÝKET ZORUNLULUÐU!**\n${targetUser}, bir sonraki mesajýnda ${interaction.user}'i etiketlemek zorunda! Aksi takdirde 5 AP kaybedecek.`);
            resultMsg = `${targetUser.username} adlý kiþiye etiket zorunluluðu getirdin.`;
        }

        if (itemId === 'sahte_hapis') {
            interaction.channel.send(`?? **POLÝS OPERASYONU!**\nAjan ${interaction.user}'in ihbarý üzerine ${targetUser} gözaltýna alýndý ve 1 dakikalýðýna hapse týkýldý! (Eðlence amaçlýdýr)`);
            resultMsg = `${targetUser.username} adlý kiþiyi hapse attýn.`;
        }

        if (itemId === 'tokata_at') {
            const slapGifs = ['https://media.tenor.com/8Q9W4wAAAAAj/slap.gif', 'https://media.tenor.com/L7aXq9zAAAAi/slap-anime.gif'];
            const gif = slapGifs[Math.floor(Math.random() * slapGifs.length)];
            interaction.channel.send(`?? **PAT!**\nAjan ${interaction.user}, ${targetUser}'e tokadý yapýþtýrdý!\n${gif}`);
            resultMsg = `${targetUser.username} adlý kiþiye tokat attýn.`;
        }

        if (itemId === 'ters_psikoloji') {
            interaction.channel.send(`?? **GÝZEMLÝ MESAJ!**\n${targetUser}, ${interaction.user} sana bir þey söylemek istiyor... Cevap verirsen ne olacaðýný göreceksin.`);
            resultMsg = `${targetUser.username} adlý kiþiye tuzak kurdun.`;
        }

        return interaction.followUp({ content: `? **${item.name}** ${targetUser.username} üzerinde kullanýldý!\n${resultMsg}`, ephemeral: true });
    }
});

// --- MESAJ DÝNLEME ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (forcedTags.has(message.author.id)) {
        const requiredUserId = forcedTags.get(message.author.id);
        if (message.mentions.users.has(requiredUserId)) {
            forcedTags.delete(message.author.id);
            message.channel.send(`? ${message.author} üzerine düþeni yaptý ve etiketledi.`);
        } else {
            forcedTags.delete(message.author.id);
            const targetData = await getUser(message.author.id);
            targetData.ap = Math.max(0, (targetData.ap || 0) - 5);
            await saveUser(message.author.id, targetData);
            message.channel.send(`? ${message.author} etiketlemedi ve **-5 AP** cezasý aldý!`);
        }
    }

    if (message.content.startsWith('!pasla')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('Kimi etiketliyorsun? `!pasla @kisi` þeklinde yaz.');
        
        if (activeBombs.has(message.author.id)) {
            const bombData = activeBombs.get(message.author.id);
            clearTimeout(bombData.timeout); 
            activeBombs.delete(message.author.id);
            
            activeBombs.set(target.id, { sender: message.author.id, timeout: setTimeout(() => {
                message.channel.send(`?? **BOMBA PATLADI!**\n${target} bombayý kimseye paslayamadý ve havaya uçtu!`);
                activeBombs.delete(target.id);
            }, 30000) });
            
            message.channel.send(`?? **BOMBA PASLANDI!**\n${message.author} bombayý ${target}'e pasladý! 30 saniyesi var!`);
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

// --- ÖDÜL SÝSTEMÝ (1 veya 2 AP) ---
async function completeMission(userId, mission, contextMessage) {
    missions.delete(userId); 
    const user = await getUser(userId);
    
    // Rastgele 1 veya 2 AP kazanma þansý
    let baseReward = Math.floor(Math.random() * 2) + 1; 
    const reward = baseReward + (user.buff || 0); 
    
    user.ap = (user.ap || 0) + reward; 
    user.completed = (user.completed || 0) + 1; 
    user.buff = 0; 
    await saveUser(userId, user);
    
    const rank = getRank(user.ap);
    const discordUser = await client.users.fetch(userId).catch(() => null);
    
    if (discordUser) {
        discordUser.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('?? GÖREV BAÞARILI').setDescription(`**Kazanýlan:** \`+${reward} AP\``)] }).catch(() => null);
    }

    if (contextMessage && contextMessage.channel) {
        contextMessage.channel.send({ embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('?? OPERASYON BAÞARILI! ??')
            .setDescription(`Ajan <@${userId}>, gizli görevini tamamladý!`)
            .addFields({ name: '? Kazanýlan AP', value: `\`+${reward} AP\``, inline: true })
        ] });
    }
}

client.login(process.env.AJAN_TOKEN || process.env.DISCORD_TOKEN);
