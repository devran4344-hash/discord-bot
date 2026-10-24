const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('ai').setDescription('Yapay zekaya soru sorar')
        .addStringOption(opt => opt.setName('soru').setDescription('Sorunuz').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const soru = interaction.options.getString('soru');
        const url = `https://elecus.dev/api/v1/ai?soru=${encodeURIComponent(soru)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const result = data.cevap || data.sonuc || data.text || JSON.stringify(data);
            const embed = new EmbedBuilder().setColor(0x5865f2).setAuthor({ name: 'Yapay Zeka' }).setDescription(result);
            await interaction.editReply({ embeds: [embed] });
        } catch { await interaction.editReply('❌ Yapay zeka şu an yanıt veremiyor.'); }
    }
};
