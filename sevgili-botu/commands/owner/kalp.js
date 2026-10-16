const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, owner } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-kalp')
        .setDescription('[OWNER] Kullaniciya kalp ver/al')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('miktar').setDescription('Pozitif verir, negatif alir').setRequired(true).setMinValue(-10000).setMaxValue(10000)
        ),

    async execute(interaction) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ embeds: [error('Yetkin yok.')], ephemeral: true });
        }

        await interaction.deferReply();
        const target = interaction.options.getUser('kullanici');
        const miktar = interaction.options.getInteger('miktar');

        await db.addPara(target.id, miktar);
        const user = await db.getUser(target.id);
        const verb = miktar >= 0 ? 'verildi' : 'alindi';

        return interaction.editReply({
            embeds: [owner('Kalp Islem Tamam', `<@${target.id}> kullanicisina **${Math.abs(miktar)} 💎** ${verb}.\nYeni bakiye: **${user?.cuzdan || 0} 💎**`)]
        });
    }
};
