const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('resimai').setDescription('Yapay zeka ile resim oluşturur')
        .addStringOption(opt => opt.setName('prompt').setDescription('Resmin İngilizce açıklaması').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const prompt = interaction.options.getString('prompt');
        const url = `https://elecus.dev/api/v1/resimai?prompt=${encodeURIComponent(prompt)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'resimai.png' })] });
        } catch { await interaction.editReply('❌ Resim oluşturulamadı.'); }
    }
};
