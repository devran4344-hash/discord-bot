const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

// pollinations.ai — tamamen ücretsiz, key gerektirmez, FLUX modeli
const BASE_URL = 'https://image.pollinations.ai/prompt';

module.exports = {
    name: 'hayal',
    data: new SlashCommandBuilder()
        .setName('hayal')
        .setDescription('AI ile görsel oluşturur — ücretsiz, hesap gerektirmez ✨')
        .addStringOption(opt =>
            opt.setName('prompt')
                .setDescription('Oluşturulacak görselin açıklaması')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(opt =>
            opt.setName('model')
                .setDescription('AI modeli (varsayılan: flux)')
                .setRequired(false)
                .addChoices(
                    { name: '⚡ FLUX (Yüksek Kalite)', value: 'flux'         },
                    { name: '🚀 Turbo (Hızlı)',         value: 'flux-schnell' },
                )
        )
        .addStringOption(opt =>
            opt.setName('boyut')
                .setDescription('Görsel boyutu (varsayılan: 1024x1024)')
                .setRequired(false)
                .addChoices(
                    { name: '🔲 1024x1024 (Kare)',  value: '1024x1024' },
                    { name: '📱 768x1024 (Dikey)',  value: '768x1024'  },
                    { name: '🖥️ 1024x768 (Yatay)', value: '1024x768'  },
                    { name: '🖼️ 1280x720 (Geniş)', value: '1280x720'  },
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const prompt = interaction.options.getString('prompt');
            const model  = interaction.options.getString('model') || 'flux';
            const boyut  = interaction.options.getString('boyut') || '1024x1024';
            const [width, height] = boyut.split('x').map(Number);
            const seed   = Math.floor(Math.random() * 99999);

            const params = new URLSearchParams({
                model,
                width:   String(width),
                height:  String(height),
                seed:    String(seed),
                nologo:  'true',
                enhance: 'false',
            });

            const url = `${BASE_URL}/${encodeURIComponent(prompt)}?${params}`;

            const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer  = Buffer.from(await res.arrayBuffer());
            const modelAd = model === 'flux' ? 'FLUX' : 'FLUX Turbo';

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('✨ AI Görsel Oluşturuldu')
                .setDescription(`> **Prompt:** ${prompt}`)
                .setImage('attachment://hayal.png')
                .addFields(
                    { name: '🤖 Model',  value: `\`${modelAd}\``,        inline: true },
                    { name: '📐 Boyut',  value: `\`${width}x${height}\``, inline: true },
                    { name: '🎲 Seed',   value: `\`${seed}\``,             inline: true },
                )
                .setFooter({ text: `Pollinations.ai • İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files:  [new AttachmentBuilder(buffer, { name: 'hayal.png' })],
            });
        } catch (e) {
            const isTimeout = e.name === 'TimeoutError' || /timeout|abort/i.test(e.message || '');
            await interaction.editReply({
                content: isTimeout
                    ? '⏱️ Görsel oluşturma zaman aşımına uğradı. Daha basit bir prompt dene.'
                    : '❌ Görsel oluşturulamadı. Lütfen tekrar dene.',
            });
        }
    },
};
