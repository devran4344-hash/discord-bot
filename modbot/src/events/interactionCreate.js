const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Sadece slash komutları ile ilgilen
        if (!interaction.isChatInputCommand()) return;

        // Komutu bul
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[HATA] Komut bulunamadi: ${interaction.commandName}`);
            return;
        }

        try {
            // Komutu calistir (await ile bitmesini bekle)
            await command.execute(interaction);
        } catch (error) {
            console.error(`[HATA] Komut calistirilirken hata olustu: ${interaction.commandName}`);
            console.error(error);
            
            // Hata mesajini guvenli bir sekilde gonder
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ Bu komut calistirilirken bir hata olustu!', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Bu komut calistirilirken bir hata olustu!', ephemeral: true });
                }
            } catch (e) {
                console.error('Hata mesaji gonderilemedi:', e);
            }
        }
    },
};
