const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'texttoemoji',
    data: new SlashCommandBuilder().setName('texttoemoji').setDescription('Yazıyı emojiye çevirir')
        .addStringOption(opt => opt.setName('yazi').setDescription('Çevrilecek yazı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const url = `https://elecus.dev/api/v1/texttoemoji?text=${encodeURIComponent(interaction.options.getString('yazi'))}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const result = data.result || data.text || JSON.stringify(data);
            const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🔠 Emoji Çevirisi').setDescription(result);
            await interaction.editReply({ embeds: [embed] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};

