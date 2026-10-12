'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const config          = require('../config');
const YouTube         = require('../src/YouTube.js');
const MusicEmbedManager = require('../src/MusicEmbedManager');
const LanguageManager   = require('../src/LanguageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search YouTube and pick a song from the results')
        .addStringOption(opt =>
            opt.setName('query')
               .setDescription('Song name or artist to search')
               .setRequired(true)
        ),

    async execute(interaction) {
        const query   = interaction.options.getString('query');
        const guildId = interaction.guild.id;
        const member  = interaction.member;
        const guild   = interaction.guild;

        try {
            await interaction.deferReply();

            // ── Validation ──
            if (!member.voice.channel) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error(
                        'Voice Channel Required',
                        'You need to be in a voice channel to search for music.'
                    )],
                });
            }

            const perms = member.voice.channel.permissionsFor(guild.members.me);
            if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error(
                        'Missing Permissions',
                        'I need **Connect** and **Speak** permissions in your voice channel.'
                    )],
                });
            }

            const botVC = guild.members.me.voice.channel;
            if (botVC && botVC.id !== member.voice.channel.id) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error(
                        'Wrong Channel',
                        `I'm already playing in <#${botVC.id}>. Join that channel or stop the bot first.`
                    )],
                });
            }

            // ── Show searching spinner ──
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.bot.colors.youtube)
                        .setAuthor({
                            name: '🔴 YouTube  ·  Searching…',
                            iconURL: interaction.client.user.displayAvatarURL(),
                        })
                        .setDescription(`> 🔍  **${query}**`)
                        .setTimestamp(),
                ],
            });

            // ── Fetch results ──
            const results = await YouTube.search(query, 9, guildId);
            if (!results?.length) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error(
                        'No Results',
                        `Nothing found for **${query}**. Try a different search term.`
                    )],
                });
            }

            // ── Store results for button handler ──
            if (!global.searchResults) global.searchResults = new Map();
            global.searchResults.set(interaction.user.id, {
                query,
                results,
                guildId,
                timestamp: Date.now(),
            });
            setTimeout(() => global.searchResults?.delete(interaction.user.id), 5 * 60 * 1000);

            // ── Build results embed ──
            const embed = new EmbedBuilder()
                .setColor(config.bot.colors.youtube)
                .setAuthor({
                    name: '🔴 YouTube  ·  Search Results',
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTitle(`Results for: ${query}`)
                .setFooter({ text: `${results.length} result${results.length !== 1 ? 's' : ''} found  ·  Pick a number below` })
                .setTimestamp();

            const max = Math.min(results.length, 9);
            for (let i = 0; i < max; i++) {
                const r = results[i];
                embed.addFields({
                    name: `${i + 1}.  ${r.title || 'Unknown'}`,
                    value: `👤 \`${r.artist || r.author || 'Unknown'}\`  ·  ⏱ \`${_fmt(r.duration)}\``,
                    inline: false,
                });
            }

            // ── Build number buttons ──
            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            for (let i = 0; i < max; i++) {
                const btn = new ButtonBuilder()
                    .setCustomId(`search_select_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(ButtonStyle.Secondary);
                (i < 5 ? row1 : row2).addComponents(btn);
            }

            // Cancel button always on row1
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('search_cancel')
                    .setLabel('Cancel')
                    .setEmoji('✖️')
                    .setStyle(ButtonStyle.Danger)
            );

            const components = [row1];
            if (row2.components.length) components.push(row2);

            await interaction.editReply({ embeds: [embed], components });

        } catch (err) {
            console.error('search.execute:', err);
            const msg = MusicEmbedManager.error('Search Error', 'Something went wrong while searching. Please try again.');
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [msg], components: [] });
                } else {
                    await interaction.reply({ embeds: [msg], ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },
};

function _fmt(sec) {
    if (!sec) return '?:??';
    const s = Math.floor(Number(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${m}:${String(ss).padStart(2,'0')}`;
}
