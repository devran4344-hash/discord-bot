const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

// Korunacak ID'ler — bu kişilere karşı komut asla çalışmaz
const PROTECTED_IDS = [
  '1160564359727173792', // Sunucu sahibi / bot owner
];

module.exports = {
  name: 'sahtemesaj',
  aliases: ['fakemsg', 'sahte', 'taklit'],
  description: 'Webhook ile başka bir kullanıcının profili ve avatarıyla mesaj gönderir.',
  usage: '!sahtemesaj <@üye | ID> <mesaj>',
  category: 'utility',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('sahtemesaj')
    .setDescription('Webhook ile başka bir kullanıcının kılığında mesaj gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
    .addUserOption(o => o.setName('üye').setDescription('Taklit edilecek üye').setRequired(true))
    .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true)),

  async executeSlash(interaction, client) {
    const isOwner = PROTECTED_IDS.includes(interaction.user.id) || interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions.has(PermissionFlagsBits.ManageWebhooks);
    if (!isOwner && !isAdmin) return interaction.reply({ embeds: [errorEmbed('Bu komut için **Webhook Yönet** izni gerekli.')], flags: 64 });

    const targetUser = interaction.options.getUser('üye');
    const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });

    const targetIsProtected = PROTECTED_IDS.includes(target.id) || target.id === interaction.guild.ownerId || target.id === config.ownerID;
    if (targetIsProtected) return interaction.reply({ embeds: [errorEmbed('Bu kullanıcı taklit edilemez.')], flags: 64 });

    const text = interaction.options.getString('mesaj').trim();
    const displayName = target.nickname || target.user.displayName || target.user.username;
    const avatarURL = target.displayAvatarURL({ dynamic: true, size: 256 });

    await interaction.deferReply({ flags: 64 });

    let webhook = null, created = false;
    try {
      const existing = await interaction.channel.fetchWebhooks().catch(() => null);
      webhook = existing?.find(w => w.owner?.id === client.user.id);
      if (!webhook) {
        webhook = await interaction.channel.createWebhook({ name: 'ModBot', avatar: avatarURL, reason: `sahtemesaj — ${interaction.user.tag}` });
        created = true;
      }
      await webhook.send({ content: text, username: displayName, avatarURL, allowedMentions: { parse: [] } });
      await interaction.editReply({ content: `✅ Mesaj **${displayName}** olarak gönderildi.` });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Gönderilemedi: \`${err.message}\``)] });
    } finally {
      if (created && webhook) await webhook.delete().catch(() => null);
    }
  },

  async execute(message, args, client) {
    // ── Yetki: admin veya owner ──────────────────────────────────────
    const isOwner = PROTECTED_IDS.includes(message.author.id) ||
                    message.author.id === message.guild.ownerId;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                    message.member.permissions.has(PermissionFlagsBits.ManageWebhooks);

    if (!isOwner && !isAdmin) {
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için **Webhook Yönet** iznin gerekiyor.')] });
    }

    if (!args[0] || !args[1]) {
      return message.reply({ embeds: [errorEmbed('**Kullanım:** `!sahtemesaj <@üye | ID> <mesaj>`')] });
    }

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    // ── KORUMA: Korunan ID hedef alınırsa sessizce sil ───────────────
    const targetIsProtected =
      PROTECTED_IDS.includes(target.id) ||
      target.id === message.guild.ownerId ||
      target.id === config.ownerID;

    if (targetIsProtected) {
      // Ghost ping tracker'dan çıkar — uyarı çıkmasın
      if (client._ghostMap) client._ghostMap.delete(message.id);
      await message.delete().catch(() => null);
      return; // Sessizce dur, hiçbir şey gösterme
    }

    const text = args.slice(1).join(' ').trim();
    if (!text) return message.reply({ embeds: [errorEmbed('Mesaj boş olamaz!')] });

    const displayName = target.nickname || target.user.displayName || target.user.username;
    const avatarURL   = target.displayAvatarURL({ dynamic: true, size: 256 });

    // ── Komutu ghost ping uyarısı olmadan sil ────────────────────────
    // _ghostMap'ten çıkar → messageDelete event'i ghost ping uyarısı vermez
    if (client._ghostMap) client._ghostMap.delete(message.id);
    await message.delete().catch(() => null);

    let webhook = null;
    let created  = false;

    try {
      const existing = await message.channel.fetchWebhooks().catch(() => null);
      webhook = existing?.find(w => w.owner?.id === client.user.id);

      if (!webhook) {
        webhook = await message.channel.createWebhook({
          name:   'ModBot',
          avatar: avatarURL,
          reason: `sahtemesaj — ${message.author.tag}`,
        });
        created = true;
      }

      // Kullanıcının adı + avatarıyla gönder, mention parse etme
      await webhook.send({
        content:         text,
        username:        displayName,
        avatarURL:       avatarURL,
        allowedMentions: { parse: [] },
      });

    } catch (err) {
      const errMsg = await message.channel.send({
        embeds: [errorEmbed(`Gönderilemedi: \`${err.message}\``)],
      });
      setTimeout(() => errMsg.delete().catch(() => null), 5000);
    } finally {
      if (created && webhook) await webhook.delete().catch(() => null);
    }
  },
};
