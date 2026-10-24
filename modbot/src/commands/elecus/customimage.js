const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('customimage').setDescription('Özel resim oluşturur')
        .addStringOption(opt => opt.setName('yazi').setDescription('Yazı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const url = `https://elecus.dev/api/v1/customimage?text=${encodeURIComponent(interaction.options.getString('yazi'))}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'custom.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
