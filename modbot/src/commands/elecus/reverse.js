const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('reverse').setDescription('Yazıyı ters çevirir')
        .addStringOption(opt => opt.setName('yazi').setDescription('Ters çevrilecek yazı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const url = `https://elecus.dev/api/v1/reverse?text=${encodeURIComponent(interaction.options.getString('yazi'))}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const result = data.result || data.text || JSON.stringify(data);
            const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🔄 Ters Çevrildi').setDescription(`\`\`\`\n${result}\n\`\`\``);
            await interaction.editReply({ embeds: [embed] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
