const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const KATEGORILER = {
    'köpek':  { key: 'dog',   emoji: '🐶', color: 0xa0522d },
    'kedi':   { key: 'cat',   emoji: '🐱', color: 0xffa500 },
    'panda':  { key: 'panda', emoji: '🐼', color: 0x2f3136 },
    'tilki':  { key: 'fox',   emoji: '🦊', color: 0xff6b35 },
    'koala':  { key: 'koala', emoji: '🐨', color: 0x9b59b6 },
    'kuş':    { key: 'bird',  emoji: '🐦', color: 0x1abc9c },
    'el ahtapotu': { key: 'elephant', emoji: '🐘', color: 0x7f8c8d },
};

module.exports = {
    name: 'gercek',
    data: new SlashCommandBuilder()
        .setName('gercek')
        .setDescription('Rastgele bir hayvan gerçeği öğren')
        .addStringOption(opt =>
            opt.setName('tur')
                .setDescription('Gerçek öğrenmek istediğin hayvan')
                .setRequired(true)
                .addChoices(
                    { name: '🐶 Köpek',  value: 'köpek'  },
                    { name: '🐱 Kedi',   value: 'kedi'   },
                    { name: '🐼 Panda',  value: 'panda'  },
                    { name: '🦊 Tilki',  value: 'tilki'  },
                    { name: '🐨 Koala',  value: 'koala'  },
                    { name: '🐦 Kuş',    value: 'kuş'    },
                    { name: '🐘 Fil',    value: 'el ahtapotu' },
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const tur  = interaction.options.getString('tur');
            const kat  = KATEGORILER[tur];
            if (!kat) return interaction.editReply({ content: '❌ Bilinmeyen kategori.' });

            const res = await fetch(`https://api.some-random-api.com/facts/${kat.key}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(kat.color)
                .setTitle(`${kat.emoji} ${tur.charAt(0).toUpperCase() + tur.slice(1)} Gerçeği`)
                .setDescription(`> ${data.fact}`)
                .setFooter({ text: `some-random-api • facts/${kat.key} | İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ Gerçek yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
