const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'yorum',
    data: new SlashCommandBuilder()
        .setName('yorum')
        .setDescription('Sahte YouTube yorumu oluşturur')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Yorumu yapan kullanıcı (boş = sen)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('yorum')
                .setDescription('Yorum metni')
                .setRequired(true)
                .setMaxLength(200)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const user    = interaction.options.getUser('kullanici') || interaction.user;
            const comment = interaction.options.getString('yorum');
            const avatar  = user.displayAvatarURL({ extension: 'png', size: 128 });

            const params = new URLSearchParams({
                avatar,
                username: user.username,
                comment,
            });
            const url = `https://api.some-random-api.com/canvas/youtube-comment?${params}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());
            const embed  = new EmbedBuilder()
                .setColor(0xff0000)
                .setAuthor({ name: `${user.username} — YouTube Yorumu`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setImage('attachment://yorum.png')
                .setFooter({ text: `İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'yorum.png' })],
            });
        } catch (e) {
            await interaction.editReply({ content: '❌ Görsel oluşturulamadı. API geçici olarak erişilemez olabilir.' });
        }
    },
};
