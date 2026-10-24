const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'resim',
    data: new SlashCommandBuilder().setName('resim').setDescription('Özel resim oluşturur (Sadece yazıyı sen gir)')
        .addStringOption(opt => opt.setName('yazi').setDescription('Resimde yazacak yazı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const yazi = interaction.options.getString('yazi');
            const arkaplan = "https://cdn.discordapp.com/attachments/1510712028514484354/1563630515410575463/ChatGPT_Image_26_Eyl_2026_01_26_15.png";
            const yazihex = "ffffff"; // Sabit beyaz renk
            const boyut = "700,300"; // Sabit boyut
            const yazix = "350"; 
            const yaziy = "150"; 
            const yaziboyut = "50"; 
            
            const url = https://elecus.dev/api/v1/resim?arkaplan=\&yazi=\&yazihex=\&boyut=\&yazix=\&yaziy=\&yaziboyut=\;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'resim.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
