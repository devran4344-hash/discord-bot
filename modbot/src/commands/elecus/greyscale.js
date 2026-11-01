const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'greyscale',
    data: new SlashCommandBuilder()
        .setName('greyscale')
        .setDescription('Kullanıcı profilini siyah-beyaz yapar 🖤')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Siyah-beyaz yapılacak kullanıcı (boş = sen)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const user   = interaction.options.getUser('kullanici') || interaction.user;
            const avatar = user.displayAvatarURL({ extension: 'png', size: 512 });
            const url    = `https://api.some-random-api.com/canvas/greyscale?avatar=${encodeURIComponent(avatar)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());
            const embed  = new EmbedBuilder()
                .setColor(0x808080)
                .setAuthor({ name: `${user.username} — Siyah & Beyaz`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setImage('attachment://greyscale.png')
                .setFooter({ text: `İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'greyscale.png' })],
            });
        } catch (e) {
            await interaction.editReply({ content: '❌ Görsel oluşturulamadı. API geçici olarak erişilemez.' });
        }
    },
};
