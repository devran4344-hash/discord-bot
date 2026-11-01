const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// AGENT_MODE'da slash komutları kaydetme — RRT bot halleder
// Ajanlar sadece müzik çalar, komut kaydı RRT'nin işi
if (process.env.AGENT_MODE === 'true') {
    module.exports = { commands: [] };
} else {
    // Load all command files
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️  Warning: ${file} is missing required "data" or "execute" property.`);
        }
    }

    const rest = new REST().setToken(config.discord.token);

    (async () => {
        try {
            console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);

            let data;

            if (config.discord.guildId) {
                data = await rest.put(
                    Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
                    { body: commands }
                );
                console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands for guild ${config.discord.guildId}.`);
            } else {
                data = await rest.put(
                    Routes.applicationCommands(config.discord.clientId),
                    { body: commands }
                );
                console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
            }

            console.log('\n📝 Deployed commands:');
            data.forEach(command => {
                console.log(`   • /${command.name} - ${command.description}`);
            });

        } catch (error) {
            if (error.code === 50001) {
                console.error('❌ Command deployment failed: Bot has no access to the target guild.');
            } else {
                console.error('❌ Error deploying commands:', error);
            }
        }
    })();

    module.exports = { commands };
}
