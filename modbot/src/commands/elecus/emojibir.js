const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'emojibir',
    data: new SlashCommandBuilder().setName('emojibir').setDescription('İki emojiyi birleştirir')
        .addStringOption(opt => opt.setName('emoji1').setDescription('1. Emoji').setRequired(true))
        .addStringOption(opt => opt.setName('emoji2').setDescription('2. Emoji').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const e1 = interaction.options.getString('emoji1');
            const e2 = interaction.options.getString('emoji2');
            const url = "https://elecus.dev/api/v1/emojibir?emoji1=" + encodeURIComponent(e1) + "&emoji2=" + encodeURIComponent(e2);
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'emojibir.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
