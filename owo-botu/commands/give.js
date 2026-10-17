const { getUser, getDB } = require('../utils/db');
module.exports = {
    name: 'give',
    async execute(message, args, E) {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || isNaN(amount) || amount <= 0) return message.reply(`${E.bag} | Usage: \`owo give @user <amount>\``);
        const user = getUser(message.author.id);
        if (user.cash < amount) return message.reply(`${E.cowoncy} | You don't have enough cowoncy!`);

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor('#2b2d31')
            .setDescription(`${E.bag} **${message.author.username}**, you are about to give cowoncy to **${target.username}**\n\n` +
                            `To confirm this transaction, click ✅ Confirm.\n` +
                            `To cancel this transaction, click ❌ Cancel.\n\n` +
                            `⚠️ *It is against our rules to trade cowoncy for anything of monetary value. This includes real money, crypto, nitro, or anything similar. You will be **banned** for doing so.*\n\n` +
                            `**@${message.author.username}** will give **@${target.username}**:\n` +
                            `\`\`\`\n${amount.toLocaleString()} cowoncy\n\`\`\``);

        const row = new (require('discord.js').ActionRowBuilder)().addComponents(
            new (require('discord.js').ButtonBuilder)().setCustomId(`give_confirm_${target.id}_${amount}`).setLabel('Confirm').setStyle(require('discord.js').ButtonStyle.Success).setEmoji('✅'),
            new (require('discord.js').ButtonBuilder)().setCustomId(`give_cancel`).setLabel('Cancel').setStyle(require('discord.js').ButtonStyle.Danger).setEmoji('❌')
        );

        return message.reply({ embeds: [embed], components: [row] });
    }
};
