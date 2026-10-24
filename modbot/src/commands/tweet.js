const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('tweet').setDescription('Sahte tweet oluşturur')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Tweet atan kişi').setRequired(true))
        .addStringOption(opt => opt.setName('kullaniciadi').setDescription('Twitter kullanıcı adı').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Tweet metni').setRequired(true))
        .addStringOption(opt => opt.setName('tema').setDescription('dark veya light').setRequired(true).addChoices({name: 'Karanlık', value: 'dark'}, {name: 'Aydınlık', value: 'light'})),
    async execute(interaction) {
        await interaction.deferReply();
        const avatar = interaction.options.getUser('kullanici').displayAvatarURL({ extension: 'png', size: 512 });
        const uname = interaction.options.getString('kullaniciadi');
        const msg = interaction.options.getString('mesaj');
        const theme = interaction.options.getString('tema');
        
        const url = `https://elecus.dev/api/v1/tweet?avatar=${encodeURIComponent(avatar)}&username=${encodeURIComponent(uname)}&username2=${encodeURIComponent(uname)}&message=${encodeURIComponent(msg)}&theme=${theme}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const buffer = Buffer.from(await res.arrayBuffer());
            await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'tweet.png' })] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};
