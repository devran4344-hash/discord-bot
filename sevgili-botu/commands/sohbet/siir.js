const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { siir } = require('../../utils/ai');
const { error, ask } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder().setName('siir').setDescription('Sevgilin sana siir yazsin'),

    async execute(interaction) {
        await interaction.deferReply();
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.editReply({ embeds: [error('Once karakter olustur!')] });

        try {
            const cevap = await siir(user.karakter, interaction.user.username);
            await db.addSevgi(interaction.user.id, 8);
            await db.ekleGecmis(interaction.user.id, 'assistant', `Siir: ${cevap}`);
            await interaction.editReply({ embeds: [ask(`${user.karakter.isim} Sana Siir Yazdi`, cevap)] });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Siir yazamadim, tekrar dener misin?')] });
        }
    }
};
