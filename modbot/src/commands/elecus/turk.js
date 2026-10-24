const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'turk',
    data: new SlashCommandBuilder().setName('turk').setDescription('Kullanıcıya Türk bayrağı ekler')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const avatar = interaction.options.getUser('kullanici').displayAvatarURL({ extension: 'png', size: 512 });
            const url = https://elecus.dev/api/v1/turk?avatar=\;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'turk.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
