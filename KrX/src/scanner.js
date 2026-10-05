/**
 * KrX NSFW Guard v2 — Açılış Tarayıcısı
 * Bot kapalıyken atılan mesajları tarar.
 */
const db       = require('./database');
const detector = require('./detector');
const ceza     = require('./ceza');
const logger   = require('./logger');

async function acilisTara(client) {
  console.log('[KrX] 🔍 Açılış taraması başlıyor...');
  for (const [, guild] of client.guilds.cache) {
    try { await guildTara(client, guild); } catch(e) { console.warn(`[KrX] ${guild.name} taranamadı:`, e.message); }
  }
  console.log('[KrX] ✅ Açılış taraması tamamlandı.');
}

async function guildTara(client, guild) {
  const ayar = db.guildGetir(guild.id);
  if (!ayar.aktif) return;

  const botUye = guild.members.me;
  let taranan=0, silinen=0;

  for (const [, kanal] of guild.channels.cache) {
    if (!kanal.isTextBased() || kanal.isDMBased()) continue;
    if (!detector.kanalTaranmali(kanal, ayar)) continue;
    if (!kanal.permissionsFor(botUye)?.has('ReadMessageHistory')) continue;

    try {
      const mesajlar = await kanal.messages.fetch({ limit:50 });
      for (const [, m] of mesajlar) {
        if (m.author.bot) continue;
        if (!m.attachments.size && !m.embeds.length) continue;
        taranan++;

        const tespit = await detector.mesajiTara(m, ayar);
        if (!tespit) continue;

        let member = guild.members.cache.get(m.author.id);
        if (!member) { try { member = await guild.members.fetch(m.author.id); } catch(_){ continue; } }
        if (member.permissions.has('Administrator')) continue;
        if (guild.ownerId === member.id) continue;

        // Muaf rol kontrolü
        if (ayar.muaf_roller?.some(r => member.roles.cache.has(r))) continue;

        await ceza.ihlalIsle({ mesaj:m, guild, member, dosyaUrl:tespit.url, tespit });
        silinen++;
        await bekle(600);
      }
    } catch(_) {}
  }

  const logKanal = ayar.log_kanal_id ? guild.channels.cache.get(ayar.log_kanal_id) : null;
  if (logKanal && (taranan>0||silinen>0)) {
    await logger.logAcilisTarama({ logKanal, guild, taranan, silinen });
  }
}

function bekle(ms) { return new Promise(r=>setTimeout(r,ms)); }

module.exports = { acilisTara };
