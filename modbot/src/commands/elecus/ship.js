const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('ship').setDescription('İki kişiyi ship yapar')
        .addUserOption(opt => opt.setName('kullanici1').setDescription('1. Kullanıcı').setRequired(true))
        .addUserOption(opt => opt.setName('kullanici2').setDescription('2. Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('arkaplan').setDescription('Arkaplan resmi linki').setRequired(false))
        .addIntegerOption(opt => opt.setName('seviye').setDescription('Sevgi seviyesi (0-100)').setRequired(false).setMinValue(0).setMaxValue(100)),
    async execute(interaction) {
        await interaction.deferReply();
        const a1 = interaction.options.getUser('kullanici1').displayAvatarURL({ extension: 'png', size: 512 });
        const a2 = interaction.options.getUser('kullanici2').displayAvatarURL({ extension: 'png', size: 512 });
        const bg = interaction.options.getString('arkaplan') || '';
        const level = interaction.options.getInteger('seviye') || 50;
        
        let url = `https://elecus.dev/api/v1/ship?avatar1=${encodeURIComponent(a1)}&avatar2=${encodeURIComponent(a2)}&level=${level}`;
        if (bg) url += `&background=${encodeURIComponent(bg)}`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'ship.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
