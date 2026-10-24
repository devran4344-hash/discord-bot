const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'discord_bilgi',
    data: new SlashCommandBuilder().setName('discord_bilgi').setDescription('Kullanıcının Discord bilgilerini gösterir')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Bilgisi alınacak kullanıcı').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const id = interaction.options.getUser('kullanici').id;
        const url = `https://elecus.dev/api/v1/discord_bilgi?id=${id}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if(data.hata) return await interaction.editReply({ content: `❌ Hata: ${data.hata}` });
            
            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('Discord ID Bilgisi')
                .setDescription(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
            await interaction.editReply({ embeds: [embed] });
        } catch { await interaction.editReply('❌ API yanıt vermedi.'); }
    }
};

