require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder 
} = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ] 
});

const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
const missions = new Map(); 

const missionPool = [
    { type: 'word', text: 'Şu kelimeyi birine söylet: "Ofsayt"', extra: 'Ofsayt' },
    { type: 'word', text: 'Şu kelimeyi birine söylet: "Karpuz"', extra: 'Karpuz' },
    { type: 'word', text: 'Şu kelimeyi birine söylet: "Messi"', extra: 'Messi' },
    { type: 'tag', text: '5 dakika içinde 3 farklı kişiye seni etiketlet.', extra: 3 },
    { type: 'question', text: '5 dakika içinde birine soru sordur.', extra: '?' },
    { type: 'reaction', text: 'Gönderdiğin bir mesaja birinin ⚽ tepkisi atmasını sağla.', extra: '⚽' },
    { type: 'caps', text: '5 dakika içinde tamamen BÜYÜK HARFLERLE 3 mesaj at.', extra: 3 }
];

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
    'sahte_hakem': { name: '📣 Sahte Hakem', price: 12, desc: 'Sesli kanalda TTS ile hakem konuşturur.' },
    'hizlandirici': { name: '🚀 Hızlandırıcı', price: 8, desc: 'Sonraki görevden +2 AP kazanırsın.' },
    'kalkan': { name: '🛡️ Kalkan', price: 20, desc: 'Görev cezasından muaf olursun.' }
};

client.once('ready', async () => {
    console.log(`[AJAN BOT] ${client.user.tag} aktif!`);
    
    const commands = [
        new SlashCommandBuilder().setName('gorev-al').setDescription('Gizli bir görev alırsın.'),
        new SlashCommandBuilder().setName('gorev-iptal').setDescription('Aktif görevini iptal edersin.'),
        new SlashCommandBuilder().setName('profil').setDescription('Ajan profilinizi ve rütbenizi gösterir.'),
        new SlashCommandBuilder().setName('liderlik').setDescription('En iyi ajanları listeler.'),
        new SlashCommandBuilder().setName('market').setDescription('Ajan Marketini açar.')
    ].map(cmd => cmd.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('[SİSTEM] Slash komutları Discord\'a yüklendi!');
    } catch (e) {
        console.error('Komut yükleme hatası:', e);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    const userId = interaction.user.id;
    let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.users[userId]) db.users[userId] = { ap: 0, completed: 0, inventory: [], buff: 0 };
    const user = db.users[userId];
    const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'gorev-al') {
            if (missions.has(userId)) return interaction.reply({ content: '❌ Zaten aktif bir görevin var!', ephemeral: true });
            
            const mission = missionPool[Math.floor(Math.random() * missionPool.length)];
            mission.expireAt = Date.now() + 5 * 60 * 1000;
            mission.progress = 0;
            missions.set(userId, mission);

            const dmEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setAuthor({ name: 'AJANLIK BÜROSU', iconURL: 'https://i.imgur.com/8QO9W4w.png' })
                .setTitle('🕵️‍♂️ GİZLİ DOSYA - ÇOK GİZLİ')
                .setDescription(`Ajan **${interaction.user.username}**, aşağıdaki görevi kimseye sezdirmeden tamamla.\n\n**HEDEF:**\n\`\`\`\n${mission.text}\n\`\`\``)
                .addFields(
                    { name: '⏱️ Süre', value: '`5 Dakika`', inline: true },
                    { name: '🎁 Ödül', value: '`+1 AP (veya Buff)`', inline: true }
                )
                .setFooter({ text: 'Bu mesaj okunduktan sonra kendini imha edecektir...' })
                .setTimestamp();

            try {
                await interaction.user.send({ embeds: [dmEmbed] });
                interaction.reply({ content: '📩 Sana gizli görevini DM\'den gönderdim. Kanala bakma, aç oku!', ephemeral: true });
            } catch (e) {
                interaction.reply({ content: '❌ Sana DM atamıyorum! Lütfen DM\'lerini aç.', ephemeral: true });
                missions.delete(userId);
            }
        }

        if (commandName === 'gorev-iptal') {
            if (missions.has(userId)) {
                missions.delete(userId);
                interaction.reply({ content: '🗑️ Görevin iptal edildi.', ephemeral: true });
            } else {
                interaction.reply({ content: 'Zaten aktif görevin yok.', ephemeral: true });
            }
        }

        if (commandName === 'profil') {
            const rank = getRank(user.ap);
            const embed = new EmbedBuilder()
                .setColor(rank.color)
                .setAuthor({ name: 'AJAN KİMLİK KARTI', iconURL: interaction.user.displayAvatarURL() })
                .setTitle(`🕵️‍♂️ ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '📊 Rütbe', value: `\`\`\`${rank.name}\`\`\``, inline: false },
                    { name: '⚡ Ajan Puanı', value: `**${user.ap} AP**`, inline: true },
                    { name: '🎯 Biten Görev', value: `**${user.completed}**`, inline: true },
                    { name: '🚀 İlerleme', value: getProgressBar(user.ap), inline: false }
                )
                .setFooter({ text: 'Ajanlık Bürosu - Resmi Belge' })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'liderlik') {
            const sorted = Object.entries(db.users).sort((a, b) => b[1].ap - a[1].ap).slice(0, 10);
            let desc = sorted.map(([id, data], index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
                const rank = getRank(data.ap);
                return `${medal} <@${id}> \n└ ${rank.name} | **${data.ap} AP**`;
            }).join('\n\n');
            
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setAuthor({ name: 'AJANLIK BÜROSU', iconURL: 'https://i.imgur.com/8QO9W4w.png' })
                .setTitle('🏆 EN İYİ AJANLAR SIRALAMASI')
                .setDescription(desc || 'Henüz kimse görev yapmadı.')
                .setFooter({ text: 'İlk 10 Ajan Listeleniyor' })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'market') {
            const options = Object.entries(marketItems).map(([id, item]) => ({
                label: item.name,
                description: `${item.price} AP - ${item.desc}`,
                value: id
            }));

            const select = new StringSelectMenuBuilder()
                .setCustomId('market_buy')
                .setPlaceholder('Satın almak istediğin eşyayı seç...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(select);
            
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: 'KARABORSA', iconURL: 'https://i.imgur.com/8QO9W4w.png' })
                .setTitle('🛒 AJAN MARKETİ')
                .setDescription(`💰 **Mevcut Bakiyen:** \`${user.ap} AP\`\n\nAşağıdaki menüden ihtiyacın olan kaos eşyasını seç ve satın al!`)
                .setFooter({ text: 'Dikkatli harca, AP kazanmak zordur...' });

            interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'market_buy') {
        const itemId = interaction.values[0];
        const item = marketItems[itemId];

        if (user.ap < item.price) {
            return interaction.reply({ content: `❌ Yetersiz AP! Bunun için **${item.price} AP** gerekiyor, sende **${user.ap} AP** var.`, ephemeral: true });
        }

        user.ap -= item.price;
        save();

        if (itemId === 'takma_ad') {
            interaction.member.setNickname(`${interaction.user.username} ⚽`).catch(()=>null);
        }

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ İŞLEM BAŞARILI')
            .setDescription(`**${item.name}** satın alındı!\n\n*${item.desc}*\n\n💰 **Kalan AP:** \`${user.ap}\``)
            .setFooter({ text: 'Karaborsa seni tekrar bekler...' });
        
        interaction.reply({ embeds: [embed], ephemeral: true });
        
        if (['kirmizi_kart', 'bomba_pasla', 'gozdagi'].includes(itemId)) {
            interaction.channel.send(`🚨 **AJAN OPERASYONU!** ${interaction.user} karaborsadan **${item.name}** satın aldı ve kullanıma hazır!`);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    missions.forEach(async (mission, userId) => {
        if (Date.now() > mission.expireAt) {
            missions.delete(userId);
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) user.send("⏱️ Süren doldu! Görevi başaramadın ve dosya çöpe gitti.").catch(() => null);
            return;
        }

        if (message.author.id === userId) {
            if (mission.type === 'caps' && message.content === message.content.toUpperCase() && message.content.length > 5) {
                mission.progress++;
                if (mission.progress >= mission.extra) completeMission(userId, mission, message);
            }
            return; 
        }

        if (mission.type === 'word' && message.content.toLowerCase().includes(mission.extra.toLowerCase())) completeMission(userId, mission, message);
        if (mission.type === 'tag' && message.mentions.users.has(userId)) {
            mission.progress++;
            if (mission.progress >= mission.extra) completeMission(userId, mission, message);
        }
        if (mission.type === 'question' && message.content.endsWith('?')) completeMission(userId, mission, message);
    });
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => null);
    const messageAuthor = reaction.message.author;

    missions.forEach((mission, userId) => {
        if (messageAuthor && messageAuthor.id === userId && mission.type === 'reaction') {
            if (reaction.emoji.name === mission.extra) completeMission(userId, mission, reaction.message);
        }
    });
});

async function completeMission(userId, mission, contextMessage) {
    missions.delete(userId); 
    
    let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.users[userId]) db.users[userId] = { ap: 0, completed: 0, inventory: [], buff: 0 };
    
    const reward = 1 + db.users[userId].buff; 
    db.users[userId].ap += reward;
    db.users[userId].completed += 1;
    db.users[userId].buff = 0; 
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    const rank = getRank(db.users[userId].ap);
    const user = await client.users.fetch(userId).catch(() => null);
    
    if (user) {
        const successDM = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🎉 GÖREV BAŞARILI')
            .setDescription(`**Tebrikler Ajan!**\nAtandığın gizli görevi başarıyla tamamladın.\n\n**Kazanılan:** \`+${reward} AP\``)
            .setFooter({ text: 'Büro seninle gurur duyuyor.' });
        user.send({ embeds: [successDM] }).catch(() => null);
    }

    const announceEmbed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setAuthor({ name: 'GİZLİ OPERASYON SONUCU', iconURL: 'https://i.imgur.com/8QO9W4w.png' })
        .setTitle('🚨 OPERASYON BAŞARILI! 🚨')
        .setDescription(`Ajan <@${userId}>, saha içi gizli görevini tamamladı ve aramızdaki casusluğunu kanıtladı!`)
        .setThumbnail(user ? user.displayAvatarURL() : null)
        .addFields(
            { name: '⚡ Kazanılan AP', value: `\`+${reward} AP\``, inline: true },
            { name: '📊 Yeni Rütbe', value: `\`${rank.name}\``, inline: true }
        )
        .setImage('https://i.imgur.com/L7aXq9z.gif')
        .setFooter({ text: 'Herkes potansiyel bir ajandır...' })
        .setTimestamp();

    contextMessage.channel.send({ embeds: [announceEmbed] });
}

// GITHUB SECRET İSMİ BURADA: AJAN_TOKEN
client.login(process.env.AJAN_TOKEN || process.env.DISCORD_TOKEN);
