const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        
        // ==========================================
        // 1. SLASH KOMUTLARI DİNLE
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                // KRİTİK DÜZELTME: client parametresi eklendi
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[HATA] ${interaction.commandName} komutunda hata:`, error);
                
                // Ephemeral uyarısını çözmek için MessageFlags.Ephemeral kullanıyoruz
                const replyOpts = { content: '❌ Komut çalıştırılırken hata oluştu!', flags: MessageFlags.Ephemeral };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(replyOpts);
                } else {
                    await interaction.reply(replyOpts);
                }
            }
            return;
        }

        // ==========================================
        // 2. KAYIT BUTONUNU DİNLE (Form Açma)
        // ==========================================
        if (interaction.isButton() && interaction.customId === 'kayit_buton') {
            const modal = new ModalBuilder()
                .setCustomId('kayit_modal')
                .setTitle('Sunucu Kayıt Formu');

            const isimInput = new TextInputBuilder()
                .setCustomId('kayit_isim')
                .setLabel('İsminiz Nedir?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: Umut')
                .setRequired(true);

            const yasInput = new TextInputBuilder()
                .setCustomId('kayit_yas')
                .setLabel('Yaşınız Kaç?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 20')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(isimInput);
            const secondActionRow = new ActionRowBuilder().addComponents(yasInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);
            return;
        }

        // ==========================================
        // 3. KAYIT FORMU GÖNDERİLDİĞİNDE DİNLE
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const isim = interaction.fields.getTextInputValue('kayit_isim');
            const yas = interaction.fields.getTextInputValue('kayit_yas');
            const member = interaction.member;

            try {
                // BURAYA KENDİ ROL VE KANAL ID'LERİNİ GİR
                const kayitliRolId = '123456789012345678'; 
                const welcomeChannelId = '123456789012345678'; 
                
                await member.setNickname(`${isim} | ${yas}`).catch(() => {});
                await member.roles.add(kayitliRolId).catch(() => {});

                await interaction.editReply({ content: `✅ Başarıyla kayıt oldun! İsmin **${isim} | ${yas}** olarak güncellendi.` });

                // --- BANNER API ENTEGRASYONU ---
                const welcomeChannel = interaction.guild.channels.cache.get(welcomeChannelId);
                if (welcomeChannel) {
                    try {
                        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 1024 });
                        const backgroundURL = 'https://i.imgur.com/jI1WIUh.jpeg'; // Senin Imgur linkin

                        const params = new URLSearchParams({
                            avatar: avatarURL,
                            arkaplan: backgroundURL,
                            yazi1: 'Hoşgeldin',
                            yazi2: isim,
                            yazi3: 'Sunucumuza katıldı',
                            baslikhex: 'ffffff',
                            usernamehex: '5865f2',
                            footerhex: 'a1a1ab'
                        });

                        const apiURL = `https://elecus.dev/api/v1/hgbb?${params.toString()}`;
                        const response = await fetch(apiURL);
                        
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-banner.png' });
                            await welcomeChannel.send({ files: [attachment] });
                        }
                    } catch (apiError) {
                        console.error('Banner API hatası:', apiError);
                    }
                }
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ Kayıt olurken bir hata oluştu. Lütfen yetkililere bildir.' });
            }
            return;
        }
    },
};
