const { EmbedBuilder } = require('discord.js');
const { findMember, errorEmbed, discordTimestamp, formatNumber } = require('../../utils/helpers');
const { getWarnings, getModHistory } = require('../../utils/database');
const config = require('../../config');

const STATUS = {
  online:  { e: '🟢', t: 'Çevrimiçi' },
  idle:    { e: '🟡', t: 'Boşta'     },
  dnd:     { e: '🔴', t: 'Rahatsız Etme' },
  offline: { e: '⚫', t: 'Çevrimdışı' },
};

module.exports = {
  name: 'userinfo',
  aliases: ['kullanıcıbilgi', 'ui', 'whois'],
  description: 'Kullanıcı hakkında detaylı bilgi gösterir.',
  usage: '!userinfo [@üye | ID]',
  category: 'info',
  cooldown: 5000,

  async execute(message, args, client) {
    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const user     = target.user;
    const member   = target;
    const status   = member.presence?.status || 'offline';
    const activity = member.presence?.activities?.[0];
    const warnings = await getWarnings(message.guild.id, user.id);
    const history  = await getModHistory(message.guild.id, user.id);

    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position);

    const accountAgeDays = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
    const joinAgeDays    = member.joinedAt
      ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)
      : null;

    // Rozet tespiti
    const flags   = user.flags?.toArray() || [];
    const badges  = [];
    const badgeMap = {
      Staff:                   '👨‍💼 Discord Çalışanı',
      Partner:                 '🤝 Partner',
      Hypesquad:               '🏠 HypeSquad Etkinlik',
      BugHunterLevel1:         '🐛 Bug Avcısı I',
      BugHunterLevel2:         '🐛 Bug Avcısı II',
      HypeSquadOnlineHouse1:   '🏠 Bravery',
      HypeSquadOnlineHouse2:   '🏠 Brilliance',
      HypeSquadOnlineHouse3:   '🏠 Balance',
      PremiumEarlySupporter:   '💎 Erken Destekçi',
      VerifiedDeveloper:       '👨‍💻 Doğrulanmış Geliştirici',
      ActiveDeveloper:         '🔧 Aktif Geliştirici',
      VerifiedBot:             '✅ Doğrulanmış Bot',
    };
    flags.forEach(f => badgeMap[f] && badges.push(badgeMap[f]));
    if (member.premiumSince) badges.push('💎 Server Booster');
    if (user.bot)             badges.push('🤖 Bot');

    // Aktivite
    let activityStr = 'Yok';
    if (activity) {
      const types = ['🎮', '📡', '🎵', '📺', '🔴', '🏆'];
      activityStr = `${types[activity.type] || '▶️'} **${activity.name}**`;
    }

    // Mod skoru
    const warnCount    = warnings.length;
    const maxWarn      = Math.max(...Object.keys(config.warnings.thresholds).map(Number));
    const barFilled    = Math.min(Math.round((warnCount / maxWarn) * 10), 10);
    const bar          = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);
    const barClr       = warnCount === 0 ? '🟢' : warnCount < 4 ? '🟡' : warnCount < 7 ? '🟠' : '🔴';

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor === '#000000' ? config.colors.primary : (member.displayColor || config.colors.primary))
      .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`👤 ${member.nickname || user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: '📋 Genel Bilgi',
          value: [
            `> 🏷️ **Tag:** \`${user.tag}\``,
            `> 🆔 **ID:** \`${user.id}\``,
            `> ${STATUS[status]?.e || '⚫'} **Durum:** ${STATUS[status]?.t || 'Bilinmiyor'}`,
            `> 🎮 **Aktivite:** ${activityStr}`,
            `> 🤖 **Bot:** ${user.bot ? 'Evet' : 'Hayır'}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📅 Tarihler',
          value: [
            `> 📆 **Hesap Açılış:** ${discordTimestamp(user.createdAt, 'D')} *(${accountAgeDays} gün önce)*`,
            `> 📥 **Sunucuya Katılış:** ${member.joinedAt ? discordTimestamp(member.joinedAt, 'D') : 'Bilinmiyor'} ${joinAgeDays !== null ? `*(${joinAgeDays} gün önce)*` : ''}`,
            ...(member.premiumSince ? [`> 💎 **Boost Başlangıcı:** ${discordTimestamp(member.premiumSince, 'D')}`] : []),
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚠️ Moderasyon',
          value: [
            `> ${barClr} \`${bar}\` **${warnCount}/${maxWarn}** uyarı`,
            `> 📋 **Toplam İşlem:** ${history.length}`,
            `> ⚡ **Son İşlem:** ${history.length > 0 ? history[history.length-1].type.toUpperCase() : 'Yok'}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '👑 Sunucu',
          value: [
            `> 🎭 **En Yüksek Rol:** ${member.roles.highest}`,
            `> 🎪 **Rol Sayısı:** ${roles.size}`,
            `> 👑 **Sunucu Sahibi:** ${message.guild.ownerId === user.id ? 'Evet ✅' : 'Hayır'}`,
          ].join('\n'),
          inline: true,
        },
        ...(roles.size > 0 ? [{
          name: `🎭 Roller (${roles.size})`,
          value: [...roles.values()].slice(0, 15).map(r => `${r}`).join(' ') || 'Yok',
          inline: false,
        }] : []),
        ...(badges.length > 0 ? [{
          name: '🏅 Rozetler',
          value: badges.join(' • '),
          inline: false,
        }] : []),
      )
      .setFooter({ text: `ID: ${user.id} • ${message.guild.name}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
