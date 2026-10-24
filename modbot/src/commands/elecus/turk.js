const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('turk').setDescription('Resme Türk bayrağı kaplaması ekler')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kaplama eklenecek kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const avatar = interaction.options.getUser('kullanici').displayAvatarURL({ extension: 'png', size: 512 });
        const url = `https://elecus.dev/api/v1/turk?avatar=${encodeURIComponent(avatar)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'turk.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
