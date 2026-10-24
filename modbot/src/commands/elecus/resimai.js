const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'resimai',
    data: new SlashCommandBuilder().setName('resimai').setDescription('Yapay zeka ile resim oluşturur')
        .addStringOption(opt => opt.setName('prompt').setDescription('İngilizce açıklama').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const prompt = interaction.options.getString('prompt');
            const url = https://elecus.dev/api/v1/resimai?prompt=\;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'resimai.png' })] });
        } catch (e) { await interaction.editReply('❌ Resim oluşturulamadı.'); }
    }
};
