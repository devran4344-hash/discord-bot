const { EmbedBuilder } = require('discord.js');
const { sendLog, discordTimestamp } = require('../utils/helpers');
const config = require('../config');
const e      = require('../emojiConfig');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    const guild = member.guild;

    if (config.roles.autoRole) {
      const role = guild.roles.cache.get(config.roles.autoRole);
      if (role) await member.roles.add(role, 'Otomatik rol').catch(() => null);
    }
    if (member.user.bot && config.roles.botRole) {
      const botRole = guild.roles.cache.get(config.roles.botRole);
      if (botRole) await member.roles.add(botRole).catch(() => null);
    }

    // Hesap yaşı kontrolü
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
            { name: '👤 Kullanıcı',  value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true  },
            { name: '📅 Hesap Yaşı', value: `**${ageDays}** gün`,                                        inline: true  },
            { name: `${e.warning} Min Yaş`, value: `**${minDays}** gün`,                                 inline: true  },
          )
          .setTimestamp());
        return;
      }
    }

    // Üye log
    if (config.logging.memberJoin) {
      const age      = Date.now() - member.user.createdTimestamp;
      const ageDays  = Math.floor(age / 86400000);
      const isNew    = ageDays < 7;
      const logEmbed = new EmbedBuilder()
        .setColor(isNew ? config.colors.warning : config.colors.join)
        .setAuthor({ name: `${member.user.tag} — Sunucuya Katıldı`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '👤 Kullanıcı',     value: `<@${member.id}>\n\`${member.user.tag}\`\n\`${member.id}\``, inline: true  },
          { name: '📅 Hesap Açılışı', value: discordTimestamp(member.user.createdAt, 'R'),                  inline: true  },
          { name: `${e.member} Üye No`, value: `**${guild.memberCount}**`,                                inline: true  },
          { name: '⌚ Hesap Yaşı',     value: `\`${ageDays}\` gün`,                                        inline: true  },
          { name: '🤖 Bot',            value: member.user.bot ? `${e.yes} Evet` : `${e.no} Hayır`,        inline: true  },
          ...(isNew ? [{ name: `${e.warning} DİKKAT`, value: '> Hesap **7 günden yeni!** Potansiyel risk.', inline: false }] : []),
        )
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp();
      await sendLog(guild, 'memberLog', logEmbed);
    }

    // Hoşgeldin mesajı
    if (!config.welcome.enabled) return;
    const welcomeChannel = config.channels.welcomeChannel ? guild.channels.cache.get(config.channels.welcomeChannel) : null;
    if (!welcomeChannel) return;

    const age      = Date.now() - member.user.createdTimestamp;
    const ageDays  = Math.floor(age / 86400000);
    const total    = guild.memberCount;

    const welcomeEmbed = new EmbedBuilder()
      .setColor(config.welcome.embedColor || config.colors.join)
      .setAuthor({ name: `${guild.name} — Yeni Üye!`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle(`${e.welcome} Hoş Geldin, ${member.user.username}!`)
      .setDescription(
        config.welcome.message
          .replace('{user}',        `<@${member.id}>`)
          .replace('{username}',    member.user.username)
          .replace('{server}',      guild.name)
          .replace('{memberCount}', total.toString()),
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: '👤 Kullanıcı',    value: `<@${member.id}>`,              inline: true  },
        { name: '📅 Hesap Yaşı',   value: `\`${ageDays}\` gün`,           inline: true  },
        { name: `${e.member} Üye No`, value: `**${total}.** üye`,         inline: true  },
        { name: `${e.info} Kurallar`, value: config.channels.rules ? `<#${config.channels.rules}>` : 'Kuralları oku!', inline: true },
      )
      .setImage(guild.bannerURL({ size: 1024 }) || null)
      .setFooter({ text: `${guild.name} • ${total}. üye`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [welcomeEmbed] }).catch(() => null);

    if (config.welcome.sendDM) {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.welcome.embedColor || config.colors.join)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle(`${e.welcome} ${guild.name} Sunucusuna Hoş Geldin!`)
        .setDescription(config.welcome.dmMessage.replace('{user}', member.user.username).replace('{server}', guild.name))
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: `${e.member} Üye Sayısı`, value: `\`${total}\``, inline: true },
          { name: `${e.info} Kurallar`, value: config.channels.rules ? `[Kurallar kanalı](https://discord.com/channels/${guild.id}/${config.channels.rules})` : 'Kuralları oku!', inline: true },
        )
        .setTimestamp();
      await member.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    client.emit('raidCheck', member);

    // ─── Davet Tracker ─────────────────────────────────────────────
    if (config.inviteTracker?.enabled) {
      try {
        const { handleMemberJoin } = require('../systems/inviteTracker');
        const inviteResult = await handleMemberJoin(member);
        if (inviteResult && config.inviteTracker.logJoins && config.channels.memberLog) {
          const ch = guild.channels.cache.get(config.channels.memberLog);
          if (ch) {
            const { EmbedBuilder: EB } = require('discord.js');
            await ch.send({ embeds: [new EB()
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
