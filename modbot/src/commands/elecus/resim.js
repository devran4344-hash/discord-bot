const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('resim').setDescription('Özel resim oluşturur')
        .addStringOption(opt => opt.setName('arkaplan').setDescription('Arkaplan resim linki').setRequired(true))
        .addStringOption(opt => opt.setName('yazi').setDescription('Yazı').setRequired(true))
        .addStringOption(opt => opt.setName('yazihex').setDescription('Yazı rengi (HEX)').setRequired(true))
        .addStringOption(opt => opt.setName('boyut').setDescription('Tuval boyutu (örn: 700,300)').setRequired(true))
        .addStringOption(opt => opt.setName('yazix').setDescription('Yazı X konumu').setRequired(true))
        .addStringOption(opt => opt.setName('yaziy').setDescription('Yazı Y konumu').setRequired(true))
        .addStringOption(opt => opt.setName('yaziboyut').setDescription('Yazı boyutu').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const arkaplan = interaction.options.getString('arkaplan');
        const yazi = interaction.options.getString('yazi');
        const yazihex = interaction.options.getString('yazihex');
        const boyut = interaction.options.getString('boyut');
        const yazix = interaction.options.getString('yazix');
        const yaziy = interaction.options.getString('yaziy');
        const yaziboyut = interaction.options.getString('yaziboyut');
        
        const url = `https://elecus.dev/api/v1/resim?arkaplan=${encodeURIComponent(arkaplan)}&yazi=${encodeURIComponent(yazi)}&yazihex=${encodeURIComponent(yazihex)}&boyut=${encodeURIComponent(boyut)}&yazix=${encodeURIComponent(yazix)}&yaziy=${encodeURIComponent(yaziy)}&yaziboyut=${encodeURIComponent(yaziboyut)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'resim.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
