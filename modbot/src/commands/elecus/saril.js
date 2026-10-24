const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'saril',
    data: new SlashCommandBuilder().setName('saril').setDescription('İki kullanıcıyı sarıltır')
        .addUserOption(opt => opt.setName('kullanici1').setDescription('1. Kullanıcı').setRequired(true))
        .addUserOption(opt => opt.setName('kullanici2').setDescription('2. Kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const a1 = interaction.options.getUser('kullanici1').displayAvatarURL({ extension: 'png', size: 512 });
            const a2 = interaction.options.getUser('kullanici2').displayAvatarURL({ extension: 'png', size: 512 });
            
            const url = "https://elecus.dev/api/v1/saril?avatar1=" + encodeURIComponent(a1) + "&avatar2=" + encodeURIComponent(a2);
            
            const res = await fetch(url);
            const contentType = res.headers.get('content-type');
            
            // Eğer API JSON (hata) döndürdüyse
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                return await interaction.editReply({ content: '❌ API Hatası: ' + (data.hata || 'Bilinmeyen hata') });
            }

            if (!res.ok) throw new Error('API yanit vermedi');
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'saril.png' })] });
        } catch (e) { 
            await interaction.editReply('❌ Sarılma görseli oluşturulamadı. API sunucusu yoğun olabilir.'); 
        }
    }
};
