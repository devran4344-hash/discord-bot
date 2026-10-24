const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('banner').setDescription('Verilen HEX kodu ile renkli banner oluşturur')
        .addStringOption(opt => opt.setName('renk').setDescription('HEX kodu (Örn: 5865f2)').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const renk = interaction.options.getString('renk');
        const url = `https://elecus.dev/api/v1/banner?renk=${encodeURIComponent(renk)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'banner.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
