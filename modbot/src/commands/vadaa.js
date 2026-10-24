const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('vadaa').setDescription('Vadaa resmi gösterir (1-10 arası ID)')
        .addIntegerOption(opt => opt.setName('id').setDescription('Resim ID (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)),
    async execute(interaction) {
        await interaction.deferReply();
        const id = interaction.options.getInteger('id');
        const url = `https://elecus.dev/api/v1/vadaa?id=${id}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'vadaa.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
