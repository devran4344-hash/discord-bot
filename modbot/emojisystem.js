
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ComponentType, 
    AttachmentBuilder 
} = require('discord.js');
const emojis = require('../../utils/emojis');

// Sadece senin Discord ID'n (Tekil Sahip Koruması)
const SPECIFIC_OWNER_ID = '1160564359727173792'; 

module.exports = {
    name: 'emojisetup',
    category: 'sistem',
    description: 'Dev Portal emojilerini interaktif, filtrelenebilir gelişmiş panelde listeler.',
    usage: 'r?emojisetup',
    yetki: 'Özel Bot Sahibi',

    async execute(message, args, client, guildConfig) {
        // Güvenlik Kontrolü: Sadece belirlenen ID çalıştırabilir
        if (message.author.id !== SPECIFIC_OWNER_ID && message.author.id !== guildConfig?.ownerId) {
            return message.reply(`${emojis.hata} **Erişim Engellendi!** Bu panel sadece özel bot sahibine açıktır.`);
        }

        // Dev Portal Emojilerini Çek
        const appEmojis = await client.application.emojis.fetch().catch(() => null);

        if (!appEmojis || !appEmojis.size) {
            return message.reply(`${emojis.uyari} Developer Portal'da (Bot Uygulamasında) tanımlı emoji bulunamadı.`);
        }

        // Panel Durumu (State)
        let currentFilter = 'all'; // 'all', 'static', 'animated'
        let currentPage = 0;
        const pageSize = 10;

        // Emoji Filtreleme Fonksiyonu
        const getFilteredEmojis = () => {
            if (currentFilter === 'static') return appEmojis.filter(e => !e.animated);
            if (currentFilter === 'animated') return appEmojis.filter(e => e.animated);
            return appEmojis;
        };

        // Embed Oluşturucu
        const generateEmbed = () => {
            const filteredList = Array.from(getFilteredEmojis().values());
            const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
            
            // Sayfa sınır kontrolü
            if (currentPage >= totalPages) currentPage = totalPages - 1;
            if (currentPage < 0) currentPage = 0;

            const start = currentPage * pageSize;
            const currentSlice = filteredList.slice(start, start + pageSize);

            const listText = currentSlice.length > 0 
                ? currentSlice.map(e => `${e} = :${e.name}:`).join('\n')
                : '*Bu kategoride emoji bulunamadı.*';

            const staticCount = appEmojis.filter(e => !e.animated).size;
            const animatedCount = appEmojis.filter(e => e.animated).size;

            return new EmbedBuilder()
                .setTitle(`${emojis.basari || '✅'} Dev Portal Emoji Yönetim Paneli`)
                .setColor('#5865F2')
                .setDescription(`Developer Portal'dan çekilen emojiler ve kullanım kodları:\n\n${listText}`)
                .addFields(
                    { name: '📊 Toplam Dev Emoji', value: `\`${appEmojis.size}\``, inline: true },
                    { name: '🖼️ Hareketsiz', value: `\`${staticCount}\``, inline: true },
                    { name: '✨ Hareketli (GIF)', value: `\`${animatedCount}\``, inline: true }
                )
                .setFooter({ 
                    text: `Sayfa ${currentPage + 1} / ${totalPages} • Sahip: ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setTimestamp();
        };

        // Kategori Seçim Menüsü (Select Menu)
        const getSelectMenuRow = () => new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('filter_select')
                .setPlaceholder('🔍 Emojileri Filtrele...')
                .addOptions([
                    { label: 'Tüm Emojiler', value: 'all', description: 'Tüm emojileri listeler', emoji: '🌐', default: currentFilter === 'all' },
                    { label: 'Hareketsiz Emojiler', value: 'static', description: 'Sadece normal emojiler', emoji: '🖼️', default: currentFilter === 'static' },
                    { label: 'Hareketli (GIF) Emojiler', value: 'animated', description: 'Sadece GIF emojiler', emoji: '✨', default: currentFilter === 'animated' }
                ])
        );

        // Gezinme & Aksiyon Butonları
        const getButtonRow = () => {
            const filteredList = Array.from(getFilteredEmojis().values());
            const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Önceki')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Sonraki ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('txt_export')
                    .setLabel('📄 TXT Dökümü')
                    .setStyle(ButtonStyle.Success)
            );
        };

        // Mesajı Gönder
        const panelMessage = await message.reply({
            embeds: [generateEmbed()],
            components: [getSelectMenuRow(), getButtonRow()]
        });

        // 24 Saatlik Sürekli Dinleyici (Butonlar Silinmez)
        const collector = panelMessage.createMessageComponentCollector({
            time: 86400000 // 24 saat aktif kalır
        });

        collector.on('collect', async (interaction) => {
            // Sadece komutu yazan kullanabilir
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ 
                    content: `${emojis.hata} Bu paneli sadece komutu çalıştıran yetkili kontrol edebilir.`, 
                    ephemeral: true 
                });
            }

            // Kategori Menüsü Etkileşimi
            if (interaction.isStringSelectMenu() && interaction.customId === 'filter_select') {
                currentFilter = interaction.values[0];
                currentPage = 0; // Filtre değişince ilk sayfaya dön
                await interaction.update({ 
                    embeds: [generateEmbed()], 
                    components: [getSelectMenuRow(), getButtonRow()] 
                });
                return;
            }

            // Buton Etkileşimleri
            if (interaction.isButton()) {
                const filteredList = Array.from(getFilteredEmojis().values());
                const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

                if (interaction.customId === 'first') currentPage = 0;
                else if (interaction.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
                else if (interaction.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
                else if (interaction.customId === 'last') currentPage = totalPages - 1;
                else if (interaction.customId === 'txt_export') {
                    // Tüm Emojileri TXT Dosyası Olarak Çıkar
                    const fullText = appEmojis.map(e => `Emoji: ${e} | Kod: :${e.name}: | ID: ${e.id} | Animasyonlu: ${e.animated ? 'Evet' : 'Hayır'}`).join('\n');
                    const buffer = Buffer.from(fullText, 'utf-8');
                    const attachment = new AttachmentBuilder(buffer, { name: 'dev_portal_emojiler.txt' });

                    return interaction.reply({ 
                        content: '📜 **Developer Portal üzerindeki tüm emojilerin dökümü:**', 
                        files: [attachment], 
                        ephemeral: true 
                    });
                }

                await interaction.update({ 
                    embeds: [generateEmbed()], 
                    components: [getSelectMenuRow(), getButtonRow()] 
                });
            }
        });

        // Süre dolduğunda BUTONLARI SİLMEZ (Kullanıcının isteği üzerine)
        collector.on('end', () => {
            // Butonlar mesaj üzerinde aynen kalmaya devam eder
        });
    }
};