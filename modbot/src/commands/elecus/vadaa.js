const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'vadaa',
    data: new SlashCommandBuilder().setName('vadaa').setDescription('Vadaa resmi gösterir')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID (1-10)').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const id = interaction.options.getInteger('id');
            const url = "https://elecus.dev/api/v1/vadaa?id=" + id;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'vadaa.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
