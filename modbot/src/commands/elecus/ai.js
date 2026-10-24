const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'ai',
    data: new SlashCommandBuilder().setName('ai').setDescription('Yapay zekaya soru sorar')
        .addStringOption(opt => opt.setName('soru').setDescription('Sorunuz').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const soru = interaction.options.getString('soru');
            const url = https://elecus.dev/api/v1/ai?soru=\;
            const res = await fetch(url);
            const data = await res.json();
            const result = data.cevap || data.sonuc || data.text || JSON.stringify(data);
            const embed = new EmbedBuilder().setColor(0x5865f2).setAuthor({ name: 'Yapay Zeka' }).setDescription(result.toString());
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('❌ Yapay zeka şu an yanıt veremiyor.'); }
    }
};
