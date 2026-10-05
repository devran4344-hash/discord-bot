/**
 * KrX NSFW Guard v2 — Ceza Motoru
 * Tam debug loglu, rol hiyerarşisi kontrollü, hata fırlatan versiyon.
 */

const db     = require('./database');
const logger = require('./logger');
const chalk  = require('chalk');

// ─── Log yardımcıları ─────────────────────────────────────────────────────────
const C = {
  ok:   (msg) => console.log(chalk.green(`[KrX/Ceza] ✅ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[KrX/Ceza] ⚠️  ${msg}`)),
  err:  (msg) => console.log(chalk.red(`[KrX/Ceza] ❌ ${msg}`)),
  info: (msg) => console.log(chalk.cyan(`[KrX/Ceza] ℹ️  ${msg}`)),
};

// ─── Hiyerarşi kontrolü ───────────────────────────────────────────────────────
async function botUygulayabilirMi(guild, member, tip) {
  let botMember = guild.members.me;
  if (!botMember) {
    try { botMember = await guild.members.fetchMe(); } catch (e) {
      C.err(`Bot üyesi alınamadı: ${e.message}`);
      return false;
    }
  }

  // Yetki kontrolü
  const yetkiMap = {
    mute:  'ModerateMembers',
    kick:  'KickMembers',
    ban:   'BanMembers',
    unban: 'BanMembers',
  };

  const gerekliYetki = yetkiMap[tip];
  if (gerekliYetki && !botMember.permissions.has(gerekliYetki)) {
    C.err(`Bot '${gerekliYetki}' yetkisine sahip değil! (${tip} uygulanamaz)`);
    return false;
  }

  // Sunucu sahibi kontrolü
  if (member.id === guild.ownerId) {
    C.warn(`Sunucu sahibine ${tip} uygulanamaz: ${member.user?.tag || member.id}`);
    return false;
  }

  // Rol hiyerarşisi — mute/kick/ban için
  if (['mute','kick','ban'].includes(tip) && member.roles) {
    const botEn    = botMember.roles.highest.position;
    const hedefEn  = member.roles.highest.position;
    if (botEn <= hedefEn) {
      C.err(`Rol hiyerarşisi yetersiz! Bot: ${botEn} ≤ Hedef: ${hedefEn} — ${member.user?.tag}`);
      return false;
    }
  }

  return true;
}

// ─── NSFW İHLAL İŞLE ─────────────────────────────────────────────────────────
async function ihlalIsle({ mesaj, guild, member, dosyaUrl, tespit }) {
  const ayar  = db.guildGetir(guild.id);
  const sayac = db.ihlalinArtir(guild.id, member.id, mesaj.id, mesaj.channel.id, tespit.tip);

  db.silinenKaydet(guild.id, member.id, mesaj.channel.id, mesaj.id, dosyaUrl, tespit.tip, tespit.skor);

  C.info(`NSFW tespit | ${member.user?.tag} | İhlal #${sayac} | Tip: ${tespit.tip} | Skor: %${Math.round((tespit.skor||0)*100)}`);

  // Ceza adımını bul
  const cezaAdimlari = db.cezaListele(guild.id);
  const adim = cezaAdimlari.find(a => a.adim_no === sayac)
    || [...cezaAdimlari].filter(a => a.adim_no <= sayac).pop()
    || null;

  if (!adim) {
    C.warn(`Ceza adımı yok (sayac: ${sayac}) — sadece mesaj silindi`);
  }

  const logKanal = ayar.log_kanal_id ? guild.channels.cache.get(ayar.log_kanal_id) : null;
  if (!logKanal && ayar.log_kanal_id) {
    C.warn(`Log kanalı cache'de bulunamadı: ${ayar.log_kanal_id}`);
  }

  // Mesajı sil
  try {
    await mesaj.delete();
    C.ok(`Mesaj silindi: ${mesaj.id}`);
  } catch (e) {
    C.err(`Mesaj silinemedi (${mesaj.id}): ${e.message}`);
  }

  let cezaAdi = null;

  if (adim) {
    const sureMs  = db.sureyeMs(adim.sure_dk, adim.sure_saat, adim.sure_gun);
    const sureStr = db.sureyiBicimle(adim.sure_dk, adim.sure_saat, adim.sure_gun);
    const tipAd   = { uyari:'⚠️ Uyarı', mute:'🔇 Mute', kick:'👢 Kick', ban:'🔨 Ban' };
    cezaAdi = `${tipAd[adim.tip] || adim.tip}${sureMs > 0 ? ` (${sureStr})` : ''}`;

    C.info(`Ceza adımı: ${adim.adim_no}. ihlal → ${adim.tip}${sureMs > 0 ? ` (${sureStr})` : ''}`);

    switch (adim.tip) {

      case 'uyari':
        C.ok(`Uyarı gönderildi: ${member.user?.tag}`);
        break;

      case 'mute': {
        const yapabilir = await botUygulayabilirMi(guild, member, 'mute');
        if (yapabilir) {
          // Discord max timeout: 28 gün
          const maxTimeout = 28 * 24 * 60 * 60 * 1000;
          const gercekSure = sureMs > 0 ? Math.min(sureMs, maxTimeout) : 60 * 60 * 1000; // default 1 saat
          try {
            await member.timeout(gercekSure, `KrX NSFW Guard — ${sayac}. ihlal`);
            C.ok(`Mute uygulandı: ${member.user?.tag} — ${sureStr || '1 saat'}`);
          } catch (e) {
            C.err(`Mute uygulanamadı (${member.user?.tag}): ${e.message}`);
          }
        }
        break;
      }

      case 'kick': {
        const yapabilir = await botUygulayabilirMi(guild, member, 'kick');
        if (yapabilir) {
          try {
            await member.kick(`KrX NSFW Guard — ${sayac}. ihlal`);
            C.ok(`Kick uygulandı: ${member.user?.tag}`);
          } catch (e) {
            C.err(`Kick uygulanamadı (${member.user?.tag}): ${e.message}`);
          }
        }
        break;
      }

      case 'ban': {
        const yapabilir = await botUygulayabilirMi(guild, member, 'ban');
        if (yapabilir) {
          try {
            await guild.members.ban(member.id, {
              reason: `KrX NSFW Guard — ${sayac}. ihlal`,
              deleteMessageSeconds: 86400,
            });
            C.ok(`Ban uygulandı: ${member.user?.tag}${sureMs > 0 ? ` (${sureStr})` : ' (Süresiz)'}`);

            // Süreli ban — DB'ye kaydet, setInterval ile takip et
            if (sureMs > 0) {
              db.guildAyarla(guild.id, {}); // touch — aslında unban_kuyrugu için ayrı tablo olabilir
              setTimeout(async () => {
                try {
                  await guild.members.unban(member.id, 'KrX NSFW Guard — Ban süresi doldu');
                  C.ok(`Otomatik unban: ${member.id}`);
                } catch (e) {
                  C.err(`Otomatik unban başarısız (${member.id}): ${e.message}`);
                }
              }, sureMs);
            }
          } catch (e) {
            C.err(`Ban uygulanamadı (${member.user?.tag}): ${e.message}`);
          }
        }
        break;
      }
    }

    // DM uyarısı
    try {
      await logger.dmUyari({
        user: member.user,
        guild,
        cezaTip: adim.tip,
        ihlalinSayisi: sayac,
        sure: sureMs > 0 ? sureStr : null,
        sebep: adim.sebep,
      });
      C.ok(`DM uyarısı gönderildi: ${member.user?.tag}`);
    } catch (e) {
      C.warn(`DM gönderilemedi (${member.user?.tag}): ${e.message}`);
    }

    if (adim.tip !== 'uyari') {
      await logger.logCeza({
        logKanal, guild,
        user: member.user,
        cezaTip: adim.tip,
        sure: sureMs > 0 ? sureStr : null,
        ihlalinSayisi: sayac,
        sebep: adim.sebep,
      });
    }
  }

  // NSFW log her zaman
  await logger.logNsfwSilindi({
    logKanal, guild,
    user: member.user,
    kanal: mesaj.channel,
    mesajId: mesaj.id,
    dosyaUrl,
    tespit: tespit.tip,
    skor: tespit.skor,
    ihlalinSayisi: sayac,
    cezaAdi,
    bypass: tespit.bypass || null,
  });
}

// ─── MOD KOMUTU AKSİYON ──────────────────────────────────────────────────────
async function aksiyonUygula({ guild, member, tip, sureMs, sureStr, sebep, yetkili }) {
  const ayar    = db.guildGetir(guild.id);
  const modKanal = ayar.mod_log_kanal_id
    ? guild.channels.cache.get(ayar.mod_log_kanal_id)
    : ayar.log_kanal_id
      ? guild.channels.cache.get(ayar.log_kanal_id)
      : null;

  C.info(`Mod aksiyon: ${tip} | Hedef: ${member.user?.tag || member.id} | Yetkili: ${yetkili?.tag}`);

  const hedefUser = member.user || member;

  switch (tip) {

    case 'mute': {
      const yapabilir = await botUygulayabilirMi(guild, member, 'mute');
      if (!yapabilir) throw new Error('Bot bu kullanıcıya mute uygulayamaz. Rol hiyerarşisini veya yetkileri kontrol et.');
      const maxTimeout = 28 * 24 * 60 * 60 * 1000;
      const gercekSure = sureMs > 0 ? Math.min(sureMs, maxTimeout) : 3600000;
      try {
        await member.timeout(gercekSure, sebep);
        C.ok(`Mute: ${member.user?.tag} (${sureStr || '1 saat'})`);
      } catch (e) {
        C.err(`Mute hatası: ${e.message}`);
        throw new Error(`Mute uygulanamadı: ${e.message}`);
      }
      break;
    }

    case 'unmute': {
      try {
        await member.timeout(null, sebep);
        C.ok(`Unmute: ${member.user?.tag}`);
      } catch (e) {
        C.err(`Unmute hatası: ${e.message}`);
        throw new Error(`Unmute uygulanamadı: ${e.message}`);
      }
      break;
    }

    case 'kick': {
      const yapabilir = await botUygulayabilirMi(guild, member, 'kick');
      if (!yapabilir) throw new Error('Bot bu kullanıcıyı kick edemez.');
      try {
        await member.kick(sebep);
        C.ok(`Kick: ${member.user?.tag}`);
      } catch (e) {
        C.err(`Kick hatası: ${e.message}`);
        throw new Error(`Kick uygulanamadı: ${e.message}`);
      }
      break;
    }

    case 'ban': {
      const yapabilir = await botUygulayabilirMi(guild, member, 'ban');
      if (!yapabilir) throw new Error('Bot bu kullanicıyı ban yapamaz.');
      try {
        await guild.members.ban(member.id || member, {
          reason: sebep,
          deleteMessageSeconds: 86400,
        });
        C.ok(`Ban: ${member.user?.tag || member.id}${sureMs > 0 ? ` (${sureStr})` : ''}`);
        if (sureMs > 0) {
          setTimeout(async () => {
            try {
              await guild.members.unban(member.id || member, 'Süre doldu');
              C.ok(`Otomatik unban: ${member.id || member}`);
            } catch (e) {
              C.err(`Otomatik unban başarısız: ${e.message}`);
            }
          }, sureMs);
        }
      } catch (e) {
        C.err(`Ban hatası: ${e.message}`);
        throw new Error(`Ban uygulanamadı: ${e.message}`);
      }
      break;
    }

    case 'unban': {
      const userId = member.id || member;
      try {
        await guild.members.unban(userId, sebep);
        C.ok(`Unban: ${userId}`);
      } catch (e) {
        C.err(`Unban hatası: ${e.message}`);
        throw new Error(`Unban uygulanamadı: ${e.message}`);
      }
      break;
    }

    default:
      C.warn(`Bilinmeyen aksiyon tipi: ${tip}`);
  }

  // Log
  try {
    await logger.logMod({
      logKanal: modKanal,
      guild,
      hedefUser,
      yetkiliUser: yetkili,
      aksiyon: tip,
      sebep,
      sure: sureStr || null,
    });
  } catch (e) {
    C.warn(`Mod logu gönderilemedi: ${e.message}`);
  }
}

// ─── OTOMATİK SAYAÇ SIFIRLAMA ─────────────────────────────────────────────────
function otomatikSayac(client) {
  setInterval(() => {
    let toplam = 0;
    for (const [gid] of client.guilds.cache) {
      const a = db.guildGetir(gid);
      if (a.sayac_sifirlama_gun > 0) {
        db.sayacOtomatik(gid, a.sayac_sifirlama_gun);
        toplam++;
      }
    }
    if (toplam > 0) C.info(`Otomatik sayaç kontrolü: ${toplam} sunucu`);
  }, 3600000); // Her saat
}

module.exports = { ihlalIsle, aksiyonUygula, otomatikSayac };
