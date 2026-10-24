const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'wanted',
    data: new SlashCommandBuilder().setName('wanted').setDescription('Aranıyor posteri oluşturur')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Aranan kişi').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const avatar = interaction.options.getUser('kullanici').displayAvatarURL({ extension: 'png', size: 512 });
            const url = https://elecus.dev/api/v1/wanted?avatar=\;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'wanted.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
