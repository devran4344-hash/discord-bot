const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'wasted',
    data: new SlashCommandBuilder()
        .setName('wasted')
        .setDescription('Kullanıcıya "WASTED" efekti uygular')
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
            const url    = `https://api.some-random-api.com/canvas/wasted?avatar=${encodeURIComponent(avatar)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());
            const embed  = new EmbedBuilder()
                .setColor(0xed4245)
                .setAuthor({ name: `${user.username} — WASTED`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setImage('attachment://wasted.png')
                .setFooter({ text: `İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'wasted.png' })],
            });
        } catch (e) {
            await interaction.editReply({ content: '❌ Görsel oluşturulamadı. API geçici olarak erişilemez olabilir.' });
        }
    },
};
