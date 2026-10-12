// ╔══════════════════════════════════════════════════════════════════════╗
// ║     EVENT: guildMemberAdd — Giriş Banner + Kayıt Bildirimi         ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

// ══════════════════════════════════════════════════════
//  YARDIMCI: Güvenilirlik etiketi
// ══════════════════════════════════════════════════════
function guvenilirlik(member) {
  const gun = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  if (gun < 7)   return { label: '⚠️ Çok Yeni',   renk: 0xE74C3C, gun };
  if (gun < 30)  return { label: '⚠️ Yeni Hesap', renk: 0xF39C12, gun };
  if (gun < 180) return { label: '✅ Normal',      renk: 0x3498DB, gun };
  return              { label: '✅ Güvenilir',    renk: 0x2ECC71, gun };
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: Banner URL'si belirle
//  Öncelik: config > sunucu banner > null
// ══════════════════════════════════════════════════════
function getBannerUrl(guild, cfgUrl) {
  if (cfgUrl && cfgUrl.trim()) return cfgUrl.trim();
  const guildBanner = guild.bannerURL({ size: 1024, format: 'png' });
  if (guildBanner) return guildBanner;
  return null;
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    const guild = member.guild;

    // ── Kayıtsız rolü ver (sadece config'de tanımlıysa) ──────────
    // kayitsizRolId boşsa hiçbir şey yapma, üye @everyone ile devam eder
    if (config.kayit?.enabled && config.kayit?.kayitsizRolId && !member.user.bot) {
      const kayitsizRol = guild.roles.cache.get(config.kayit.kayitsizRolId);
      if (kayitsizRol) {
        await member.roles.add(kayitsizRol, 'Yeni üye — kayıtsız').catch(() => null);
      }
    }

    // ── Kayıt kanalına bildirim gönder ───────────────────────────
    if (config.kayit?.enabled && config.kayit?.kanalId && !member.user.bot) {
      const kayitKanal = guild.channels.cache.get(config.kayit.kanalId);
      if (kayitKanal) {
        const g   = guvenilirlik(member);

        const bildirimEmbed = new EmbedBuilder()
          .setColor(g.renk)
          .setAuthor({
            name:    `👋 Yeni Bir Kullanıcı Katıldı, ${member.user.username}!`,
            iconURL: guild.iconURL({ dynamic: true }),
          })
          .setDescription(
            `**${guild.name}** sunucusuna hoş geldin <@${member.id}>!\n` +
            `Seninle birlikte **${guild.memberCount}** kişiyiz. Kayıt olmak için yetkilileri bekle.`,
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: '🪪 Kullanıcı ID',           value: `\`${member.id}\``,                            inline: true },
            { name: '📅 Hesap Oluşturma Tarihi', value: discordTimestamp(member.user.createdAt, 'D'),   inline: true },
            { name: '🔒 Güvenilirlik Durumu',    value: `${g.label} \`(${g.gun} gün)\``,               inline: true },
          )
          .setFooter({ text: `${guild.name} Kayıt Sistemi` })
          .setTimestamp();

        const pingContent = [
          `<@${member.id}>`,
          ...(config.kayit.yetkiliRoller?.map(r => `<@&${r}>`) || []),
        ].join(' ');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`kayit_hizli_${member.id}`)
            .setLabel('Hızlı Kayıt')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`kayit_bilgi_${member.id}`)
            .setLabel('Kullanıcı Bilgisi')
            .setEmoji('ℹ️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`kayit_kayitsiz_${member.id}`)
            .setLabel('Kayıtsız Ver')
            .setEmoji('🚫')
            .setStyle(ButtonStyle.Danger),
        );

        await kayitKanal.send({ content: pingContent, embeds: [bildirimEmbed], components: [row] }).catch(() => null);
      }
    }

    // ── Bot rolü ─────────────────────────────────────────────────
    if (member.user.bot && config.roles.botRole) {
      const botRole = guild.roles.cache.get(config.roles.botRole);
      if (botRole) await member.roles.add(botRole).catch(() => null);
    }

    // ── Hesap yaşı / anti-raid kontrolü ─────────────────────────
    if (config.antiRaid.enabled && config.antiRaid.accountAge) {
      const age     = Date.now() - member.user.createdTimestamp;
      const ageDays = Math.floor(age / 86400000);
      const minDays = Math.floor(config.antiRaid.accountAge / 86400000);
      if (age < config.antiRaid.accountAge && config.antiRaid.accountAgeAction === 'kick') {
        await member.kick(`Hesap çok yeni: ${ageDays}g (min: ${minDays}g)`).catch(() => null);
        await sendLog(guild, 'automodLog', new EmbedBuilder()
          .setColor(config.colors.raid)
          .setAuthor({ name: 'Hesap Yaşı Engeli', iconURL: member.user.displayAvatarURL({ dynamic: true }) })
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setDescription(`${e.raid} **${member.user.tag}** hesabı çok yeni olduğu için atıldı.`)
          .addFields(
            { name: '👤 Kullanıcı',        value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true },
            { name: '📅 Hesap Yaşı',       value: `**${ageDays}** gün`,                                        inline: true },
            { name: `${e.warning} Min Yaş`, value: `**${minDays}** gün`,                                       inline: true },
          )
          .setTimestamp());
        return;
      }
    }

    // ── Üye log (memberLog kanalına) ─────────────────────────────
    if (config.logging.memberJoin) {
      const age     = Date.now() - member.user.createdTimestamp;
      const ageDays = Math.floor(age / 86400000);
      const isNew   = ageDays < 7;
      await sendLog(guild, 'memberLog', new EmbedBuilder()
        .setColor(isNew ? config.colors.warning : config.colors.join)
        .setAuthor({ name: `${member.user.tag} — Sunucuya Katıldı`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '👤 Kullanıcı',       value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true },
          { name: '📅 Hesap Açılışı',   value: discordTimestamp(member.user.createdAt, 'R'),                  inline: true },
          { name: `${e.member} Üye No`, value: `**${guild.memberCount}**`,                                   inline: true },
          { name: '⌚ Hesap Yaşı',      value: `\`${ageDays}\` gün`,                                         inline: true },
          { name: '🤖 Bot',             value: member.user.bot ? `${e.yes} Evet` : `${e.no} Hayır`,          inline: true },
          ...(isNew ? [{ name: `${e.warning} DİKKAT`, value: '> Hesap **7 günden yeni!** Potansiyel risk.', inline: false }] : []),
        )
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp());
    }

    // ════════════════════════════════════════════════════════════
    //  HOŞGELDİN BANNER MESAJI
    //  Resimlerdeki gibi: büyük arka plan + kullanıcı adı + avatar
    // ════════════════════════════════════════════════════════════
    if (!config.welcome.enabled) return;
    const welcomeChannel = config.channels.welcomeChannel
      ? guild.channels.cache.get(config.channels.welcomeChannel)
      : null;
    if (!welcomeChannel) return;

    const total      = guild.memberCount;
    const ageDays    = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
    const bannerUrl  = getBannerUrl(guild, config.welcome.bannerUrl);
    const altYazi    = (config.welcome.altYazi || 'Sunucuya Hoşgeldiniz')
      .replace('{user}',        member.user.username)
      .replace('{username}',    member.user.username)
      .replace('{server}',      guild.name)
      .replace('{memberCount}', total.toString());

    // ── Ana banner embed ─────────────────────────────────────────
    // setImage → büyük arka plan (resimlerdeki görünüm)
    // setThumbnail → sağ üstte avatar
    // description → isim + alt yazı (resimlerdeki ortadaki yazı)
    const bannerEmbed = new EmbedBuilder()
      .setColor(config.welcome.bannerColor || config.colors.join)
      .setAuthor({
        name:    `${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `## ${member.user.username}\n` +
        `### ${altYazi}`,
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({
        text:    `${guild.name} Kayıt Sistemi`,
        iconURL: guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    // Banner varsa büyük resim olarak ekle
    if (bannerUrl) bannerEmbed.setImage(bannerUrl);

    // ── Detay embed ──────────────────────────────────────────────
    // Fotoğrafların altındaki küçük bilgi kartı
    const detayEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .addFields(
        { name: '👤 Kullanıcı',      value: `<@${member.id}>`,                             inline: true },
        { name: '🪪 ID',             value: `\`${member.id}\``,                             inline: true },
        { name: `${e.member || '👥'} Üye No`, value: `**${total}**. üye`,                 inline: true },
        { name: '📅 Hesap Yaşı',     value: `\`${ageDays}\` gün`,                          inline: true },
        { name: '📌 Katılış',        value: discordTimestamp(new Date(), 'R'),              inline: true },
        { name: '🔒 Güvenilirlik',   value: guvenilirlik(member).label,                    inline: true },
        ...(config.channels.rules ? [{ name: `${e.info || 'ℹ️'} Kurallar`, value: `<#${config.channels.rules}>`, inline: true }] : []),
      );

    await welcomeChannel.send({
      content: `<@${member.id}>`,
      embeds:  [bannerEmbed, detayEmbed],
    }).catch(() => null);

    // ── DM ───────────────────────────────────────────────────────
    if (config.welcome.sendDM) {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.welcome.bannerColor || config.colors.join)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle(`👋 ${guild.name} Sunucusuna Hoş Geldin!`)
        .setDescription(
          config.welcome.dmMessage
            .replace('{user}',   member.user.username)
            .replace('{server}', guild.name),
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: `${e.member || '👥'} Üye Sayısı`, value: `\`${total}\``, inline: true },
          {
            name:  `${e.info || 'ℹ️'} Kurallar`,
            value: config.channels.rules
              ? `[Kurallar kanalı](https://discord.com/channels/${guild.id}/${config.channels.rules})`
              : 'Kuralları oku!',
            inline: true,
          },
        )
        .setTimestamp();
      await member.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    // ── Raid + davet tracker ─────────────────────────────────────
    client.emit('raidCheck', member);

    if (config.inviteTracker?.enabled) {
      try {
        const { handleMemberJoin } = require('../systems/inviteTracker');
        const inviteResult = await handleMemberJoin(member);
        if (inviteResult && config.inviteTracker.logJoins && config.channels.memberLog) {
          const ch = guild.channels.cache.get(config.channels.memberLog);
          if (ch) {
            await ch.send({ embeds: [new EmbedBuilder()
              .setColor(config.colors.info)
              .setDescription(
                `${e.inviteCreate || '📨'} **${member.user.tag}**, ` +
                `<@${inviteResult.inviter.id}> **\`(${inviteResult.inviter.tag})\`** tarafından davet edildi.\n` +
                `> 🔗 Kod: \`${inviteResult.code}\` · Toplam kullanım: \`${inviteResult.uses}\``,
              )
              .setTimestamp()] }).catch(() => null);
          }
        }
      } catch {}
    }
  },
};
