'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManagerTeam, getPlayerTeam, getTeamById, TRANSFER_LOG_CHANNEL, KADRO_LIMITI, TEAMS } = require('../../utils/transferConfig');
const { getPlayer, loanPlayer, getTeamPlayers } = require('../../utils/transferDB');

module.exports = {
    name: 'loan',
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Oyuncuyu başka bir takıma geçici olarak loan eder (max 3 maç)')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Loan edilecek oyuncu')
            .setRequired(true)
        )
        .addIntegerOption(o => o
            .setName('kac_mac')
            .setDescription('Kaç maç oynatılacak? (1-3)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3)
        )
        .addStringOption(o => {
            const opt = o
                .setName('hedef_takim')
                .setDescription('Hangi takıma loan gidecek?')
                .setRequired(true);
            for (const t of TEAMS) {
                opt.addChoices({ name: t.name, value: t.id });
            }
            return opt;
        }),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild      = interaction.guild;
        const exec       = interaction.member;
        const target     = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const kacMac     = interaction.options.getInteger('kac_mac');
        const hedefId    = interaction.options.getString('hedef_takim');

        if (!target) return interaction.editReply({ content: '❌ Oyuncu sunucuda bulunamadı.' });
        if (target.id === exec.id) return interaction.editReply({ content: '❌ Kendini loan edemezsin.' });

        // ── Kural 1: Maksimum 3 maç ──
        if (kacMac > 3) {
            return interaction.editReply({ content: '❌ Kural 1: Bir oyuncu en fazla **3 maç** loanlanabilir.' });
        }

        // ── Komutu kullanan kişinin takımını bul ──
        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({ content: '❌ Bu komutu kullanmak için bir takımın Başkanı veya Başkan Yardımcısı olman gerekiyor.' });
        }

        // ── Oyuncu bu takımda mı? ──
        const playerTeam = getPlayerTeam(target);
        if (!playerTeam || playerTeam.id !== managerTeam.id) {
            return interaction.editReply({ content: `❌ **${target.user.username}** senin takımında değil.` });
        }

        // ── Oyuncu zaten loanlanmış mı? ──
        const playerData = await getPlayer(guild.id, target.id);
        if (playerData?.isLoaned) {
            return interaction.editReply({ content: `❌ **${target.user.username}** zaten loan durumunda.` });
        }

        // ── Hedef takım kendisi mi? ──
        const hedefTeam = getTeamById(hedefId);
        if (!hedefTeam) return interaction.editReply({ content: '❌ Hedef takım bulunamadı.' });
        if (hedefTeam.id === managerTeam.id) {
            return interaction.editReply({ content: '❌ Kendi takımına loan edemezsin.' });
        }

        // ── Hedef takım limiti dolu mu? ──
        const hedefPlayers = await getTeamPlayers(guild.id, hedefTeam.id);
        if (hedefPlayers.length >= KADRO_LIMITI) {
            return interaction.editReply({
                content: `❌ **${hedefTeam.name}** kadro limiti dolu (${KADRO_LIMITI}/${KADRO_LIMITI}).`,
            });
        }

        // ── Rol işlemleri ──
        try {
            // Hedef takımın oyuncu rolünü ver (asıl rolü almıyoruz)
            await target.roles.add(hedefTeam.playerRole);
        } catch (e) {
            return interaction.editReply({ content: `❌ Rol verilemedi: \`${e.message}\`` });
        }

        // ── Firebase'e kaydet ──
        await loanPlayer(guild.id, target.id, managerTeam.id, hedefTeam.id, kacMac);

        // ── Onay yanıtı ──
        await interaction.editReply({
            content: `✅ **${target.user.username}** → **${hedefTeam.name}**'na **${kacMac} maç** için loan edildi.`,
        });

        // ── Transfer log embed ──
        const logChannel = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle('📋 TRANSFER | LOAN')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Oyuncu',        value: `<@${target.id}>\n\`${target.user.username}\``, inline: true  },
                { name: '🏠 Asıl Takım',    value: `**${managerTeam.name}**`,                      inline: true  },
                { name: '🏟️ Loan Takımı',  value: `**${hedefTeam.name}**`,                         inline: true  },
                { name: '⚽ Maç Sayısı',    value: `**${kacMac}** maç`,                             inline: true  },
                { name: '👮 İşlemi Yapan',  value: `<@${exec.id}>\n\`${exec.user.username}\``,     inline: true  },
            )
            .setFooter({ text: `Transfer Sistemi • Kural 1: Maks. 3 maç loan • ${new Date().toLocaleString('tr-TR')}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    },
};
