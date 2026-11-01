'use strict';

const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const {
    getManagerTeam, getPlayerTeam, getTeamById,
    TRANSFER_LOG_CHANNEL, KADRO_LIMITI, UYE_ROLU,
} = require('../../utils/transferConfig');
const { getPlayer, signPlayer, getTeamPlayers, setPlayer } = require('../../utils/transferDB');

// Bekleyen sign teklifleri (userId → { interaction, managerTeam, tip, exec, targetId, timestamp })
const pendingOffers = new Map();

module.exports = {
    name: 'sign',
    data: new SlashCommandBuilder()
        .setName('sign')
        .setDescription('Takımına oyuncu veya menajer sign teklifi gönderir')
        .addUserOption(o => o
            .setName('oyuncu')
            .setDescription('Sign teklifi gönderilecek oyuncu')
            .setRequired(true)
        )
        .addStringOption(o => o
            .setName('tip')
            .setDescription('Normal oyuncu mu, menajer mi? (varsayılan: oyuncu)')
            .setRequired(false)
            .addChoices(
                { name: '⚽ Oyuncu',                    value: 'oyuncu'  },
                { name: '🧑‍💼 Menajer (Başkan Yardımcısı)', value: 'menajer' },
            )
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guild  = interaction.guild;
        const exec   = interaction.member;
        const target = await guild.members.fetch(interaction.options.getUser('oyuncu').id).catch(() => null);
        const tip    = interaction.options.getString('tip') || 'oyuncu';

        // ── Temel kontroller ──────────────────────────────────────────────────
        if (!target) {
            return interaction.editReply({ embeds: [errEmbed('Oyuncu Bulunamadı', 'Bu kullanıcı sunucuda bulunamadı.')] });
        }
        if (target.id === exec.id) {
            return interaction.editReply({ embeds: [errEmbed('Geçersiz İşlem', 'Kendini sign edemezsin.')] });
        }
        if (target.user.bot) {
            return interaction.editReply({ embeds: [errEmbed('Geçersiz İşlem', 'Botlar sign edilemez.')] });
        }

        // ── Başkan / BY kontrolü ──────────────────────────────────────────────
        const managerTeam = getManagerTeam(exec);
        if (!managerTeam) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Yetki Yetersiz',
                    'Bu komutu kullanmak için bir takımın **Başkanı** veya **Başkan Yardımcısı** olman gerekiyor.',
                )],
            });
        }

        // ── Hedef oyuncu başka takımda mı? ────────────────────────────────────
        const existingTeam = getPlayerTeam(target);
        if (existingTeam) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Oyuncu Başka Takımda',
                    `**${target.user.username}** zaten **${existingTeam.name}** takımında oynuyor.\n` +
                    `> Önce o takımdan release alınması gerekiyor.\n` +
                    `> *(Kural 5: Takımda en az 1 maç oynamadan sign olunamaz)*`,
                )],
            });
        }

        // ── Kural 5: Önceki takımında 1 maç oynadı mı? ───────────────────────
        const playerData = await getPlayer(guild.id, target.id);
        if (playerData && playerData.matchesPlayed === 0 && playerData.teamId) {
            const prevTeam = getTeamById(playerData.teamId);
            return interaction.editReply({
                embeds: [errEmbed(
                    'Kural 5 İhlali',
                    `**${target.user.username}** önceki takımı **${prevTeam?.name || '?'}**'nda henüz **1 maç** oynamadı.\n` +
                    `> Kural 5 gereği: En az 1 resmi maç oynamadan başka takıma sign olunamaz.\n` +
                    `> Oyuncunun \`/macoynadim\` komutuyla maç kaydetmesi gerekiyor.`,
                )],
            });
        }

        // ── Kadro limiti ──────────────────────────────────────────────────────
        const teamPlayers = await getTeamPlayers(guild.id, managerTeam.id);
        if (teamPlayers.length >= KADRO_LIMITI) {
            return interaction.editReply({
                embeds: [errEmbed(
                    'Kadro Limiti Dolu',
                    `**${managerTeam.name}** kadro limiti doldu (**${KADRO_LIMITI}/${KADRO_LIMITI}**).\n` +
                    `> Kural 2: Yeni oyuncu almadan önce birini **release** etmen gerekiyor.`,
                )],
            });
        }

        // ── Menajer kontrolü (Kural 3 & 4) ───────────────────────────────────
        if (tip === 'menajer') {
            const currentManagers = teamPlayers.filter(p => p.isMenager);
            const managerLimit    = teamPlayers.length >= Math.ceil(KADRO_LIMITI * 4 / 3) ? 3 : 2;
            if (currentManagers.length >= managerLimit) {
                return interaction.editReply({
                    embeds: [errEmbed(
                        'Menajer Limiti Dolu',
                        `**${managerTeam.name}** zaten **${currentManagers.length}** menajerine sahip (limit: ${managerLimit}).\n` +
                        `> Kural 4: Kadro 4/3'ünü kapsamıyorsa en fazla **2 menajer** olabilir.\n` +
                        `> Kadro şu an **${teamPlayers.length}/${KADRO_LIMITI}**`,
                    )],
                });
            }
        }

        // ── DM ile teklif gönder ──────────────────────────────────────────────
        const offerEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('⚽ Transfer Teklifi Aldın!')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
            .setDescription(
                `**${managerTeam.name}** takımı sana transfer teklifi gönderiyor!\n\n` +
                `> **Teklif Eden:** ${exec.user.username} (${managerTeam.name} Başkanı)\n` +
                `> **Takım:** **${managerTeam.name}**\n` +
                `> **Pozisyon:** ${tip === 'menajer' ? '🧑‍💼 Başkan Yardımcısı (Menajer)' : '⚽ Oyuncu'}\n` +
                `> **Kadro:** ${teamPlayers.length + 1}/${KADRO_LIMITI}\n\n` +
                `⏰ Bu teklif **2 dakika** içinde yanıtlanmazsa otomatik iptal olur.`
            )
            .addFields(
                { name: '📋 Transfer Kuralları', value: [
                    '> **K1:** Loan max 3 maç',
                    '> **K2:** Kadro dolu ise release zorunlu',
                    '> **K5:** Yeni takımda 1 maç oynamadan sign olunamazsın',
                ].join('\n'), inline: false },
            )
            .setFooter({ text: `${guild.name} Transfer Sistemi` })
            .setTimestamp();

        const dmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sign_accept_${target.id}`)
                .setLabel('✅ Teklifi Kabul Et')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`sign_reject_${target.id}`)
                .setLabel('❌ Reddet')
                .setStyle(ButtonStyle.Danger),
        );

        let dmMsg = null;
        try {
            const dmChannel = await target.user.createDM();
            dmMsg = await dmChannel.send({ embeds: [offerEmbed], components: [dmRow] });
        } catch {
            return interaction.editReply({
                embeds: [errEmbed(
                    'DM Gönderilemedi',
                    `**${target.user.username}** DM\'lerini kapalı tuttuğu için teklif gönderilemedi.\n` +
                    `> Oyuncudan DM\'lerini açmasını iste.`,
                )],
            });
        }

        // Teklifi kaydet
        pendingOffers.set(target.id, {
            guildId:     guild.id,
            managerTeam,
            tip,
            execId:      exec.id,
            targetId:    target.id,
            teamPlayers,
            interaction,
            dmMsg,
        });

        // ── DM collector ──────────────────────────────────────────────────────
        const filter    = i => i.user.id === target.id && (i.customId === `sign_accept_${target.id}` || i.customId === `sign_reject_${target.id}`);
        const collector = dmMsg.createMessageComponentCollector({ filter, time: 120_000, max: 1 });

        // Teklif gönderildi mesajı
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle('📨 Transfer Teklifi Gönderildi')
                .setDescription(
                    `**${target.user.username}**'a DM ile teklif gönderildi!\n\n` +
                    `> **Takım:** ${managerTeam.name}\n` +
                    `> **Pozisyon:** ${tip === 'menajer' ? '🧑‍💼 Menajer' : '⚽ Oyuncu'}\n\n` +
                    `⏰ Oyuncunun yanıtı bekleniyor... *(2 dakika)*`
                )
                .setTimestamp()],
        });

        collector.on('collect', async i => {
            const offer = pendingOffers.get(target.id);
            if (!offer) return;
            pendingOffers.delete(target.id);

            // Butonları kaldır
            await dmMsg.edit({ components: [] }).catch(() => {});

            // ── KABUL ────────────────────────────────────────────────────────
            if (i.customId === `sign_accept_${target.id}`) {
                // Tekrar kontrol et (2 dk içinde durum değişmiş olabilir)
                const freshTarget = await guild.members.fetch(target.id).catch(() => null);
                if (!freshTarget) {
                    await i.reply({ content: '❌ Artık sunucuda değilsin.' });
                    return;
                }

                try {
                    await freshTarget.roles.remove(UYE_ROLU).catch(() => {});
                    await freshTarget.roles.add(offer.managerTeam.playerRole);
                    if (offer.tip === 'menajer') await freshTarget.roles.add(offer.managerTeam.viceRole);
                } catch (e) {
                    await i.reply({ content: `❌ Rol verilemedi: ${e.message}` });
                    return;
                }

                await signPlayer(offer.guildId, target.id, offer.managerTeam.id);
                if (offer.tip === 'menajer') await setPlayer(offer.guildId, target.id, { isMenager: true });

                // DM'e başarı mesajı
                await i.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle('✅ Transfer Teklifi Kabul Edildi!')
                        .setDescription(
                            `**${offer.managerTeam.name}** takımına başarıyla katıldın!\n\n` +
                            `> **Pozisyon:** ${offer.tip === 'menajer' ? '🧑‍💼 Menajer' : '⚽ Oyuncu'}\n` +
                            `> **Kural 5:** Yeni takımında en az **1 maç** oynamadan başka takıma sign olamazsın!\n` +
                            `> Her maçtan sonra \`/macoynadim\` komutunu kullanmayı unutma.`
                        )
                        .setTimestamp()],
                });

                // Sunucuya bildir
                const execMember = await guild.members.fetch(offer.execId).catch(() => null);
                if (execMember) {
                    try {
                        await execMember.send({
                            embeds: [new EmbedBuilder()
                                .setColor(0x57f287)
                                .setTitle('✅ Transfer Teklifi Kabul Edildi!')
                                .setDescription(`**${target.user.username}** teklifini kabul etti ve **${offer.managerTeam.name}**'na katıldı!`)
                                .setTimestamp()],
                        });
                    } catch { /* DM kapalı */ }
                }

                // Transfer log
                const logCh = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
                if (logCh) {
                    await logCh.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('📋 TRANSFER | SIGN')
                            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
                            .setDescription(`**${target.user.username}** → **${offer.managerTeam.name}** transferi tamamlandı!`)
                            .addFields(
                                { name: '👤 Oyuncu',       value: `<@${target.id}>\n\`${target.user.username}\``,     inline: true },
                                { name: '🏟️ Takım',       value: `**${offer.managerTeam.name}**`,                    inline: true },
                                { name: '📌 Pozisyon',     value: offer.tip === 'menajer' ? '🧑‍💼 Menajer' : '⚽ Oyuncu', inline: true },
                                { name: '👮 Teklif Eden',  value: `<@${offer.execId}>`,                              inline: true },
                                { name: '📊 Kadro',        value: `\`${offer.teamPlayers.length + 1}/${KADRO_LIMITI}\``, inline: true },
                                { name: '✅ Durum',        value: '`Kabul Edildi`',                                    inline: true },
                            )
                            .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
                            .setTimestamp()],
                    }).catch(() => {});
                }
            }

            // ── RET ──────────────────────────────────────────────────────────
            else if (i.customId === `sign_reject_${target.id}`) {
                await i.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xed4245)
                        .setTitle('❌ Transfer Teklifi Reddedildi')
                        .setDescription(`**${offer.managerTeam.name}** takımının teklifini reddetttin.`)
                        .setTimestamp()],
                });

                // Teklif edene bildir
                const execMember = await guild.members.fetch(offer.execId).catch(() => null);
                if (execMember) {
                    try {
                        await execMember.send({
                            embeds: [new EmbedBuilder()
                                .setColor(0xed4245)
                                .setTitle('❌ Transfer Teklifi Reddedildi')
                                .setDescription(`**${target.user.username}**, **${offer.managerTeam.name}** takımının teklifini reddetti.`)
                                .setTimestamp()],
                        });
                    } catch { /* DM kapalı */ }
                }

                // Transfer log
                const logCh = guild.channels.cache.get(TRANSFER_LOG_CHANNEL);
                if (logCh) {
                    await logCh.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0xed4245)
                            .setTitle('📋 TRANSFER | SIGN REDDEDİLDİ')
                            .addFields(
                                { name: '👤 Oyuncu',       value: `<@${target.id}>`, inline: true },
                                { name: '🏟️ Takım',       value: offer.managerTeam.name, inline: true },
                                { name: '❌ Durum',        value: '`Reddedildi`',    inline: true },
                            )
                            .setFooter({ text: `Transfer Sistemi • ${new Date().toLocaleString('tr-TR')}` })
                            .setTimestamp()],
                    }).catch(() => {});
                }
            }
        });

        // Timeout
        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                pendingOffers.delete(target.id);
                await dmMsg.edit({
                    components: [],
                    embeds: [offerEmbed.setColor(0x808080).setFooter({ text: '⏰ Bu teklif zaman aşımına uğradı.' })],
                }).catch(() => {});

                // Teklif edene bildir
                try {
                    const execMember = await guild.members.fetch(exec.id).catch(() => null);
                    if (execMember) {
                        await execMember.send({
                            embeds: [new EmbedBuilder()
                                .setColor(0x808080)
                                .setTitle('⏰ Transfer Teklifi Zaman Aşımı')
                                .setDescription(`**${target.user.username}**'a gönderilen teklif **2 dakika** içinde yanıtlanmadı ve iptal edildi.`)
                                .setTimestamp()],
                        }).catch(() => {});
                    }
                } catch { /* ignore */ }
            }
        });
    },
};

// ── Hata embed yardımcısı ─────────────────────────────────────────────
function errEmbed(title, desc) {
    return new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`❌ ${title}`)
        .setDescription(desc)
        .setTimestamp();
}
