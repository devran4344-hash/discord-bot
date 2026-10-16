const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-xp')
        .setDescription('[OWNER] Bir kullaniciya XP ver veya al')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Hedef kullanici')
                .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('miktar')
                .setDescription('Pozitif verir, negatif alir')
                .setRequired(true)
                .setMinValue(-10000)
                .setMaxValue(10000)
        ),

    async execute(interaction, client) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komutu kullanma yetkin yok kanka.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const target = interaction.options.getUser('kullanici');
        const miktar = interaction.options.getInteger('miktar');

        try {
            const result = await db.addXp(target.id, miktar);
            const verb = miktar >= 0 ? 'verildi' : 'alindi';
            await interaction.editReply({
                embeds: [ownerEmbed('XP Islem Tamam', `<@${target.id}> kullanicisina **${Math.abs(miktar)} XP** ${verb}.\nYeni XP: **${result.newXp}**`)]
            });
        } catch (err) {
            console.error('owner-xp hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('XP islemi yapilamadi.')]
            });
        }
    }
};
