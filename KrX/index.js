/**
 * KrX NSFW Guard v2 — Ana Bot
 * Başlat: node index.js (veya baslat.bat)
 * Deploy: node src/deploy.js  ← ÖNCE BİR KERE ÇALIŞTIR
 */
const {
  Client, GatewayIntentBits, Partials,
  Collection, Events, PermissionFlagsBits,
} = require('discord.js');
const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');
const medya = require('./medyaKaydedici');

// ─── Config ──────────────────────────────────────────────────────────────────
const cfgPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(cfgPath)) {
  console.error(chalk.red('❌ config.json bulunamadı!'));
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
if (!cfg.token || cfg.token.includes('BURAYA')) {
  console.error(chalk.red('❌ config.json içine token ve clientId yaz!'));
  process.exit(1);
}

// ─── Modüller ─────────────────────────────────────────────────────────────────
const db       = require('./src/database');
const detector = require('./src/detector');
const ceza     = require('./src/ceza');
const scanner  = require('./src/scanner');
const logger   = require('./src/logger');

// ─── CMD Debug Logger ─────────────────────────────────────────────────────────
// Tüm bot olaylarını renkli ve detaylı CMD'ye yazar.
// Log kanalına GITMEZ — sadece terminalde görünür.
const LOG = {
  // ── Temel ──
  sistem: (msg) => console.log(chalk.bgCyan.black(      `[KrX/Sistem  ] ${msg}`)),
  olay:   (msg) => console.log(chalk.cyan(              `[KrX/Olay    ] ${msg}`)),
  // ── NSFW ──
  nsfw:   (msg) => console.log(chalk.bgRed.white(       `[KrX/NSFW    ] ${msg}`)),
  tespit: (msg) => console.log(chalk.red(               `[KrX/Tespit  ] ${msg}`)),
  temiz:  (msg) => console.log(chalk.gray(              `[KrX/Temiz   ] ${msg}`)),
  // ── Ceza ──
  ceza:   (msg) => console.log(chalk.bgYellow.black(    `[KrX/Ceza    ] ${msg}`)),
  // ── Filtreler ──
  filtre: (msg) => console.log(chalk.yellow(            `[KrX/Filtre  ] ${msg}`)),
  spam:   (msg) => console.log(chalk.yellow(            `[KrX/Spam    ] ${msg}`)),
  raid:   (msg) => console.log(chalk.bgMagenta.white(   `[KrX/Raid    ] ${msg}`)),
  // ── Genel ──
  ok:     (msg) => console.log(chalk.green(             `[KrX/OK      ] ${msg}`)),
  warn:   (msg) => console.log(chalk.yellow(            `[KrX/Uyarı   ] ${msg}`)),
  err:    (msg) => console.log(chalk.red(               `[KrX/HATA    ] ${msg}`)),
  cmd:    (msg) => console.log(chalk.magenta(           `[KrX/Komut   ] ${msg}`)),
  // ── Ayraç ──
  sep:    ()    => console.log(chalk.gray('─'.repeat(60))),
};

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ─── Slash Komutları ──────────────────────────────────────────────────────────
client.komutlar = new Collection();
const cmdDosyalari = fs.readdirSync(path.join(__dirname, 'src', 'commands')).filter(f => f.endsWith('.js'));
for (const f of cmdDosyalari) {
  const cmd = require(`./src/commands/${f}`);
  client.komutlar.set(cmd.data.name, cmd);
}
console.log(chalk.cyan(`[KrX] ${client.komutlar.size} komut yüklendi.`));

// ─── Raid Takibi (bellekte) ────────────────────────────────────────────────────
const raidTakip = new Map(); // guildId → [timestamp]

// ─── READY ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async c => {
  LOG.sep();
  LOG.sistem(`KrX NSFW Guard v2 başlatıldı`);
  LOG.sistem(`Bot: ${c.user.tag} (${c.user.id})`);
  LOG.sistem(`Sunucu: ${c.guilds.cache.size} adet`);
  LOG.sistem(`Komut: ${client.komutlar.size} adet`);
  LOG.sep();

  c.user.setActivity('🛡️ NSFW Koruyor', { type: 3 });

  // Otomatik sayaç sıfırlayıcı
  ceza.otomatikSayac(client);

  // Açılış taraması (5sn bekle, guild cache dolsun)
  setTimeout(() => scanner.acilisTara(client).catch(e => console.warn(chalk.yellow('[KrX] Tarama hatası:'), e.message)), 5000);
});

// ─── MESAJ OLUŞTURMA ──────────────────────────────────────────────────────────
client.on(Events.MessageCreate, async mesaj => {
  try {
    if (!mesaj.guild || mesaj.author?.bot) return;

    const g    = mesaj.guild;
    const ayar = db.guildGetir(g.id);
    if (!ayar.aktif) return;

    let member = mesaj.member;
    if (!member) {
      try { member = await g.members.fetch(mesaj.author.id); }
      catch (e) { LOG.warn(`Member fetch başarısız (${mesaj.author.id}): ${e.message}`); return; }
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
    if (g.ownerId === member.id) return;
    if (ayar.muaf_roller?.some(r => member.roles.cache.has(r))) return;

    // ── Davet linki ─────────────────────────────────────────────────────────
    if (ayar.davet_filtresi && detector.davetTespit(mesaj.content)) {
      LOG.filtre(`Davet linki → ${member.user.tag} | #${mesaj.channel.name}`);
      try { await mesaj.delete(); LOG.ok(`Davet linki silindi`); } catch (e) { LOG.err(`Silme hatası: ${e.message}`); }
      const logKanal = ayar.log_kanal_id ? g.channels.cache.get(ayar.log_kanal_id) : null;
      await logger.logFiltre({ logKanal, guild:g, user:mesaj.author, kanal:mesaj.channel, mesajId:mesaj.id, icerik:mesaj.content, tip:'link', detay:'Discord davet linki' });
      return;
    }

    // ── Kelime filtresi ──────────────────────────────────────────────────────
    if (ayar.kelime_filtre_aktif) {
      const kelimeler = db.kelimeListesi(g.id);
      const bulunan   = detector.kelimeTespit(mesaj.content, kelimeler);
      if (bulunan) {
        LOG.filtre(`Yasak kelime "${bulunan.kelime}" → ${member.user.tag} | #${mesaj.channel.name}`);
        try { await mesaj.delete(); LOG.ok(`Yasak kelime silindi`); } catch (e) { LOG.err(`Silme hatası: ${e.message}`); }
        const logKanal = ayar.log_kanal_id ? g.channels.cache.get(ayar.log_kanal_id) : null;
        await logger.logFiltre({ logKanal, guild:g, user:mesaj.author, kanal:mesaj.channel, mesajId:mesaj.id, icerik:mesaj.content, tip:'kelime', detay:bulunan.kelime });
        return;
      }
    }

    // ── Link filtresi ────────────────────────────────────────────────────────
    if (ayar.link_filtre_aktif) {
      const yasakDomainler = db.linkListesi(g.id).map(l => l.domain);
      if (yasakDomainler.length) {
        const bulunan = detector.linkTespit(mesaj.content, yasakDomainler);
        if (bulunan) {
          LOG.filtre(`Yasak link "${bulunan}" → ${member.user.tag} | #${mesaj.channel.name}`);
          try { await mesaj.delete(); LOG.ok(`Yasak link silindi`); } catch (e) { LOG.err(`Silme hatası: ${e.message}`); }
          const logKanal = ayar.log_kanal_id ? g.channels.cache.get(ayar.log_kanal_id) : null;
          await logger.logFiltre({ logKanal, guild:g, user:mesaj.author, kanal:mesaj.channel, mesajId:mesaj.id, icerik:mesaj.content, tip:'link', detay:bulunan });
          return;
        }
      }
    }

    // ── Anti-spam ────────────────────────────────────────────────────────────
    if (ayar.spam_aktif) {
      db.spamEkle(g.id, member.id, Date.now());
      const sayac = db.spamTemizle(g.id, member.id, ayar.spam_sure);
      if (sayac >= ayar.spam_limit) {
        LOG.spam(`SPAM! ${member.user.tag} → ${sayac} mesaj/${ayar.spam_sure}sn | Aksiyon: ${ayar.spam_aksiyon}`);
        const logKanal = ayar.log_kanal_id ? g.channels.cache.get(ayar.log_kanal_id) : null;

        if (ayar.spam_aksiyon === 'mute') {
          try {
            await member.timeout(ayar.spam_mute_dk * 60000, 'KrX Anti-Spam');
            LOG.ok(`Spam mute: ${member.user.tag} (${ayar.spam_mute_dk}dk)`);
          } catch (e) { LOG.err(`Spam mute hatası: ${e.message}`); }
        } else if (ayar.spam_aksiyon === 'kick') {
          try {
            await member.kick('KrX Anti-Spam');
            LOG.ok(`Spam kick: ${member.user.tag}`);
          } catch (e) { LOG.err(`Spam kick hatası: ${e.message}`); }
        }

        await logger.logSpam({ logKanal, guild:g, user:mesaj.author, kanal:mesaj.channel, mesajSayisi:sayac, aksiyon:ayar.spam_aksiyon });
        return;
      }
    }

    // ── NSFW tarama ──────────────────────────────────────────────────────────
    if (!ayar.nsfw_aktif) return;
    if (!detector.kanalTaranmali(mesaj.channel, ayar)) return;
    if (!mesaj.attachments.size && !mesaj.embeds.length) return;

    // Dosya var — tarama başlıyor
    const dosyaSayisi = mesaj.attachments.size + mesaj.embeds.length;
    LOG.tespit(`Taranıyor → ${member.user.tag} | #${mesaj.channel.name} | ${dosyaSayisi} dosya/embed`);

    const tespit = await detector.mesajiTara(mesaj, ayar);

    if (!tespit) {
      LOG.temiz(`Temiz → ${member.user.tag} | #${mesaj.channel.name}`);
      return;
    }

    LOG.sep();
    LOG.nsfw(`NSFW TESPİT! → ${member.user.tag} (${member.id})`);
    LOG.nsfw(`Kanal: #${mesaj.channel.name} | Sunucu: ${g.name}`);
    LOG.nsfw(`Tip: ${tespit.tip} | Skor: %${Math.round((tespit.skor||0)*100)}`);
    LOG.nsfw(`Dosya: ${tespit.url || 'embed'}`);
    if (tespit.bypass) LOG.nsfw(`⚠️  SPOILER BYPASS tespit edildi!`);
    LOG.sep();

    await ceza.ihlalIsle({ mesaj, guild:g, member, dosyaUrl:tespit.url, tespit });

  } catch (e) {
    LOG.err(`MessageCreate kritik hata: ${e.message}`);
    console.error(e.stack);
  }
});

// ─── MESAJ DÜZENLEME ──────────────────────────────────────────────────────────
client.on(Events.MessageUpdate, async (eski, yeni) => {
  try {
    if (!yeni.guild || yeni.author?.bot) return;
    if (!yeni.attachments?.size && !yeni.embeds?.length) return;

    const eklendiMi = (yeni.attachments?.size || 0) > (eski.attachments?.size || 0);
    const embedDeg  = (yeni.embeds?.length || 0) > (eski.embeds?.length || 0);
    if (!eklendiMi && !embedDeg) return;

    const g    = yeni.guild;
    const ayar = db.guildGetir(g.id);
    if (!ayar.aktif || !ayar.nsfw_aktif) return;
    if (!detector.kanalTaranmali(yeni.channel, ayar)) return;

    let member = yeni.member;
    if (!member) { try { member = await g.members.fetch(yeni.author.id); } catch { return; } }
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
    if (ayar.muaf_roller?.some(r => member.roles.cache.has(r))) return;

    const tespit = await detector.mesajiTara(yeni, ayar);
    if (!tespit) return;

    await ceza.ihlalIsle({ mesaj:yeni, guild:g, member, dosyaUrl:tespit.url, tespit });
  } catch {}
});

// ─── YENİ ÜYE — ANTİ-RAİD ───────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async member => {
  try {
    const g    = member.guild;
    const ayar = db.guildGetir(g.id);
    if (!ayar.raid_aktif) return;

    const simdi = Date.now();
    if (!raidTakip.has(g.id)) raidTakip.set(g.id, []);

    const zamanlar = raidTakip.get(g.id);
    zamanlar.push(simdi);
    // Pencere dışındakileri temizle
    const temiz = zamanlar.filter(t => simdi - t < ayar.raid_esik_sure * 1000);
    raidTakip.set(g.id, temiz);

    if (temiz.length >= ayar.raid_esik) {
      console.warn(chalk.red(`[KrX] ⚠️ RAİD TESPİT: ${g.name} — ${temiz.length} kişi ${ayar.raid_esik_sure}sn'de`));
      raidTakip.set(g.id, []); // Sıfırla

      const logKanal = ayar.log_kanal_id ? g.channels.cache.get(ayar.log_kanal_id) : null;
      if (logKanal) {
        const { EmbedBuilder } = require('discord.js');
        await logger.logRaid({
          logKanal,
          guild,
          kisiSayisi: temiz.length,
          surelik: ayar.raid_esik_sure,
          aksiyon: ayar.raid_aksiyon,
        });
      }

      if (ayar.raid_aksiyon === 'lockdown') {
        // Tüm metin kanallarını kilitle
        for (const [, kanal] of g.channels.cache) {
          if (kanal.isTextBased() && !kanal.isDMBased()) {
            kanal.permissionOverwrites.edit(g.roles.everyone, { SendMessages: false }).catch(() => {});
          }
        }
        db.guildAyarla(g.id, { kilitli: true });
      }
    }
  } catch {}
});

// ─── INTERACTION HANDLER (slash + buton + modal) ─────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  try {
    // ── Slash komut ──────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const cmd = client.komutlar.get(interaction.commandName);
      if (!cmd) return;
      LOG.cmd(`/${interaction.commandName} | ${interaction.user.tag} | ${interaction.guild?.name}`);
      await cmd.execute(interaction);
      return;
    }

    // ── Buton ─────────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      // Yetki kontrolü
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content:'❌ Bu paneli kullanmak için **Yönetici** yetkisi gerekli.', ephemeral:true });
      }
      const ayarlaCmd = client.komutlar.get('ayarla');
      if (ayarlaCmd?.handleButton) {
        await ayarlaCmd.handleButton(interaction);
      }
      return;
    }

    // ── Modal ─────────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const ayarlaCmd = client.komutlar.get('ayarla');
      if (ayarlaCmd?.handleModal) {
        await ayarlaCmd.handleModal(interaction);
      }
      return;
    }

  } catch (e) {
    console.error(chalk.red(`[KrX] Interaction hatası:`), e.message);
    const yanit = { content: '❌ İşlem sırasında hata oluştu.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(yanit);
      else await interaction.reply(yanit);
    } catch (_) {}
  }
});

// ─── YENİ SUNUCUYA EKLENME ───────────────────────────────────────────────────
client.on(Events.GuildCreate, async guild => {
  console.log(chalk.green(`[KrX] ➕ Yeni sunucu: ${guild.name}`));
  db.guildGetir(guild.id);

  const kanal = guild.systemChannel || guild.channels.cache.find(
    c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages')
  );
  if (kanal) {
    await kanal.send({ embeds: [new EmbedBuilder()
      .setColor(0x30D158)
      .setAuthor({ name: 'KrX NSFW Guard v2', iconURL: c.user.displayAvatarURL() })
      .setTitle('🛡️  KrX NSFW Guard v2 — Merhaba!')
      .setThumbnail(guild.iconURL())
      .setDescription(
        `Merhaba **${guild.name}**! KrX NSFW Guard sunucunuza eklendi.\n` +
        `Başlamak için aşağıdaki adımları takip edin.`
      )
      .addFields(
        {
          name: '⚡  Hızlı Kurulum',
          value: [
            '`1.` `/ayarla` → Kontrol panelini aç',
            '`2.` `/ayarla log` → Log kanalı belirle',
            '`3.` `/ceza ekle adim:1 tip:uyari` → İlk ceza adımı',
            '`4.` `/durum` → Sistemi kontrol et',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📋  Komutlar',
          value: '`/ayarla`  `/ceza`  `/nsfw`  `/ihlaller`\n`/koruma`  `/moderasyon`  `/durum`  `/yardim`',
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'KrX NSFW Guard v2 — Sunucunuzu koruyoruz.' })
    ] }).catch(() => {});
  }
});

// ─── HATA YÖNETİMİ ───────────────────────────────────────────────────────────
process.on('uncaughtException',  e => console.error(chalk.red('[KrX] Kritik:'), e.message));
process.on('unhandledRejection', e => console.warn(chalk.yellow('[KrX] Ret:'), e instanceof Error ? e.message : e));

// ─── Medya Kaydedici ─────────────────────────────────────────────────────────
medya.baslat(client);

// ─── BAŞLAT ───────────────────────────────────────────────────────────────────
client.login(cfg.token).catch(e => {
  console.error(chalk.red('[KrX] Login hatası:'), e.message);
  process.exit(1);
});
