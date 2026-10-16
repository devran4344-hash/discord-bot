const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komut bulunamadi.')],
                ephemeral: true
            });
        }

        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(`[KOMUT HATASI] ${interaction.commandName}:`, err);

            const errorMsg = {
                embeds: [errorEmbed('Bir hata olustu, tekrar dener misin kanka?')],
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }
};
