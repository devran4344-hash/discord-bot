// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  MESAJ SIRALAMA KOMUTU                              ║
// ║  !siralama — Sunucuda en çok mesaj atan üyeler                     ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const config = require('../../config');

// ══════════════════════════════════════════════════════
//  Firestore'dan mesaj sayılarını çek
// ══════════════════════════════════════════════════════
async function getMesajSiralama(guildId, limit = 10) {
  let db;
  try {
    const admin = require('firebase-admin');
    db = admin.firestore();
  } catch { return []; }

  try {
    const snap = await db.collection('mesajsayac')
      .where('guildId', '==', guildId)
      .orderBy('count', 'desc')
      .limit(limit)
      .get();

    const results = [];
    snap.forEach(doc => {
      const d = doc.data();
      results.push({ userId: d.userId, count: d.count || 0 });
    });
    return results;
  } catch (err) {
    // Eğer index yoksa basit fetch yap
    try {
      const snap2 = await db.collection('mesajsayac')
        .where('guildId', '==', guildId)
        .get();
      const arr = [];
      snap2.forEach(doc => {
        const d = doc.data();
        arr.push({ userId: d.userId, count: d.count || 0 });
      });
      return arr.sort((a, b) => b.count - a.count).slice(0, limit);
    } catch { return []; }
  }
}

// ══════════════════════════════════════════════════════
//  Mesaj sayacını artır (messageCreate'ten çağrılır)
// ══════════════════════════════════════════════════════
async function mesajSayacArttir(guildId, userId) {
  let db;
  try {
    const admin = require('firebase-admin');
    db = admin.firestore();
  } catch { return; }

  const key = `${guildId}_${userId}`;
  try {
    const ref = db.collection('mesajsayac').doc(key);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.update({ count: (doc.data().count || 0) + 1, updatedAt: Date.now() });
    } else {
      await ref.set({ guildId, userId, count: 1, createdAt: Date.now(), updatedAt: Date.now() });
    }
  } catch { /* sessiz hata */ }
}

module.exports = {
  name:     'siralama',
  aliases:  ['leaderboard', 'lb', 'top', 'sıralama', 'lider'],
  category: 'info',
  usage:    '!siralama [limit]',
  cooldown: 15000,
  description: 'Sunucuda en çok mesaj atan üyeleri sıralar.',

  // Mesaj sayacını dışa aktar — messageCreate'ten kullanılır
  mesajSayacArttir,

  data: new SlashCommandBuilder()
    .setName('siralama')
    .setDescription('En çok mesaj atan üyeleri sıralar.')
    .addIntegerOption(o => o.setName('limit').setDescription('Gösterilecek üye sayısı (1-25)').setMinValue(1).setMaxValue(25).setRequired(false)),

  async executeSlash(interaction, client) {
    const limit = interaction.options.getInteger('limit') || 10;
    await interaction.deferReply();
    const liste = await getMesajSiralama(interaction.guild.id, limit);
    if (!liste.length) return interaction.editReply({ embeds: [errorEmbed('Henüz mesaj verisi yok.')] });
    await interaction.editReply({ embeds: [buildEmbed(interaction.guild, liste)] });
  },

  async execute(message, args, client) {
    const limit  = Math.min(parseInt(args[0]) || 10, 25);
    const loading = await message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('⏳ Sıralama yükleniyor...')] });
    const liste   = await getMesajSiralama(message.guild.id, limit);
    if (!liste.length) return loading.edit({ embeds: [errorEmbed('Henüz mesaj verisi yok. Üyeler mesaj atmaya başlayınca sıralama oluşur.')] });
    await loading.edit({ embeds: [buildEmbed(message.guild, liste)] });
  },
};

function buildEmbed(guild, liste) {
  const MADALYA = ['🥇', '🥈', '🥉'];

  const desc = liste.map((item, i) => {
    const madalya = MADALYA[i] || `\`${i + 1}.\``;
    const bar = buildBar(item.count, liste[0].count);
    return `${madalya} <@${item.userId}>\n${bar} **${item.count.toLocaleString('tr-TR')}** mesaj`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setColor(config.colors.gold || 0xF1C40F)
    .setAuthor({ name: `${guild.name} — Mesaj Sıralaması`, iconURL: guild.iconURL({ dynamic: true }) })
    .setDescription(desc)
    .setFooter({ text: `İlk ${liste.length} üye gösteriliyor` })
    .setTimestamp();
}

function buildBar(count, max, len = 8) {
  if (!max) return '░'.repeat(len);
  const filled = Math.round((count / max) * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}
