const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'triggered',
    data: new SlashCommandBuilder()
        .setName('triggered')
        .setDescription('Kullanıcıya "TRIGGERED" gif efekti uygular')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Efekt uygulanacak kullanıcı (boş = sen)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const user   = interaction.options.getUser('kullanici') || interaction.user;
            const avatar = user.displayAvatarURL({ extension: 'png', size: 512 });
            const url    = `https://api.some-random-api.com/canvas/triggered?avatar=${encodeURIComponent(avatar)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());
            const embed  = new EmbedBuilder()
                .setColor(0xfee75c)
                .setAuthor({ name: `${user.username} — TRIGGERED`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setImage('attachment://triggered.gif')
                .setFooter({ text: `İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'triggered.gif' })],
            });
        } catch (e) {
            await interaction.editReply({ content: '❌ Görsel oluşturulamadı. API geçici olarak erişilemez olabilir.' });
        }
    },
};
