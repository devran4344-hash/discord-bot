const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'renk',
    data: new SlashCommandBuilder()
        .setName('renk')
        .setDescription('Hex renk kodunu görsel olarak gösterir 🎨')
        .addStringOption(opt =>
            opt.setName('hex')
                .setDescription('Hex renk kodu (örn: FF5733 veya #FF5733)')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const hex    = interaction.options.getString('hex').replace('#', '').toUpperCase();
            if (!/^[0-9A-F]{6}$/.test(hex)) {
                return interaction.editReply({ content: '❌ Geçersiz hex kodu! Örnek: `FF5733` veya `#FF5733`' });
            }

            const url = `https://api.some-random-api.com/canvas/colorviewer?hex=${hex}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = Buffer.from(await res.arrayBuffer());

            // Renk ismi için ayrıca bilgi çek
            let renkIsim = '';
            try {
                const colorRes  = await fetch(`https://api.some-random-api.com/canvas/hex?hex=${hex}`);
                const colorData = await colorRes.json();
                renkIsim = colorData.name || '';
            } catch { /* sessize al */ }

            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);

            const embed = new EmbedBuilder()
                .setColor(parseInt(hex, 16))
                .setTitle(`🎨 #${hex}${renkIsim ? ` — ${renkIsim}` : ''}`)
                .setImage('attachment://renk.png')
                .addFields(
                    { name: '🔴 R', value: `\`${r}\``, inline: true },
                    { name: '🟢 G', value: `\`${g}\``, inline: true },
                    { name: '🔵 B', value: `\`${b}\``, inline: true },
                    { name: '🔢 Hex', value: `\`#${hex}\``, inline: true },
                )
                .setFooter({ text: `İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'renk.png' })],
            });
        } catch (e) {
            await interaction.editReply({ content: '❌ Görsel oluşturulamadı. API geçici olarak erişilemez.' });
        }
    },
};
