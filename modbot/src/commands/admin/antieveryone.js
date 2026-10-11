// ╔═══════════════════════════════════════════════════════════════╗
// ║           ANTI-EVERYONE — Sessiz Silici                        ║
// ║   Hedef kişi @everyone atarsa mesaj sessizce silinir           ║
// ║   Uyarı yok • DM yok • Log yok • Ping yok                     ║
// ╚═══════════════════════════════════════════════════════════════╝
const { Events } = require('discord.js');

// ═══════════════════════════════════════════════════════════════
//  🎯 HEDEF KİŞİLER — Buraya ID'leri yaz
// ═══════════════════════════════════════════════════════════════
const TARGET_IDS = [
  '1028605905891233812',   // 👈 o adamın ID'si
];

// .env'den de eklenebilir: EVERYONE_TARGETS=111,222,333
const ENV_TARGETS = (process.env.EVERYONE_TARGETS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALL_TARGETS = new Set([...TARGET_IDS, ...ENV_TARGETS]);

// İçerikte @everyone yazsa bile silsin mi? (true = agresif)
const CHECK_TEXT = false;

// ═══════════════════════════════════════════════════════════════
//  ANA EVENT — SADECE SİLER, BAŞKA HİÇBİR ŞEY YAPMAZ
// ═══════════════════════════════════════════════════════════════
module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!ALL_TARGETS.has(message.author.id)) return;

    let hasEveryone = message.mentions.everyone;
    if (!hasEveryone && CHECK_TEXT) {
      hasEveryone =
        message.content.includes('@everyone') ||
        message.content.includes('@here');
    }
    if (!hasEveryone) return;

    // Sessizce sil — hata olsa bile hiçbir şey yapma
    await message.delete().catch(() => {});
  },
};
