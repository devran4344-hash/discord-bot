'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayerTeam, getTeamById, TRANSFER_LOG_CHANNEL } = require('../../utils/transferConfig');
const { getPlayer, recordMatch, releasePlayer } = require('../../utils/transferDB');

module.exports = {
    name: 'macoynadim',
    data: new SlashCommandBuilder()
        .setName('macoynadim')
        .setDescription('Maç oynadığını kaydet (loan süresi ve transfer kilidi için zorunlu)'),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild  = interaction.guild;
        const member = interaction.member;

        // ── Oyuncu bu sistemde kayıtlı mı? ──
        const playerData = await getPlayer(guild.id, member.id);
        if (!playerData || !playerData.teamId) {
            return interaction.editReply({ content: '❌ Herhangi bir takımda kayıtlı değilsin.' });
        }

        const currentTeam = playerData.isLoaned && playerData.loanData
            ? getTeamById(playerData.loanData.toTeamId)
            : getTeamById(playerData.teamId);

        // ── Maç sayacını artır ──
        const result = await recordMatch(guild.id, member.id);
        if (!result.done) {
            return interaction.editReply({ content: `❌ Kayıt güncellenemedi: ${result.error}` });
        }

        // ── Loan bitti mi? ──
        if (result.loanEnded) {
            const loanData  = playerData.loanData;
            const origTeam  = getTeamById(loanData.fromTeamId);
            const loanTeam  = getTeamById(loanData.toTeamId);

            // Loan takımının rolünü al
            if (loanTeam) {
                await member.roles.remove(loanTeam.playerRole).catch(() => {});
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xfee75c)
                    .setTitle('⏱️ Loan Süresi Doldu!')
                    .setDescription(
                        `Loan süren sona erdi. **${loanTeam?.name}** takımındaki rolün kaldırıldı.\n` +
                        `**${origTeam?.name}** takımına geri döndün.`
                    )
                    .addFields(
                        { name: '📊 Bu Takımdaki Maç', value: `\`${result.matchesPlayed}\``, inline: true },
                    )
                    .setFooter({ text: 'Transfer Sistemi' })
                    .setTimestamp()],
            });

            // Transfer log
            const logChannel = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle('📋 TRANSFER | LOAN BİTTİ')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '👤 Oyuncu',       value: `<@${member.id}>\n\`${member.user.username}\``, inline: true },
                        { name: '🏟️ Loan Takımı', value: `**${loanTeam?.name || '?'}**`,                 inline: true },
                        { name: '🏠 Asıl Takım',  value: `**${origTeam?.name || '?'}**`,                 inline: true },
                    )
                    .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
            return;
        }

        // ── Normal maç kaydı ──
        const isLoaned   = playerData.isLoaned && playerData.loanData;
        const leftMatches = isLoaned ? result.player.loanData?.matchesLeft : null;

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Maç Kaydedildi')
            .setDescription(`**${member.user.username}** maç oynadığını kaydetti.`)
            .addFields(
                { name: '🏟️ Takım',        value: `**${currentTeam?.name || playerData.teamId}**`, inline: true },
                { name: '📊 Toplam Maç',   value: `\`${result.matchesPlayed}\``,                    inline: true },
            )
            .setFooter({ text: 'Kural 5: 1 maç oynamadan başka takıma sign olunamazsın.' })
            .setTimestamp();

        if (isLoaned && leftMatches !== null) {
            embed.addFields({ name: '⏱️ Loan Kalan Maç', value: `\`${leftMatches}\``, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
