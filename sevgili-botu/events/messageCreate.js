const { Events } = require('discord.js');
const db = require('../utils/database');
const { sohbet } = require('../utils/ai');
const config = require('../config');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const userId = message.author.id;
        const botEtiketlendi = message.mentions.has(client.user);

        // Spam kontrolu (sadece bot etiketlendiyse)
        if (botEtiketlendi) {
            const user = await db.getUser(userId) || await db.createUser(userId, message.author.username);
            const simdi = Date.now();
            const dakikaOnce = simdi - 60000;

            const spam = user.spam || { dakikaMesajlar: [], sonUyari: 0 };
            spam.dakikaMesajlar = (spam.dakikaMesajlar || []).filter(t => t > dakikaOnce);

            if (spam.dakikaMesajlar.length >= config.mesajLimiti.dakikadaMax) {
                if (simdi - spam.sonUyari > 60000) {
                    message.reply(config.mesajLimiti.spamUyari).catch(() => {});
                    await db.updateUser(userId, { 'spam.sonUyari': simdi });
                }
                return;
            }

            spam.dakikaMesajlar.push(simdi);
            await db.updateUser(userId, { spam });
        }

        // Bot etiketlendiyse sohbet et
        if (botEtiketlendi) {
            const mesaj = message.content.replace(/<@!?\d+>/g, '').trim();
            if (!mesaj) {
                return message.reply(`${config.botEmoji} Beni mi cagirdin askim? 💕`).catch(() => {});
            }

            let user = await db.getUser(userId);
            if (!user) user = await db.createUser(userId, message.author.username);

            // Karakter yoksa uyar
            if (!user.karakter) {
                return message.reply(`🌸 Once bir karakter olusturmalisin askim! \`/karakter olustur\` yaz.`).catch(() => {});
            }

            // Date aktifse date'e yonlendir
            if (user.aktifDate) {
                return message.reply(`🌸 Su an date'tesin! \`/date devam\` yazarak devam edebilirsin.`).catch(() => {});
            }

            await message.channel.sendTyping();

            try {
                const cevap = await sohbet(mesaj, user.karakter, user.iliski, user.hatiralar, user.gecmis);

                await db.ekleGecmis(userId, 'user', mesaj);
                await db.ekleGecmis(userId, 'assistant', cevap);
                await db.guncelleSonMesaj(userId);
                await db.istatistikArttir(userId, 'mesaj');

                // Sevgi puani ekle
                await db.addSevgi(userId, config.sevgi.guzelMesaj);

                // Uzun mesaji bol
                const chunks = cevap.match(/[\s\S]{1,1900}/g) || [cevap];
                for (const chunk of chunks) {
                    await message.reply(chunk).catch(() => {});
                }
            } catch (err) {
                console.error('Sohbet hatasi:', err);
                message.reply('🌸 Kafam karisti askim, tekrar dener misin?').catch(() => {});
            }
        }
    }
};
