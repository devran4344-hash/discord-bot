'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManagerTeam, getPlayerTeam, getTeamById, TRANSFER_LOG_CHANNEL, KADRO_LIMITI, UYE_ROLU } = require('../../utils/transferConfig');
const { getPlayer, signPlayer, getTeamPlayers } = require('../../utils/transferDB');

module.exports = {
    name: 'sign',
    data: new SlashCommandBuilder()
        .setName('sign')
        .setDescription('Takımına oyuncu veya menajer sign eder')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Sign edilecek oyuncu')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('tip')
            .setDescription('Normal oyuncu mu, menajer mi?')
            .setRequired(false)
            .addChoices(
                { name: '⚽ Oyuncu (varsayılan)', value: 'oyuncu'  },
                { name: '🧑‍💼 Menajer (Başkan Yardımcısı)', value: 'menajer' },
            )
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild  = interaction.guild;
        const exec   = interaction.member;
        const target = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const tip    = interaction.options.getString('tip') || 'oyuncu';

        if (!target) return interaction.editReply({ content: '❌ Oyuncu sunucuda bulunamadı.' });
        if (target.id === exec.id) return interaction.editReply({ content: '❌ Kendini sign edemezsin.' });
        if (target.user.bot) return interaction.editReply({ content: '❌ Botlar sign edilemez.' });

        // ── Komutu kullanan kişinin takımını bul ──
        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({ content: '❌ Bu komutu kullanmak için bir takımın Başkanı veya Başkan Yardımcısı olman gerekiyor.' });
        }

        // ── Hedef oyuncunun zaten bir takımı var mı? ──
        const existingTeam = getPlayerTeam(target);
        if (existingTeam) {
            return interaction.editReply({
                content: `❌ **${target.user.username}** zaten **${existingTeam.name}** takımında. Önce release alınmalı.\n> (Kural 5: Bir takımda en az 1 maç oynamadan başka takıma geçilemez)`,
            });
        }

        // ── Kural 5: Önceki takımında 1 maç oynadı mı? ──
        const playerData = await getPlayer(guild.id, target.id);
        if (playerData && playerData.matchesPlayed === 0 && playerData.teamId) {
            const prevTeam = getTeamById(playerData.teamId);
            return interaction.editReply({
                content: `❌ **${target.user.username}** önceki takımı **${prevTeam?.name || playerData.teamId}**'nde henüz 1 maç oynamadı.\n> Kural 5 gereği en az 1 maç oynamadan sign edilemez.`,
            });
        }

        // ── Kadro limiti kontrolü ──
        const teamPlayers = await getTeamPlayers(guild.id, managerTeam.id);
        if (teamPlayers.length >= KADRO_LIMITI) {
            return interaction.editReply({
                content: `❌ **${managerTeam.name}** kadro limitine ulaştı (${KADRO_LIMITI}/${KADRO_LIMITI}).\n> Kural 2: Birini release etmeden yeni oyuncu sign edemezsin.`,
            });
        }

        // ── Menajer sign ise Kural 3 & 4 kontrolü ──
        if (tip === 'menajer') {
            // Kural 3: "Menajer" parametresiyle sign
            const currentManagers = teamPlayers.filter(p => p.isMenager);
            const managerLimit    = teamPlayers.length >= Math.ceil(KADRO_LIMITI * 4 / 3) ? 3 : 2;

            if (currentManagers.length >= managerLimit) {
                return interaction.editReply({
                    content: `❌ **${managerTeam.name}** zaten ${managerLimit} menajerine sahip. Daha fazla menajer sign edilemez.\n> Kural 4: Kadro 4/3'ünü kapsamıyorsa en fazla 2 menajer olabilir.`,
                });
            }
        }

        // ── Rol işlemleri ──
        try {
            // Üye rolünü al (varsa)
            await target.roles.remove(UYE_ROLU).catch(() => {});

            // Takım oyuncu rolünü ver
            await target.roles.add(managerTeam.playerRole);

            // Menajer ise BY rolünü de ver
            if (tip === 'menajer') {
                await target.roles.add(managerTeam.viceRole);
            }
        } catch (e) {
            return interaction.editReply({ content: `❌ Rol verilemedi: \`${e.message}\`\n> Botun rol hiyerarşisi yeterli değil olabilir.` });
        }

        // ── Firebase'e kaydet ──
        await signPlayer(guild.id, target.id, managerTeam.id);
        if (tip === 'menajer') {
            const { setPlayer } = require('../../utils/transferDB');
            await setPlayer(guild.id, target.id, { isMenager: true });
        }

        // ── Onay yanıtı ──
        await interaction.editReply({ content: `✅ **${target.user.username}** → **${managerTeam.name}**'na başarıyla sign edildi!` });

        // ── Transfer log embed ──
        const logChannel = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`📋 TRANSFER | SIGN`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Oyuncu',      value: `<@${target.id}>\n\`${target.user.username}\``,  inline: true  },
                { name: '🏟️ Takım',      value: `**${managerTeam.name}**`,                        inline: true  },
                { name: '📌 Tip',         value: tip === 'menajer' ? '🧑‍💼 Menajer' : '⚽ Oyuncu', inline: true  },
                { name: '👮 İşlemi Yapan', value: `<@${exec.id}>\n\`${exec.user.username}\``,      inline: true  },
                { name: '📊 Kadro',       value: `\`${teamPlayers.length + 1}/${KADRO_LIMITI}\``,  inline: true  },
            )
            .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    },
};
