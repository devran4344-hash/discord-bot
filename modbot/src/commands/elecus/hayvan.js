const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// some-random-api /animal/{animal} desteklenen türler
const HAYVANLAR = {
    'köpek':   { key: 'dog',     emoji: '🐶', color: 0xa0522d },
    'kedi':    { key: 'cat',     emoji: '🐱', color: 0xffa500 },
    'panda':   { key: 'panda',   emoji: '🐼', color: 0x2f3136 },
    'tilki':   { key: 'fox',     emoji: '🦊', color: 0xff6b35 },
    'baykuş':  { key: 'koala',   emoji: '🐨', color: 0x9b59b6 },  // koala yerine baykuş yok, koala koyuyoruz
    'kuş':     { key: 'birb',    emoji: '🐦', color: 0x1abc9c },
    'balina':  { key: 'whale',   emoji: '🐳', color: 0x3498db },
    'tavşan':  { key: 'racoon',  emoji: '🐰', color: 0xf1c40f },  // raccoon en yakın
    'kanguru': { key: 'kangaroo',emoji: '🦘', color: 0xe67e22 },
    'köpek balığı': { key: 'shark', emoji: '🦈', color: 0x2980b9 },
};

module.exports = {
    name: 'hayvan',
    data: new SlashCommandBuilder()
        .setName('hayvan')
        .setDescription('Rastgele bir hayvan fotoğrafı ve ilginç bir gerçek gösterir')
        .addStringOption(opt =>
            opt.setName('tur')
                .setDescription('Hayvan türü')
                .setRequired(true)
                .addChoices(
                    { name: '🐶 Köpek',   value: 'köpek'   },
                    { name: '🐱 Kedi',    value: 'kedi'    },
                    { name: '🐼 Panda',   value: 'panda'   },
                    { name: '🦊 Tilki',   value: 'tilki'   },
                    { name: '🐨 Koala',   value: 'baykuş'  },
                    { name: '🐦 Kuş',     value: 'kuş'     },
                    { name: '🐳 Balina',  value: 'balina'  },
                    { name: '🐰 Rakun',   value: 'tavşan'  },
                    { name: '🦘 Kanguru', value: 'kanguru' },
                    { name: '🦈 Köpek Balığı', value: 'köpek balığı' },
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const tur    = interaction.options.getString('tur');
            const hayvan = HAYVANLAR[tur];
            if (!hayvan) return interaction.editReply({ content: '❌ Bilinmeyen hayvan türü.' });

            const res = await fetch(`https://api.some-random-api.com/animal/${hayvan.key}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(hayvan.color)
                .setTitle(`${hayvan.emoji} ${tur.charAt(0).toUpperCase() + tur.slice(1)} Fotoğrafı`)
                .setImage(data.image)
                .setDescription(`> 💡 **İlginç Gerçek:**\n> ${data.fact}`)
                .setFooter({ text: `some-random-api • animal/${hayvan.key} | İsteyen: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ Fotoğraf yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
