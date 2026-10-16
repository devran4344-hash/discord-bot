const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, success } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ozur')
        .setDescription('Kizginsa ozur dile')
        .addStringOption(opt =>
            opt.setName('mesaj').setDescription('Ozur mesajin').setRequired(false).setMaxLength(300)
        ),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });
        if (!user.iliski.kavgaSebebi) return interaction.reply({ embeds: [error('Zaten kizgin degil ki! 😊')], ephemeral: true });

        const mesaj = interaction.options.getString('mesaj') || 'Ozur dilerim...';

        // Sevgi puani geri kazanma
        await db.addSevgi(interaction.user.id, 20);
        await db.kavgaCoz(interaction.user.id);
        await db.ekleGecmis(interaction.user.id, 'user', `Ozur: ${mesaj}`);

        const cevap = `*gozleri doldu* ...\n\nTamam ${user.karakter.hitap}, seni affediyorum. Bir daha yapma ama! 🥺💕`;
        await db.ekleGecmis(interaction.user.id, 'assistant', cevap);

        return interaction.reply({ embeds: [success(`**${user.karakter.isim}** seni affetti! 💕\n\n${cevap}`)] });
    }
};
