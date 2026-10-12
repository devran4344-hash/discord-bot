// ╔══════════════════════════════════════════════════════════════════════╗
// ║              KAYIT İSTATİSTİK KOMUTU                               ║
// ║  !kayitistatistik — Bugün/bu hafta/toplam kayıt sayıları           ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, discordTimestamp, isModerator } = require('../../utils/helpers');
const config = require('../../config');

// Firestore'dan kayıt verilerini çek
async function getKayitStats(guildId) {
  let db;
  try {
    const admin = require('firebase-admin');
    db = admin.firestore();
  } catch { return null; }

  try {
    const snap = await db.collection('kayitlar')
      .where('guildId', '==', guildId)
      .where('kayitsiz', '==', false)
      .get();

    const now     = Date.now();
    const bugun   = now - 24 * 60 * 60 * 1000;
    const haftaOncesi = now - 7 * 24 * 60 * 60 * 1000;

    let toplamKayit = 0, bugunKayit = 0, haftaKayit = 0;
    const kayitYapanlar = {};

    snap.forEach(doc => {
      const d = doc.data()?.value || doc.data();
      if (!d || d.kayitsiz) return;
      if (!d.kayitAt) return;

      toplamKayit++;
      if (d.kayitAt > bugun)       bugunKayit++;
      if (d.kayitAt > haftaOncesi) haftaKayit++;

      if (d.kaydedenId) {
        kayitYapanlar[d.kaydedenId] = (kayitYapanlar[d.kaydedenId] || 0) + 1;
      }
    });

    // En çok kayıt yapan 5 yetkili
    const topYetkililer = Object.entries(kayitYapanlar)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { toplamKayit, bugunKayit, haftaKayit, topYetkililer };
  } catch (err) {
    console.error('[kayitistatistik]', err.message);
    return null;
  }
}

module.exports = {
  name:     'kayitistatistik',
  aliases:  ['kayitstat', 'kayit-istatistik', 'kayitstats'],
  category: 'admin',
  usage:    '!kayitistatistik',
  cooldown: 10000,
  description: 'Kayıt sisteminin istatistiklerini gösterir.',

  data: new SlashCommandBuilder()
    .setName('kayitistatistik')
    .setDescription('Kayıt sisteminin istatistiklerini gösterir.'),

  async executeSlash(interaction, client) {
    if (!isModerator(interaction.member))
      return interaction.reply({ embeds: [errorEmbed('Moderatör rolü gerekli.')], flags: 64 });
    await interaction.deferReply();
    const stats = await getKayitStats(interaction.guild.id);
    await interaction.editReply({ embeds: [buildEmbed(interaction.guild, client, stats)] });
  },

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için moderatör olman gerekiyor.')] });

    const loading = await message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('⏳ İstatistikler yükleniyor...')] });
    const stats   = await getKayitStats(message.guild.id);
    await loading.edit({ embeds: [buildEmbed(message.guild, client, stats)] });
  },
};

function buildEmbed(guild, client, stats) {
  if (!stats) {
    return new EmbedBuilder()
      .setColor(config.colors.error)
      .setDescription('❌ İstatistikler yüklenemedi. Firebase bağlantısını kontrol et.');
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: `${guild.name} — Kayıt İstatistikleri`, iconURL: guild.iconURL({ dynamic: true }) })
    .setDescription('📊 Sunucunun kayıt sistemi özeti:')
    .addFields(
      { name: '📅 Bugün',     value: `\`${stats.bugunKayit}\` kayıt`,  inline: true },
      { name: '📆 Bu Hafta',  value: `\`${stats.haftaKayit}\` kayıt`,  inline: true },
      { name: '🏆 Toplam',    value: `\`${stats.toplamKayit}\` kayıt`, inline: true },
    )
    .setTimestamp();

  if (stats.topYetkililer.length > 0) {
    embed.addFields({
      name: '🛡️ En Çok Kayıt Yapan Yetkililer',
      value: stats.topYetkililer.map(([uid, sayi], i) =>
        `**${i+1}.** <@${uid}> — \`${sayi}\` kayıt`
      ).join('\n'),
      inline: false,
    });
  }

  embed.setFooter({ text: `${guild.name} Kayıt Sistemi` });
  return embed;
}
