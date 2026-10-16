const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { success, error } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karakter-sifirla')
        .setDescription('Karakterini tamamen sifirla'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) {
            return interaction.reply({ embeds: [error('Zaten karakterin yok.')], ephemeral: true });
        }
        await db.updateUser(interaction.user.id, {
            karakter: null,
            iliski: { sevgiPuani: 0, seviye: 1, ruhHali: 'mutlu', baslangic: new Date().toISOString(), sonMesaj: Date.now(), kavgaSebebi: null },
            gecmis: [], anilar: [], hatiralar: {}
        });
        return interaction.reply({ embeds: [success('Karakterin sifirlandi. `/karakter olustur` ile yeniden basla.')], ephemeral: true });
    }
};
