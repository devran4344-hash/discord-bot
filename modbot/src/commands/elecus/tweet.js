const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    name: 'tweet',
    data: new SlashCommandBuilder().setName('tweet').setDescription('Sahte tweet oluşturur')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Tweet atan kişi').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Tweet metni').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const u = interaction.options.getUser('kullanici');
            const avatar = u.displayAvatarURL({ extension: 'png', size: 512 });
            const msg = interaction.options.getString('mesaj');
            const url = "https://elecus.dev/api/v1/tweet?avatar=" + encodeURIComponent(avatar) + "&username=" + encodeURIComponent(u.username) + "&username2=" + encodeURIComponent(u.username) + "&message=" + encodeURIComponent(msg) + "&theme=dark";
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'tweet.png' })] });
        } catch (e) { await interaction.editReply('❌ API yanıt vermedi veya hata oluştu.'); }
    }
};
