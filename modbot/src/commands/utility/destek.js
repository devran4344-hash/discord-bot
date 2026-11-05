'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  /destek — Kullanıcıdan bot sahibine mesaj iletme                  ║
// ║  1 saat cooldown, DM üzerinden çift yönlü iletişim                ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

// ── Config ────────────────────────────────────────────────────────────
// Bot sahibinin Discord ID'si — mesajlar buraya gidecek
const BOT_OWNER_ID = process.env.OWNER_ID || '1160564359727173792';

// Cooldown: 1 saat (ms)
const COOLDOWN_MS = 60 * 60 * 1000;

// Aktif cooldown'lar: userId → timestamp
const cooldowns = new Map();

// Açık destek konuşmaları: userId → { guild, user, lastMsgId }
const activeChats = new Map();

module.exports = {
    name: 'destek',

    data: new SlashCommandBuilder()
        .setName('destek')
        .setDescription('Bot hakkında bir sorun, hata veya öneri bildirmek için kullan (1 saatte 1 kez)')
        .addStringOption(o => o
            .setName('konu')
            .setDescription('Konu başlığı')
            .setRequired(true)
            .addChoices(
                { name: '🐛 Hata Bildirimi',   value: 'hata'    },
                { name: '💡 Öneri',             value: 'oneri'   },
                { name: '❓ Soru',              value: 'soru'    },
                { name: '⚠️ Eksik Özellik',    value: 'eksik'   },
                { name: '📋 Genel Bildirim',   value: 'genel'   },
            )
        )
        .addStringOption(o => o
            .setName('mesaj')
            .setDescription('Mesajın (ne yaşadığını detaylıca anlat)')
            .setRequired(true)
            .setMaxLength(1000)
        ),

    async execute(interaction, client) {
        const userId  = interaction.user.id;
        const konu    = interaction.options.getString('konu');
        const mesaj   = interaction.options.getString('mesaj');

        // ── Cooldown kontrolü ──────────────────────────────────────────
        const lastUsed = cooldowns.get(userId);
        if (lastUsed) {
            const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
            if (remaining > 0) {
                const mins = Math.ceil(remaining / 60000);
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xfee75c)
                        .setTitle('⏰ Cooldown')
                        .setDescription(`Bu komutu **${mins} dakika** sonra tekrar kullanabilirsin.`)
                        .setTimestamp()],
                    flags: 64,
                });
            }
        }

        await interaction.deferReply({ flags: 64 });

        const konuLabels = {
            hata:  '🐛 Hata Bildirimi',
            oneri: '💡 Öneri',
            soru:  '❓ Soru',
            eksik: '⚠️ Eksik Özellik',
            genel: '📋 Genel Bildirim',
        };

        // ── Bot sahibine DM gönder ─────────────────────────────────────
        let ownerMsg = null;
        try {
            const owner = await client.users.fetch(BOT_OWNER_ID);
            const ownerEmbed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(`📬 Yeni Destek Mesajı — ${konuLabels[konu]}`)
                .setDescription(`> ${mesaj}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 Kullanıcı',  value: `${interaction.user.tag}\n\`${userId}\``,                          inline: true },
                    { name: '🏠 Sunucu',     value: `${interaction.guild.name}\n\`${interaction.guild.id}\``,           inline: true },
                    { name: '📅 Tarih',      value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                          inline: true },
                    { name: '📊 Sunucu Üye', value: `${interaction.guild.memberCount} kişi`,                           inline: true },
                )
                .setFooter({ text: `Yanıtlamak için: /yanitla ${userId} <mesaj> veya aşağıdaki butona bas` })
                .setTimestamp();

            const replyBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`destek_yanit_${userId}`)
                    .setLabel('💬 Yanıtla')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`destek_kapat_${userId}`)
                    .setLabel('🔒 Kapat')
                    .setStyle(ButtonStyle.Danger),
            );

            ownerMsg = await owner.send({ embeds: [ownerEmbed], components: [replyBtn] });

            // Aktif konuşmayı kaydet
            activeChats.set(userId, {
                guildId:   interaction.guild.id,
                guildName: interaction.guild.name,
                userId,
                userTag:   interaction.user.tag,
                ownerMsgId: ownerMsg.id,
                konu,
            });

        } catch (err) {
            console.error('[destek] Bot sahibine DM gönderilemedi:', err.message);
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle('❌ Mesaj Gönderilemedi')
                    .setDescription('Bot sahibine ulaşılamadı. Lütfen daha sonra tekrar dene.')
                    .setTimestamp()],
            });
        }

        // ── Cooldown kaydet ────────────────────────────────────────────
        cooldowns.set(userId, Date.now());
        setTimeout(() => cooldowns.delete(userId), COOLDOWN_MS);

        // ── Kullanıcıya onay ───────────────────────────────────────────
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('✅ Mesajın İletildi!')
                .setDescription(
                    `Mesajın bot sahibine iletildi.\n\n` +
                    `> 📋 **Konu:** ${konuLabels[konu]}\n` +
                    `> 💬 **Mesaj:** ${mesaj.length > 100 ? mesaj.slice(0, 100) + '...' : mesaj}\n\n` +
                    `Yanıt gelirse sana DM olarak iletilecek.\n` +
                    `Bu komutu **1 saat** sonra tekrar kullanabilirsin.`
                )
                .setTimestamp()],
        });
    },

    // ── Bot Sahibi Yanıt Butonu Handler ───────────────────────────────
    async handleOwnerButton(interaction, client) {
        const id = interaction.customId;

        // Yanıtla butonu
        if (id.startsWith('destek_yanit_')) {
            const targetUserId = id.replace('destek_yanit_', '');
            const chat = activeChats.get(targetUserId);

            const modal = new ModalBuilder()
                .setCustomId(`destek_yanit_modal_${targetUserId}`)
                .setTitle('💬 Kullanıcıya Yanıt Gönder');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('yanit_mesaj')
                        .setLabel(chat ? `${chat.userTag} — ${chat.guildName}` : 'Kullanıcıya yanıt')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Yanıtını buraya yaz...')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
            );

            return interaction.showModal(modal);
        }

        // Kapat butonu
        if (id.startsWith('destek_kapat_')) {
            const targetUserId = id.replace('destek_kapat_', '');
            activeChats.delete(targetUserId);

            await interaction.update({
                embeds: [interaction.message.embeds[0], new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription('🔒 Bu destek konuşması kapatıldı.')
                    .setTimestamp()],
                components: [],
            });
        }
    },

    // ── Bot Sahibi Yanıt Modal Handler ────────────────────────────────
    async handleOwnerModal(interaction, client) {
        const id = interaction.customId;

        if (!id.startsWith('destek_yanit_modal_')) return;

        const targetUserId = id.replace('destek_yanit_modal_', '');
        const yanit        = interaction.fields.getTextInputValue('yanit_mesaj');
        const chat         = activeChats.get(targetUserId);

        try {
            const targetUser = await client.users.fetch(targetUserId);

            const yanıtEmbed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('📬 Bot Sahibinden Yanıt Aldın!')
                .setDescription(`> ${yanit}`)
                .addFields(
                    { name: '📋 Konu', value: chat ? `${konuLabels[chat.konu] || chat.konu}` : 'Bilinmiyor', inline: true },
                    { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                )
                .setFooter({ text: 'BlackNetwork Bot Destek Sistemi' })
                .setTimestamp();

            await targetUser.send({ embeds: [yanıtEmbed] });

            await interaction.reply({
                content: `✅ **${targetUser.tag}** kullanıcısına yanıt gönderildi.`,
                flags: 64,
            });

            // Owner mesajını güncelle
            await interaction.message.edit({
                embeds: [
                    interaction.message.embeds[0],
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle('✅ Yanıt Gönderildi')
                        .setDescription(`> ${yanit}`)
                        .setTimestamp(),
                ],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`destek_kapat_${targetUserId}`)
                        .setLabel('🔒 Kapat')
                        .setStyle(ButtonStyle.Danger),
                )],
            }).catch(() => {});

        } catch (err) {
            await interaction.reply({
                content: `❌ Kullanıcıya DM gönderilemedi: \`${err.message}\``,
                flags: 64,
            });
        }
    },
};

const konuLabels = {
    hata:  '🐛 Hata Bildirimi',
    oneri: '💡 Öneri',
    soru:  '❓ Soru',
    eksik: '⚠️ Eksik Özellik',
    genel: '📋 Genel Bildirim',
};
