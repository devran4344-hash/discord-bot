const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('translate').setDescription('Metni başka dile çevirir')
        .addStringOption(opt => opt.setName('yazi').setDescription('Çevrilecek metin').setRequired(true))
        .addStringOption(opt => opt.setName('dil').setDescription('Hedef dil (örn: en, tr, de)').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const url = `https://elecus.dev/api/v1/translate?text=${encodeURIComponent(interaction.options.getString('yazi'))}&lang=${interaction.options.getString('dil')}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const result = data.translation || data.result || data.text || JSON.stringify(data);
            const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🌐 Çeviri').setDescription(`\`\`\`\n${result}\n\`\`\``);
            await interaction.editReply({ embeds: [embed] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
