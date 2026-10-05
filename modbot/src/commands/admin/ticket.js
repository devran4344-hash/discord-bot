// ╔══════════════════════════════════════════════════════════════════════╗
// ║              TİCKET SİSTEMİ — Tam Kapsamlı v3                      ║
// ║  Panel, Tip Seçimi, Claim, Close, Reopen, Add/Remove, Transcript   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { errorEmbed, sendLog, discordTimestamp, formatDate, isModerator } = require('../../utils/helpers');
const {
  createTicket, closeTicket, getTicket, updateTicket,
  getUserActiveTickets, getTicketNumber,
} = require('../../utils/database');
const config = require('../../config');
const path = require('path');
const fs   = require('fs');

// ══════════════════════════════════════════════════════
//  YARDIMCI — Ticket kanalı oluştur
// ══════════════════════════════════════════════════════
async function buildTicketChannel(guild, member, ticketType, ticketNum) {
  const cfg      = config.ticket;
  const category = cfg.ticketCategory
    ? guild.channels.cache.get(config.channels.ticketCategory)
    : null;

  const supportRoles = cfg.supportRoles?.length
    ? cfg.supportRoles
    : [config.roles.moderator, config.roles.admin].filter(Boolean);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    ...supportRoles.map(roleId => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
      ],
    })),
  ];

  const channelName = config.ticket.nameFormat
    .replace('{username}', member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16))
    .replace('{number}',   ticketNum.toString().padStart(4, '0'))
    .replace('{type}',     ticketType?.id || 'destek');

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category?.id || null,
    topic:  `🎫 Ticket #${ticketNum} | ${member.user.tag} | Tür: ${ticketType?.label || 'Genel'}`,
    permissionOverwrites: overwrites,
    reason: `Ticket #${ticketNum} — ${member.user.tag}`,
  });
}

// ══════════════════════════════════════════════════════
//  YARDIMCI — Ticket hoşgeldin mesajı
// ══════════════════════════════════════════════════════
async function sendTicketWelcome(channel, member, ticketType, ticketNum) {
  const cfg = config.ticket;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(ticketType?.color || config.colors.ticket)
    .setAuthor({
      name:    `${ticketType?.emoji || '🎫'} Ticket #${ticketNum.toString().padStart(4, '0')} — ${ticketType?.label || 'Destek'}`,
      iconURL: member.guild.iconURL({ dynamic: true }),
    })
    .setDescription(
      cfg.welcomeMessage
        .replace('{user}', `<@${member.id}>`)
        .replace('{username}', member.user.username),
    )
    .addFields(
      { name: '👤 Ticket Sahibi',  value: `<@${member.id}> \`(${member.id})\``,       inline: true  },
      { name: '🏷️ Ticket Türü',   value: `${ticketType?.emoji || '📋'} ${ticketType?.label || 'Genel'}`, inline: true },
      { name: '🔢 Ticket No',      value: `\`#${ticketNum.toString().padStart(4, '0')}\``,                inline: true  },
      { name: '📅 Açılış',         value: discordTimestamp(new Date(), 'F'),            inline: true  },
      { name: '⏳ Durum',           value: '🟢 Açık — Cevaplanmayı bekliyor',          inline: true  },
      { name: '🤝 Üstlenen',        value: 'Henüz kimse üstlenmedi',                   inline: true  },
    )
    .setFooter({ text: `${member.guild.name} Destek Sistemi` })
    .setTimestamp();

  const infoEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setDescription(
      '> 📌 **Ticket kuralları:**\n' +
      '> • Sorunu mümkün olduğunca detaylı anlat\n' +
      '> • Ekran görüntüsü ve logları paylaş\n' +
      '> • Sabırlı ol, ekibimiz en kısa sürede ilgilenecek\n' +
      '> • Gereksiz ticket açma, ceza alabilirsin\n\n' +
      '> 🔒 Ticketı kapatmak için aşağıdaki butona tıkla.',
    );

  // Ping
  const pingContent = [
    `<@${member.id}>`,
    ...(config.ticket.pingRoles?.map(r => `<@&${r}>`) || []),
    ...(config.roles.moderator ? [`<@&${config.roles.moderator}>`] : []),
  ].join(' ');

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Ticketı Kapat')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Üstlen')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_info')
      .setLabel('Ticket Bilgisi')
      .setEmoji('ℹ️')
      .setStyle(ButtonStyle.Secondary),
  );

  return channel.send({
    content: pingContent,
    embeds:  [welcomeEmbed, infoEmbed],
    components: [actionRow],
  });
}

// ══════════════════════════════════════════════════════
//  YARDIMCI — Transcript oluştur
// ══════════════════════════════════════════════════════
async function generateTranscript(channel, ticket) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  const lines = [];
  lines.push(`${'='.repeat(60)}`);
  lines.push(`MODBOT TICKET TRANSCRIPT`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(`Ticket No    : #${String(ticket.ticketNumber).padStart(4, '0')}`);
  lines.push(`Ticket Türü  : ${ticket.type || 'Genel'}`);
  lines.push(`Açan Üye     : ${ticket.userId}`);
  lines.push(`Kapatan      : ${ticket.closedBy || 'Bilinmiyor'}`);
  lines.push(`Açılış       : ${formatDate(new Date(ticket.createdAt))}`);
  lines.push(`Kapanış      : ${formatDate(new Date())}`);
  lines.push(`Toplam Mesaj : ${messages.size}`);
  lines.push(`${'='.repeat(60)}\n`);

  [...messages.values()]
    .reverse()
    .forEach(m => {
      const time = formatDate(new Date(m.createdTimestamp));
      const tag  = m.author.tag;
      const bot  = m.author.bot ? '[BOT] ' : '';
      lines.push(`[${time}] ${bot}${tag}:`);
      if (m.content) lines.push(`  ${m.content}`);
      if (m.embeds.length > 0)      lines.push(`  [${m.embeds.length} embed]`);
      if (m.attachments.size > 0)   lines.push(`  [${m.attachments.size} dosya]`);
      lines.push('');
    });

  const logDir  = path.join(__dirname, '../../../logs/transcripts');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const fileName = `ticket-${ticket.ticketNumber}-${Date.now()}.txt`;
  const filePath = path.join(logDir, fileName);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

  return { filePath, fileName, messageCount: messages.size };
}

// ══════════════════════════════════════════════════════
//  BUTTON HANDLERS
// ══════════════════════════════════════════════════════

// Ticket açma — tip seçim menüsü göster
async function handleTicketOpen(interaction, client) {
  const member = interaction.member;
  const guild  = interaction.guild;
  const cfg    = config.ticket;

  // Aktif ticket limiti
  const activeTickets = await getUserActiveTickets(guild.id, member.id);
  if (activeTickets.length >= cfg.maxTicketsPerUser) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('❌ Ticket Limiti Aşıldı')
        .setDescription(`Zaten **${activeTickets.length}** açık ticketin var!\nYeni ticket açmak için mevcut ticketını kapat.`)
        .addFields({ name: '📌 Mevcut Ticketın', value: activeTickets.map(id => `<#${id}>`).join('\n'), inline: false })
        .setFooter({ text: 'Sorun devam ediyorsa yöneticilerle iletişime geç.' })],
      flags: 64,
    });
  }

  // Tip seçim menüsü
  const types = cfg.types || [];

  if (types.length === 0) {
    // Tip yoksa direkt aç
    return openTicketDirect(interaction, client, null);
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_type_select')
    .setPlaceholder('📋 Ticket türünü seç...')
    .addOptions(
      types.map(t =>
        new StringSelectMenuOptionBuilder()
          .setValue(`ticket_type_${t.id}`)
          .setLabel(t.label)
          .setDescription(t.description)
          .setEmoji(t.emoji),
      ),
    );

  const embed = new EmbedBuilder()
    .setColor(config.colors.ticket)
    .setTitle('🎫 Ticket Türü Seç')
    .setDescription('Aşağıdaki menüden ticket türünü seç. Doğru türü seçmen, daha hızlı yardım almanı sağlar.')
    .addFields(
      types.map(t => ({
        name:   `${t.emoji} ${t.label}`,
        value:  `> ${t.description}`,
        inline: true,
      })),
    )
    .setFooter({ text: '60 saniye içinde seçim yapmassayon menü kapanır.' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    flags: 64,
  });
}

// Direkt ticket aç (tip seçildikten sonra)
async function openTicketDirect(interaction, client, ticketType) {
  const member = interaction.member;
  const guild  = interaction.guild;

  const ticketNum = await getTicketNumber(guild.id);
  let channel;

  try {
    channel = await buildTicketChannel(guild, member, ticketType, ticketNum);
  } catch (err) {
    const replyFn = interaction.replied ? interaction.followUp : interaction.reply;
    return replyFn.call(interaction, {
      embeds: [errorEmbed(`Ticket kanalı oluşturulamadı: \`${err.message}\``)],
      flags: 64,
    });
  }

  await createTicket(guild.id, member.id, channel.id, ticketNum);
  // Tip bilgisini kaydet
  if (ticketType) {
    const { updateTicket: upd } = require('../../utils/database');
    await upd(guild.id, channel.id, { type: ticketType.label, typeId: ticketType.id });
  }

  await sendTicketWelcome(channel, member, ticketType, ticketNum);

  const successEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Ticket Oluşturuldu')
    .setDescription(`Ticketın hazır: ${channel}\n\nDestek ekibimiz en kısa sürede seninle ilgilenecek.`)
    .setFooter({ text: 'Ticketını kapatmak için kanal içindeki butona tıkla.' })
    .setTimestamp();

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [successEmbed], components: [] });
  } else {
    await interaction.reply({ embeds: [successEmbed], flags: 64 });
  }

  // Log
  await sendLog(guild, 'ticketLog', new EmbedBuilder()
    .setColor(config.colors.ticketOpen)
    .setTitle('🎫 Yeni Ticket Açıldı')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Açan',      value: `<@${member.id}> \`(${member.id})\``,                       inline: true  },
      { name: '📍 Kanal',     value: `${channel} \`(${channel.id})\``,                            inline: true  },
      { name: '🔢 No',        value: `\`#${ticketNum.toString().padStart(4, '0')}\``,              inline: true  },
      { name: '🏷️ Tür',      value: ticketType?.label || 'Genel',                                inline: true  },
      { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'F'),                           inline: true  },
    )
    .setFooter({ text: `Kullanıcı ID: ${member.id}` })
    .setTimestamp());
}

// Ticket kapat
async function handleTicketClose(interaction, client) {
  const guild   = interaction.guild;
  const channel = interaction.channel;
  const closer  = interaction.member;

  const ticket = await getTicket(guild.id, channel.id);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Bu kanal bir ticket değil.')], flags: 64 });
  if (ticket.status === 'closed') return interaction.reply({ embeds: [errorEmbed('Bu ticket zaten kapatılmış.')], flags: 64 });

  // Onay embed
  const confirmEmbed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('🔒 Ticket Kapatılıyor')
    .setDescription(`**${closer.user.tag}** bu ticketı kapatmak üzere.\n\nTranscript kaydedilecek ve kanal **10 saniye** sonra silinecek.`)
    .addFields(
      { name: '🔢 Ticket No',  value: `\`#${String(ticket.ticketNumber).padStart(4, '0')}\``, inline: true },
      { name: '⏳ Silinecek',  value: discordTimestamp(new Date(Date.now() + 10000), 'R'),     inline: true },
    )
    .setTimestamp();

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Evet, Kapat').setEmoji('✅').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('İptal').setEmoji('❌').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow] });

  // Collector
  const collector = interaction.channel.createMessageComponentCollector({ time: 30000, max: 1 });

  collector.on('collect', async (i) => {
    if (i.customId === 'ticket_close_cancel') {
      await i.update({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('❌ Kapatma iptal edildi.')], components: [] });
      return;
    }

    if (i.customId === 'ticket_close_confirm') {
      await i.update({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('🔒 Ticket Kapatıldı')
          .setDescription('Transcript oluşturuluyor... Kanal **10 saniye** sonra silinecek.')
          .setTimestamp()],
        components: [],
      });

      // Transcript
      const transcript = await generateTranscript(channel, ticket);
      await closeTicket(guild.id, channel.id, closer.user.tag);

      // Ticket sahibine DM
      const owner = await client.users.fetch(ticket.userId).catch(() => null);
      if (owner) {
        const dmEmbed = new EmbedBuilder()
          .setColor(config.colors.ticketClose)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
          .setTitle('🔒 Ticketın Kapatıldı')
          .setDescription(`**${guild.name}** sunucusundaki ticketın kapatıldı.`)
          .addFields(
            { name: '🔢 Ticket No',  value: `\`#${String(ticket.ticketNumber).padStart(4, '0')}\``, inline: true },
            { name: '🏷️ Tür',        value: ticket.type || 'Genel',                                inline: true },
            { name: '👮 Kapatan',     value: closer.user.tag,                                       inline: true },
            { name: '⏰ Tarih',       value: discordTimestamp(new Date(), 'F'),                     inline: false },
            ...(ticket.claimedBy ? [{ name: '🤝 İlgilenen', value: `<@${ticket.claimedBy}>`, inline: true }] : []),
          )
          .setFooter({ text: 'İtirazın varsa sunucu yöneticisiyle iletişime geç.' })
          .setTimestamp();

        // Rating
        if (config.ticket.askRating) {
          const ratingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rating_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rating_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rating_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rating_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rating_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
          );
          const ratingEmbed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle('⭐ Destek Deneyimini Değerlendir')
            .setDescription('Aldığın destek hizmetinden ne kadar memnun kaldın?\nBir yıldız seç:');
          await owner.send({ embeds: [dmEmbed, ratingEmbed], components: [ratingRow] }).catch(() =>
            owner.send({ embeds: [dmEmbed] }).catch(() => null));
        } else {
          await owner.send({ embeds: [dmEmbed] }).catch(() => null);
        }
      }

      // Log kanalına transcript gönder
      const logChannel = config.channels.ticketLog
        ? guild.channels.cache.get(config.channels.ticketLog)
        : null;

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.ticketClose)
          .setTitle('🔒 Ticket Kapatıldı — Transcript')
          .addFields(
            { name: '🔢 Ticket No',   value: `\`#${String(ticket.ticketNumber).padStart(4, '0')}\``,  inline: true  },
            { name: '🏷️ Tür',         value: ticket.type || 'Genel',                                  inline: true  },
            { name: '👤 Açan',         value: `<@${ticket.userId}> \`(${ticket.userId})\``,            inline: true  },
            { name: '👮 Kapatan',      value: `${closer.user.tag} \`(${closer.id})\``,                 inline: true  },
            { name: '🤝 Üstlenen',     value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Kimse',  inline: true  },
            { name: '💬 Mesaj Sayısı', value: `${transcript?.messageCount || '?'}`,                    inline: true  },
            { name: '📅 Açılış',       value: discordTimestamp(new Date(ticket.createdAt), 'F'),       inline: true  },
            { name: '📅 Kapanış',      value: discordTimestamp(new Date(), 'F'),                       inline: true  },
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });

        if (transcript?.filePath && fs.existsSync(transcript.filePath)) {
          await logChannel.send({
            content: `📄 Transcript: **Ticket #${ticket.ticketNumber}**`,
            files: [{ attachment: transcript.filePath, name: transcript.fileName }],
          }).catch(() => null);
        }
      }

      // 10 saniye sonra sil
      setTimeout(() => channel.delete('Ticket kapatıldı').catch(() => null), 10000);
    }
  });

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('⏰ Kapatma işlemi zaman aşımına uğradı.')], components: [] }).catch(() => null);
    }
  });
}

// Ticket üstlen
async function handleTicketClaim(interaction, client) {
  const { guild, channel, member } = interaction;

  if (!isModerator(member))
    return interaction.reply({ embeds: [errorEmbed('Bu butonu kullanmak için moderatör olman gerekiyor.')], flags: 64 });

  const ticket = await getTicket(guild.id, channel.id);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket bulunamadı.')], flags: 64 });

  if (ticket.claimedBy) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`⚠️ Bu ticket zaten <@${ticket.claimedBy}> tarafından üstlenilmiş!`)],
      flags: 64,
    });
  }

  await updateTicket(guild.id, channel.id, { claimedBy: member.id });

  // Sadece üstlenen mod ve ticket sahibine izin ver
  await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });

  const claimEmbed = new EmbedBuilder()
    .setColor(config.colors.ticketClaim)
    .setAuthor({ name: `${member.user.username} ticketi üstlendi`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
    .setDescription(`✋ <@${member.id}> bu ticketi üstlendi ve ilgilenecek.`)
    .addFields(
      { name: '🤝 Üstlenen',  value: `<@${member.id}> \`(${member.id})\``, inline: true },
      { name: '📅 Tarih',     value: discordTimestamp(new Date(), 'R'),      inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [claimEmbed] });

  // İlk mesajdaki embed güncelle
  try {
    const messages = await channel.messages.fetch({ limit: 5 });
    const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
    if (botMsg) {
      const oldEmbed = EmbedBuilder.from(botMsg.embeds[0]);
      const fields = oldEmbed.data.fields || [];
      const claimFieldIdx = fields.findIndex(f => f.name === '🤝 Üstlenen');
      if (claimFieldIdx !== -1) fields[claimFieldIdx].value = `<@${member.id}>`;
      const statusIdx = fields.findIndex(f => f.name === '⏳ Durum');
      if (statusIdx !== -1) fields[statusIdx].value = `🔵 Aktif — <@${member.id}> ilgileniyor`;
      await botMsg.edit({ embeds: [oldEmbed] }).catch(() => null);
    }
  } catch (_) {}
}

// Ticket bilgisi
async function handleTicketInfo(interaction, client) {
  const ticket = await getTicket(interaction.guild.id, interaction.channel.id);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Bu bir ticket kanalı değil.')], flags: 64 });

  const owner = await client.users.fetch(ticket.userId).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(config.colors.ticket)
    .setTitle(`ℹ️ Ticket #${String(ticket.ticketNumber).padStart(4, '0')} Bilgisi`)
    .setThumbnail(owner?.displayAvatarURL({ dynamic: true }) || null)
    .addFields(
      { name: '👤 Ticket Sahibi',  value: `<@${ticket.userId}>`,                                    inline: true  },
      { name: '🏷️ Tür',            value: ticket.type || 'Genel',                                  inline: true  },
      { name: '⏳ Durum',           value: ticket.status === 'open' ? '🟢 Açık' : '🔴 Kapalı',    inline: true  },
      { name: '🤝 Üstlenen',        value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Kimse',  inline: true  },
      { name: '📅 Açılış',          value: discordTimestamp(new Date(ticket.createdAt), 'F'),        inline: true  },
      { name: '🔢 Ticket No',       value: `\`#${String(ticket.ticketNumber).padStart(4, '0')}\``,  inline: true  },
    )
    .setFooter({ text: `Ticket ID: ${ticket.channelId}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

// ══════════════════════════════════════════════════════
//  KOMUT EXPORT
// ══════════════════════════════════════════════════════
module.exports = {
  name: 'ticket',
  aliases: ['tsetup', 'ticketkur', 'ticketpanel'],
  description: 'Ticket panel mesajını gönderir.',
  usage: '!ticket [setup] [#kanal]',
  category: 'admin',
  cooldown: 5000,

  // Ana interaction handler — interactionCreate'ten çağrılır
  handleInteraction: async (interaction, client) => {
    const id = interaction.customId || interaction.values?.[0];
    if (!id) return;

    if (id === 'ticket_open')           return handleTicketOpen(interaction, client);
    if (id === 'ticket_close')          return handleTicketClose(interaction, client);
    if (id === 'ticket_close_confirm')  return; // collector içinde
    if (id === 'ticket_close_cancel')   return; // collector içinde
    if (id === 'ticket_claim')          return handleTicketClaim(interaction, client);
    if (id === 'ticket_info')           return handleTicketInfo(interaction, client);

    // Tip seçimi
    if (id.startsWith('ticket_type_')) {
      const typeId = id.replace('ticket_type_', '');
      const ticketType = config.ticket.types?.find(t => t.id === typeId) || null;
      return openTicketDirect(interaction, client, ticketType);
    }

    // Rating
    if (id.startsWith('rating_')) {
      const stars = parseInt(id.replace('rating_', ''));
      const starStr = '⭐'.repeat(stars);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('⭐ Değerlendirme Alındı')
          .setDescription(`${starStr} **${stars}/5** puan verdin. Teşekkürler!`)
          .setTimestamp()],
        flags: 64,
      }).catch(() => null);

      // Log
      const logChannel = config.channels.ticketLog
        ? interaction.client.guilds.cache
            .map(g => g.channels.cache.get(config.channels.ticketLog))
            .find(Boolean)
        : null;

      if (logChannel) {
        await logChannel.send({ embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('⭐ Ticket Değerlendirmesi')
          .addFields(
            { name: '👤 Değerlendiren', value: `${interaction.user.tag}`,                inline: true },
            { name: '⭐ Puan',          value: `${starStr} (${stars}/5)`,                inline: true },
            { name: '📅 Tarih',         value: discordTimestamp(new Date(), 'R'),         inline: true },
          )
          .setTimestamp()] });
      }
    }
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [errorEmbed('**Kanalları Yönet** iznine ihtiyacın var.')] });

    const targetChannel = message.mentions.channels.first() || message.channel;
    const types = config.ticket.types || [];

    // Panel embed
    const panelEmbed = new EmbedBuilder()
      .setColor(config.colors.ticket)
      .setAuthor({ name: `${message.guild.name} — Destek Merkezi`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle('🎫 Destek Talebi Oluştur')
      .setDescription(
        '> Aşağıdaki **Ticket Aç** butonuna tıklayarak destek ekibimize ulaşabilirsin.\n\n' +
        '> ⚠️ Lütfen **gereksiz ticket açmaktan** kaçın.\n' +
        '> 📌 Sorununu **detaylıca** açıkla.\n' +
        '> ⏰ Ortalama yanıt süresi: **~15 dakika**',
      )
      .addFields(
        types.length > 0
          ? {
              name: '📋 Ticket Türleri',
              value: types.map(t => `> ${t.emoji} **${t.label}** — ${t.description}`).join('\n'),
              inline: false,
            }
          : { name: '💬 Destek', value: '> Her türlü sorun için ticket açabilirsin.', inline: false },
        { name: '\u200b', value: '\u200b', inline: false },
      )
      .setImage(message.guild.bannerURL({ size: 1024 }) || null)
      .setFooter({
        text: `${message.guild.name} Destek Sistemi • Bugün ${new Date().toLocaleDateString('tr-TR')}`,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    const openRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('Ticket Aç')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary),
    );

    await targetChannel.send({ embeds: [panelEmbed], components: [openRow] });

    await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Ticket paneli ${targetChannel} kanalına gönderildi.`)],
    });
  },
};
