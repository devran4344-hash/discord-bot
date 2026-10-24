const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'ship',
    data: new SlashCommandBuilder().setName('ship').setDescription('İki kullanıcıyı ship yapar')
        .addUserOption(opt => opt.setName('kullanici1').setDescription('1. Kullanıcı').setRequired(true))
        .addUserOption(opt => opt.setName('kullanici2').setDescription('2. Kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const u1 = interaction.options.getUser('kullanici1');
            const u2 = interaction.options.getUser('kullanici2');
            const a1 = u1.displayAvatarURL({ extension: 'png', size: 512 });
            const a2 = u2.displayAvatarURL({ extension: 'png', size: 512 });
            
            const bg = "https://cdn.discordapp.com/attachments/1510712028514484354/1563630515410575463/ChatGPT_Image_26_Eyl_2026_01_26_15.png";
            
            // API'yi tatmin etmek için 'avatar' parametresini de ekledik
            const url = "https://elecus.dev/api/v1/ship?avatar=" + encodeURIComponent(a1) + 
                        "&avatar1=" + encodeURIComponent(a1) + 
                        "&avatar2=" + encodeURIComponent(a2) + 
                        "&background=" + encodeURIComponent(bg) + 
                        "&name=" + encodeURIComponent(u1.username) + 
                        "&name2=" + encodeURIComponent(u2.username) + 
                        "&level=85&shape=heart";

            const res = await fetch(url);
            const contentType = res.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                return await interaction.editReply({ content: '❌ API Hatası: ' + (data.hata || 'Bilinmeyen hata') });
            }

            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'ship.png' })] });
        } catch (e) { 
            await interaction.editReply('❌ Ship görseli oluşturulamadı.'); 
        }
    }
};
