const { Events } = require('discord.js');
const { error } = require('../utils/embeds');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

        // Slash komut
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (err) {
                console.error(`[KOMUT HATASI] ${interaction.commandName}:`, err);
                const msg = { embeds: [error('Bir hata olustu kanka, tekrar dener misin?')], ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg).catch(() => {});
                } else {
                    await interaction.reply(msg).catch(() => {});
                }
            }
            return;
        }

        // Buton veya menu
        const customId = interaction.customId;
        const handler = client.commands.get(customId.split('_')[0]) || client.buttons?.get(customId);
        if (handler && handler.handleInteraction) {
            try {
                await handler.handleInteraction(interaction, client);
            } catch (err) {
                console.error('[INTERACTION HATASI]', err);
            }
        }
    }
};
