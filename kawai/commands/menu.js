const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menü')
        .setDescription('Street Soccer bot komut menüsünü gösterir.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700') // Altın Sarısı
            .setTitle('🏆 STREET SOCCER BOT MENÜSÜ')
            .setDescription(
                '**Aşağıdaki komutları kullanarak maç görsellerini oluşturabilirsin!**\n\n' +
                '⚽ `/maçsaati` - Maç saati ve takımları belirler.\n' +
                '🏁 `/maçsonucu` - Maç sonucunu skorlarla birlikte gösterir.\n' +
                '🔥 `/derbi` - Özel derbi maçı tasarımı oluşturur.\n' +
                '📋 `/kura` - Fikstür ve kura tablosunu hazırlar.'
            )
            .setImage('https://i.imgur.com/SENIN_ARKA_PLAN_RESMIN.png') // İstersen buraya menü için havalı bir görsel linki koyabilirsin
            .setFooter({ text: 'Kawai Bot | Street Soccer', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('soccer_menu')
                .setPlaceholder('Bir işlem seç kral...')
                .addOptions([
                    { label: 'Maç Saati Ayarla', description: 'Takımlar, logolar, tarih ve saat.', value: 'mac_saati', emoji: '⏰' },
                    { label: 'Maç Sonucu Gir', description: 'Skorları ve takımları gir.', value: 'mac_sonucu', emoji: '🏁' },
                    { label: 'Derbi Maçı', description: 'Derbi havasında görsel oluştur.', value: 'derbi', emoji: '🔥' },
                    { label: 'Kura Çek', description: 'Fikstür tablosu oluştur.', value: 'kura', emoji: '📋' },
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu] });
    }
};
