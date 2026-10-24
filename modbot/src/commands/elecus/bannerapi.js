const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'bannerapi',
    data: new SlashCommandBuilder().setName('bannerapi').setDescription('Hex kodu ile banner oluşturur')
        .addStringOption(opt => opt.setName('renk').setDescription('HEX kodu (Örn: 5865f2)').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const renk = interaction.options.getString('renk');
            const url = "https://elecus.dev/api/v1/banner?renk=" + encodeURIComponent(renk);
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'banner.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
