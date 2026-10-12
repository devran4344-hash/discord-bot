'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const { JsonDB }      = require('node-json-db');
const fs              = require('fs');
const path            = require('path');
const config          = require('../config');
const LanguageManager = require('../src/LanguageManager');
const MusicEmbedManager = require('../src/MusicEmbedManager');

const db = new JsonDB('database/languages', true, true, '/');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Change the bot language for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    embeds: [MusicEmbedManager.error(
                        'Permission Denied',
                        'You need the **Manage Server** permission to change the bot language.'
                    )],
                    ephemeral: true,
                });
            }

            const guildId = interaction.guild.id;

            // ── Current language ──
            let currentLang = 'en';
            try { currentLang = await db.getData(`/servers/${guildId}/language`); } catch { /* default */ }

            // ── Load available languages ──
            const langDir   = path.join(__dirname, '..', 'languages');
            const langFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
            const languages = langFiles.map(f => {
                const data = JSON.parse(fs.readFileSync(path.join(langDir, f), 'utf8'));
                return { code: data.language.code, name: data.language.name, flag: data.language.flag };
            }).sort((a, b) => a.name.localeCompare(b.name));

            const current = languages.find(l => l.code === currentLang);

            // ── Embed ──
            const embed = new EmbedBuilder()
                .setColor(config.bot.colors.default)
                .setAuthor({
                    name: '🌍  Language Settings',
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTitle('Choose a Language')
                .setDescription(
                    '> Select your server\'s language by clicking one of the buttons below.\n' +
                    '> The bot will respond in the chosen language for all interactions.'
                )
                .addFields({
                    name: '✅  Current Language',
                    value: current ? `${current.flag}  **${current.name}**` : '`English`',
                    inline: false,
                })
                .setFooter({ text: `${languages.length} languages available` })
                .setTimestamp();

            // ── Buttons (5 per row, max 5 rows = 25 buttons) ──
            const rows = [];
            let row    = new ActionRowBuilder();
            let count  = 0;

            for (const lang of languages) {
                if (count > 0 && count % 5 === 0) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                    if (rows.length >= 5) break; // Discord limit: 5 rows
                }
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`language_${lang.code}`)
                        .setLabel(lang.name)
                        .setEmoji(lang.flag)
                        .setStyle(lang.code === currentLang ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
                count++;
            }
            if (row.components.length) rows.push(row);

            await interaction.reply({ embeds: [embed], components: rows });

        } catch (err) {
            console.error('language.execute:', err);
            try {
                const errEmbed = MusicEmbedManager.error('Error', 'Could not load the language settings.');
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errEmbed] });
                } else {
                    await interaction.reply({ embeds: [errEmbed], ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },

    // ── Button handler (called from buttonHandler.js) ────────────────────────
    async handleLanguageButton(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    embeds: [MusicEmbedManager.error(
                        'Permission Denied',
                        'You need the **Manage Server** permission to change the language.'
                    )],
                    ephemeral: true,
                });
            }

            const guildId      = interaction.guild.id;
            const selectedLang = interaction.customId.replace('language_', '');

            const saved = await LanguageManager.setServerLanguage(guildId, selectedLang);
            if (!saved) throw new Error('Failed to save language preference');

            const langData = await LanguageManager.getLanguageData(selectedLang);
            if (!langData) throw new Error('Invalid language code');

            const { flag, name } = langData.language;

            const embed = new EmbedBuilder()
                .setColor(config.bot.colors.success)
                .setAuthor({
                    name: '🌍  Language Updated',
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTitle(`${flag}  ${name}`)
                .setDescription(`The bot language has been changed to **${name}** for this server.`)
                .setTimestamp()
                .setFooter({ text: 'All future responses will use this language.' });

            await interaction.update({ embeds: [embed], components: [] });

        } catch (err) {
            console.error('language.handleLanguageButton:', err);
            try {
                const errEmbed = MusicEmbedManager.error('Error', 'Could not save the language preference.');
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errEmbed] });
                } else {
                    await interaction.update({ embeds: [errEmbed], components: [] });
                }
            } catch { /* already replied */ }
        }
    },
};
