const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { discordTimestamp, formatNumber, progressBar } = require('../../utils/helpers');
const config = require('../../config');

const VERIFICATION = ['Hiçbiri','Düşük','Orta','Yüksek','En Yüksek'];
const BOOST_TIERS  = { 0:'Seviye 0',1:'Seviye 1',2:'Seviye 2',3:'Seviye 3 ✨' };

module.exports = {
  name: 'serverinfo',
  aliases: ['sunucubilgi','si','guild'],
  description: 'Sunucu hakkında detaylı bilgi gösterir.',
  usage: '!serverinfo',
  category: 'info',
  cooldown: 10000,

  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Sunucu hakkında detaylı bilgi gösterir.'),

  async executeSlash(interaction, client) {
    const g = interaction.guild;
    await g.members.fetch().catch(() => null);
    const bots   = g.members.cache.filter(m => m.user.bot).size;
    const humans = g.memberCount - bots;
    const embed  = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: g.name, iconURL: g.iconURL({ dynamic: true }) })
      .setThumbnail(g.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: '👥 Üyeler', value: `Toplam: \`${g.memberCount}\`\nİnsan: \`${humans}\`\nBot: \`${bots}\``, inline: true },
        { name: '📢 Kanallar', value: `Toplam: \`${g.channels.cache.size}\``, inline: true },
        { name: '🎭 Roller', value: `\`${g.roles.cache.size - 1}\``, inline: true },
        { name: '💎 Boost', value: `\`${g.premiumSubscriptionCount || 0}\` boost\nSeviye: ${BOOST_TIERS[g.premiumTier] || 'Seviye 0'}`, inline: true },
        { name: '🔒 Doğrulama', value: VERIFICATION[g.verificationLevel] || '—', inline: true },
        { name: '📅 Kuruluş', value: discordTimestamp(g.createdAt, 'R'), inline: true },
      ).setFooter({ text: `ID: ${g.id}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    const guild = message.guild;
    await guild.members.fetch().catch(() => null);

    const owner   = await guild.fetchOwner().catch(() => null);
    const bots    = guild.members.cache.filter(m => m.user.bot).size;
    const humans  = guild.memberCount - bots;
    const online  = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const idle    = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
    const dnd     = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
    const offline = guild.memberCount - online - idle - dnd;

    const textCh  = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceCh = guild.channels.cache.filter(c => c.type === 2).size;
    const catCh   = guild.channels.cache.filter(c => c.type === 4).size;
    const threads = guild.channels.cache.filter(c => [10,11,12].includes(c.type)).size;

    const boost       = guild.premiumSubscriptionCount || 0;
    const tier        = guild.premiumTier;
    const nextTier    = tier < 3 ? BOOST_NEEDED[tier + 1] : null;
    const boostBar    = nextTier ? progressBar(boost, nextTier, 10) : '██████████';

    const features = guild.features.map(f => {
      const map = {
        VERIFIED:'✅ Doğrulanmış',PARTNERED:'🤝 Partner',COMMUNITY:'🏘️ Topluluk',
        DISCOVERABLE:'🔍 Keşfedilebilir',ANIMATED_ICON:'🎆 Animasyonlu İkon',
        BANNER:'🖼️ Banner',INVITE_SPLASH:'💦 Davet Splash',VANITY_URL:'🔗 Özel URL',
        NEWS:'📰 Haber Kanalı',THREADS_ENABLED:'🧵 Alt Başlıklar',
        MEMBER_VERIFICATION_GATE_ENABLED:'🚪 Üye Doğrulama',
        WELCOME_SCREEN_ENABLED:'👋 Hoşgeldin Ekranı',
      };
      return map[f] || null;
    }).filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('🏠 Sunucu Bilgisi')
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: '📋 Genel',
          value: [
            `> 🏷️ **İsim:** ${guild.name}`,
            `> 🆔 **ID:** \`${guild.id}\``,
            `> 👑 **Sahibi:** ${owner ? `<@${owner.id}>` : 'Bilinmiyor'}`,
            `> 📅 **Oluşturuldu:** ${discordTimestamp(guild.createdAt, 'D')} *(${Math.floor((Date.now() - guild.createdTimestamp)/86400000)} gün önce)*`,
            `> 🌍 **Bölge:** Otomatik`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '👥 Üyeler',
          value: [
            `> **Toplam:** \`${formatNumber(guild.memberCount)}\``,
            `> 👤 **İnsan:** \`${formatNumber(humans)}\` | 🤖 **Bot:** \`${formatNumber(bots)}\``,
            `> 🟢 \`${online}\` 🟡 \`${idle}\` 🔴 \`${dnd}\` ⚫ \`${offline}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '📢 Kanallar',
          value: [
            `> 💬 **Metin:** \`${textCh}\``,
            `> 🔊 **Ses:** \`${voiceCh}\``,
            `> 📁 **Kategori:** \`${catCh}\``,
            `> 🧵 **Alt Başlık:** \`${threads}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '💎 Boost',
          value: [
            `> **Seviye:** ${BOOST_TIERS[tier] || 'Seviye 0'}`,
            `> **Boost:** \`${boost}\`${nextTier ? ` / \`${nextTier}\`` : ' (MAX)'}`,
            `> \`${boostBar}\` ${nextTier ? `${nextTier - boost} kaldı` : '🏆 MAX'}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛡️ Güvenlik',
          value: [
            `> **Doğrulama:** ${VERIFICATION[guild.verificationLevel] || 'Bilinmiyor'}`,
            `> **2FA:** ${guild.mfaLevel > 0 ? '✅ Zorunlu' : '❌ Kapalı'}`,
            `> **Roller:** \`${guild.roles.cache.size - 1}\``,
            `> **Emoji:** \`${guild.emojis.cache.size}\``,
          ].join('\n'),
          inline: true,
        },
        ...(features.length > 0 ? [{
          name: '✨ Özellikler',
          value: features.slice(0, 10).join(' • '),
          inline: false,
        }] : []),
      )
      .setImage(guild.bannerURL({ size: 1024 }) || null)
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
