const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');
const e      = require('../../emojiConfig');

const reportCooldown = new Map();

module.exports = {
  name: 'report',
  aliases: ['şikayet', 'sikayet', 'ihbar'],
  description: 'Yetkililere hızlı şikayet gönderir.',
  usage: '!report <@üye | ID> <sebep>',
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Bir üyeyi yetkililere şikayet eder.')
    .addUserOption(o => o.setName('üye').setDescription('Şikayet edilecek üye').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Şikayet sebebi').setRequired(true)),

  async executeSlash(interaction, client) {
    const now  = Date.now();
    const last = reportCooldown.get(interaction.user.id) || 0;
    if (now - last < 5 * 60 * 1000) return interaction.reply({ embeds: [errorEmbed('5 dakikada bir şikayet gönderebilirsin.')], flags: 64 });
    reportCooldown.set(interaction.user.id, now);
    const target = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    const sebep  = interaction.options.getString('sebep');
    const repCh  = config.channels.reportChannel ? interaction.guild.channels.cache.get(config.channels.reportChannel) : null;
    if (!repCh)  return interaction.reply({ embeds: [errorEmbed('Şikayet kanalı ayarlanmamış.')], flags: 64 });
    const embed  = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🚨 Yeni Şikayet')
      .addFields(
        { name: '👤 Şikayet Eden', value: `<@${interaction.user.id}> \`${interaction.user.tag}\``, inline: true },
        { name: '🎯 Şikayet Edilen', value: `<@${target.id}> \`${target.user.tag}\``,              inline: true },
        { name: '📝 Sebep',         value: sebep,                                                  inline: false },
      ).setTimestamp();
    await repCh.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Şikayetin yetkililere iletildi.', flags: 64 });
  },
  cooldown: 10000,

  async execute(message, args, client) {
    // Cooldown: 5 dakika
    const lastReport = reportCooldown.get(message.author.id);
    if (lastReport && Date.now() - lastReport < 5 * 60 * 1000) {
      const remaining = Math.ceil((5 * 60 * 1000 - (Date.now() - lastReport)) / 1000);
      return message.reply({ embeds: [errorEmbed(`Şikayet için **${remaining}** saniye beklemen gerekiyor!`)] });
    }

    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Şikayet edeceğin kişiyi belirt.\n> **Kullanım:** `!report <@üye | ID> <sebep>`')] });
    }

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Kendini şikayet edemezsin!')] });
    if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Beni şikayet edemezsin!')] });

    const reason = args.slice(1).join(' ');
    if (!reason || reason.length < 5) {
      return message.reply({ embeds: [errorEmbed('Şikayet sebebini detaylıca yaz. (En az 5 karakter)')] });
    }

    // Rapor kanalı
    const reportChannelId = config.channels.reportChannel || config.channels.modLog;
    if (!reportChannelId) {
      return message.reply({ embeds: [errorEmbed('Şikayet kanalı ayarlanmamış. Yetkililere doğrudan ulaşın.')] });
    }

    const reportChannel = message.guild.channels.cache.get(reportChannelId);
    if (!reportChannel) {
      return message.reply({ embeds: [errorEmbed('Şikayet kanalı bulunamadı.')] });
    }

    // Rapor embed
    const reportEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({ name: '🚨 Yeni Şikayet', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(`${e.raid} Yeni bir şikayet alındı!`)
      .addFields(
        { name: '🎯 Şikayet Edilen', value: `<@${target.id}>\n\`${target.user.tag}\`\n\`${target.id}\``, inline: true  },
        { name: '📢 Şikayet Eden',   value: `<@${message.author.id}>\n\`${message.author.tag}\``,         inline: true  },
        { name: '\u200b',            value: '\u200b',                                                       inline: true  },
        { name: '📋 Sebep',          value: reason,                                                        inline: false },
        { name: '📍 Kanal',          value: `${message.channel}`,                                         inline: true  },
        { name: '📅 Tarih',          value: discordTimestamp(new Date(), 'F'),                             inline: true  },
        { name: '🔗 Mesaja Git',     value: `[Şikayet Kanalı](${message.url})`,                           inline: true  },
      )
      .setFooter({ text: `Şikayet ID: ${Date.now().toString(36).toUpperCase()}` })
      .setTimestamp();

    // Aksiyonlar için buton
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`report_handle_${target.id}_${message.author.id}`).setLabel('İşleme Al').setEmoji('⚡').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`report_dismiss_${message.author.id}`).setLabel('Reddet').setEmoji('❌').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`report_viewprofile_${target.id}`).setLabel('Profil Bak').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    );

    // Ping (destek rolleri + moderatör)
    const pingRoles = [config.roles.moderator, config.roles.admin].filter(Boolean).map(r => `<@&${r}>`);

    await reportChannel.send({
      content: pingRoles.length ? pingRoles.join(' ') : undefined,
      embeds: [reportEmbed],
      components: [row],
    });

    // Kullanıcıya onay
    const confirmEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${e.success} Şikayetin İletildi`)
      .setDescription('Şikayetin yetkililere iletildi. En kısa sürede incelenecek.')
      .addFields(
        { name: '🎯 Şikayet Edilen', value: `${target.user.tag}`, inline: true },
        { name: '📋 Sebep',          value: reason.slice(0, 100), inline: true },
      )
      .setFooter({ text: 'Gereksiz şikayet açmak ceza gerektirebilir.' })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });

    // Cooldown kaydet
    reportCooldown.set(message.author.id, Date.now());
    setTimeout(() => reportCooldown.delete(message.author.id), 5 * 60 * 1000);

    // Orijinal mesajı sil (şikayet kanalını kirletmesin)
    setTimeout(() => message.delete().catch(() => null), 5000);
  },
};
