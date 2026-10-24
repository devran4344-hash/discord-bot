const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'ship',
    data: new SlashCommandBuilder().setName('ship').setDescription('İki kullanıcıyı ship yapar')
        .addUserOption(opt => opt.setName('kullanici1').setDescription('1. Kullanıcı').setRequired(true))
        .addUserOption(opt => opt.setName('kullanici2').setDescription('2. Kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const a1 = interaction.options.getUser('kullanici1').displayAvatarURL({ extension: 'png', size: 512 });
            const a2 = interaction.options.getUser('kullanici2').displayAvatarURL({ extension: 'png', size: 512 });
            const bg = "https://cdn.discordapp.com/attachments/1510712028514484354/1563630515410575463/ChatGPT_Image_26_Eyl_2026_01_26_15.png"; // Sabit arka plan
            const level = 85; // Sabit seviye
            const url = https://elecus.dev/api/v1/ship?avatar1=\&avatar2=\&background=\&level=\;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'ship.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
