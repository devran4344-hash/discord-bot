const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'qr',
    data: new SlashCommandBuilder().setName('qr').setDescription('Yazıyı QR koda dönüştürür')
        .addStringOption(opt => opt.setName('yazi').setDescription('Link veya metin').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const yazi = interaction.options.getString('yazi');
            const url = https://elecus.dev/api/v1/qr?yazi=\;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'qr.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
