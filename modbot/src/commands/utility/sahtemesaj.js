const { PermissionFlagsBits } = require('discord.js');
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
