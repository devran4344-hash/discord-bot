const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('saril').setDescription('İki resmi birleştirip sarılma efekti verir')
        .addUserOption(opt => opt.setName('kullanici1').setDescription('1. Kullanıcı').setRequired(true))
        .addUserOption(opt => opt.setName('kullanici2').setDescription('2. Kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const a1 = interaction.options.getUser('kullanici1').displayAvatarURL({ extension: 'png', size: 512 });
        const a2 = interaction.options.getUser('kullanici2').displayAvatarURL({ extension: 'png', size: 512 });
        const url = `https://elecus.dev/api/v1/saril?avatar1=${encodeURIComponent(a1)}&avatar2=${encodeURIComponent(a2)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'saril.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
