// ╔══════════════════════════════════════════════════════════════════════╗
// ║                   MODBOT — YARDIM SİSTEMİ                          ║
// ║   Kategori → Komut Listesi → Komut Detayı (3 seviyeli navigasyon)  ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');
const e      = require('../../emojiConfig');
const { parseEmoji } = require('../../utils/parseEmoji');

// ══════════════════════════════════════════════════════════════════════
//  YARDIMCI — custom emoji'yi buton/select için parse et
//  '<:isim:id>' → { id, name, animated }
//  'unicode'    → 'unicode' (direkt)
// ══════════════════════════════════════════════════════════════════════
function pe(emojiStr) { return parseEmoji(emojiStr); }

// ══════════════════════════════════════════════════════════════════════
//  TÜM KOMUT VERİTABANI — 49 komut tam liste
//  perms: 'everyone' | 'moderator' | 'admin' | 'owner'
// ══════════════════════════════════════════════════════════════════════
const CATS = {

  mod_ceza: {
    label: 'Ceza Komutları', emoji: e.ban,
    desc:  'Ban, kick, mute, timeout, warn ve uyarı komutları',
    perms: 'moderator',
    cmds: [
      { n:'ban',        u:'!ban <@üye|ID> [sebep]',               d:'Kullanıcıyı kalıcı yasaklar.',
        det:['Kullanıcıyı sunucudan **kalıcı** olarak yasaklar.','Son 7 günlük mesajları silinir.','Kişiye DM bildirim gider.','**İzin:** Üyeleri Engelle'], al:['yasakla','engelle'], cd:'3sn' },

      { n:'unban',      u:'!unban <ID> [sebep]',                  d:'Yasaklı kullanıcının yasağını kaldırır.',
        det:['Ban listesindeki kullanıcının yasağını kaldırır.','Eski ban sebebi embed\'de gösterilir.','**İzin:** Üyeleri Engelle'], al:['yasakkaldır','bankal'], cd:'3sn' },

      { n:'kick',       u:'!kick <@üye|ID> [sebep]',              d:'Kullanıcıyı sunucudan atar (yeniden girebilir).',
        det:['Kullanıcıyı atar, sunucuya tekrar davet alabilir.','Kişiye DM bildirim gider.','**İzin:** Üyeleri At'], al:['at','çıkar'], cd:'3sn' },

      { n:'mute',       u:'!mute <@üye|ID> [süre] [sebep]',       d:'Kullanıcıyı susturur. Süre: 10m, 2h, 1d',
        det:['Belirtilen süre boyunca susturur.','Süre girilmezse Discord\'un max süresi (28 gün) uygulanır.','**Süre formatı:** `10m` · `2h` · `1d`','**İzin:** Üyeleri Yönet'], al:['sus','sustur'], cd:'3sn' },

      { n:'unmute',     u:'!unmute <@üye|ID> [sebep]',            d:'Susturmayı kaldırır.',
        det:['Hem muted rolünü hem de Discord timeout\'unu kaldırır.','**İzin:** Üyeleri Yönet'], al:['suskaldır'], cd:'3sn' },

      { n:'timeout',    u:'!timeout <@üye|ID> <süre> [sebep]',    d:'Discord timeout uygular (maks 28 gün).',
        det:['Discord\'un yerleşik timeout özelliği.','Maks süre: **28 gün**','**Süre formatı:** `10m` · `2h` · `7d`','**İzin:** Üyeleri Yönet'], al:['to'], cd:'3sn' },

      { n:'warn',       u:'!warn <@üye|ID> [sebep]',              d:'Uyarı verir — belirli sayıda otomatik ceza uygulanır.',
        det:['Uyarı verir ve veritabanına kaydeder.','**Otomatik ceza:** 2→10dk, 3→1sa, 5→kick, 7→24sa ban, 10→kalıcı ban','**İzin:** Üyeleri Yönet'], al:['uyar'], cd:'3sn' },

      { n:'warnings',   u:'!warnings [@üye|ID]',                  d:'Uyarı geçmişini sayfalı gösterir.',
        det:['Progress bar ile uyarı durumunu gösterir.','Sayfalı — butonlarla gezin.','Kendi uyarılarını herkes görebilir.'], al:['uyarılar','warns'], cd:'5sn' },

      { n:'delwarn',    u:'!delwarn <@üye|ID> <uyarı-ID>',        d:'Belirli bir uyarıyı siler.',
        det:['Uyarı ID\'sini `!warnings` komutuyla öğrenebilirsin.','**İzin:** Üyeleri Yönet'], al:['uyarısil'], cd:'3sn' },

      { n:'clearwarns', u:'!clearwarns <@üye|ID>',                d:'Tüm uyarıları siler.',
        det:['Kullanıcının tüm uyarı geçmişini temizler.','**İzin:** Üyeleri Yönet'], al:['warnreset'], cd:'5sn' },

      { n:'modhistory', u:'!modhistory [@üye|ID]',                d:'Mod geçmişini sayfalı gösterir.',
        det:['Ban/kick/mute/warn tüm geçmişi listeler.','Sayfalı — butonlarla gezin.','**İzin:** Moderatör'], al:['mh','history'], cd:'5sn' },

      { n:'banlist',    u:'!banlist',                             d:'Sunucunun ban listesini sayfalı gösterir.',
        det:['Tüm yasaklı kullanıcıları listeler.','10\'ar kişilik sayfalama, ilk/önceki/sonraki/son butonları.','**İzin:** Moderatör'], al:['banliste','bans'], cd:'10sn' },
    ],
  },

  mod_kanal: {
    label: 'Kanal Komutları', emoji: e.lock,
    desc:  'Kanal kilitleme, mesaj silme, yavaş mod, nuke',
    perms: 'moderator',
    cmds: [
      { n:'clear',    u:'!clear <1-500> [@üye] [--bots] [--links]', d:'Toplu mesaj siler. Filtre seçenekleri mevcut.',
        det:['`@üye` → sadece o kişinin mesajları','`--bots` → sadece bot mesajları','`--links` → sadece linkli mesajlar','14 günden eski mesajlar bulk delete ile silinemez.','**İzin:** Mesajları Yönet'], al:['temizle','purge'], cd:'5sn' },

      { n:'lock',     u:'!lock [#kanal] [sebep]',                  d:'Kanalı kilitler — @everyone mesaj gönderemez.',
        det:['Kanal içine bildirim mesajı gönderilir.','**İzin:** Kanalları Yönet'], al:['kilitle'], cd:'5sn' },

      { n:'unlock',   u:'!unlock [#kanal] [sebep]',                d:'Kanalın kilidini açar.',
        det:['@everyone mesaj gönderme iznini geri yükler.','**İzin:** Kanalları Yönet'], al:['kilitsizleştir'], cd:'5sn' },

      { n:'slowmode', u:'!slowmode <0-21600> [#kanal]',            d:'Yavaş mod ayarlar. 0 ile kapatırsın.',
        det:['Maks: **21600 saniye** (6 saat)','0 yazarak kapatabilirsin.','**İzin:** Kanalları Yönet'], al:['sm'], cd:'5sn' },

      { n:'lockdown', u:'!lockdown <kapat|aç> [sebep]',            d:'Tüm metin kanallarını kilitler veya açar.',
        det:['Sunucudaki tüm metin kanallarına toplu işlem.','`kapat` → kimse mesaj gönderemez','`aç` → izinler geri yüklenir','**İzin:** Kanalları Yönet'], al:['serverlock'], cd:'10sn' },

      { n:'nuke',     u:'!nuke [#kanal] [sebep]',                  d:'Kanalı klonlayıp siler — tüm mesajlar gider.',
        det:['Kanalı klonlar, orijinalini siler.','Tüm mesajlar **kalıcı** olarak silinir.','Onay butonu ile teyit edilir.','⚠️ GERİ ALINAMAZ!','**İzin:** Kanalları Yönet'], al:['kanaltemizle'], cd:'30sn' },
    ],
  },

  mod_ses: {
    label: 'Ses Komutları', emoji: e.voiceJoin,
    desc:  'Ses kanalı moderasyon komutları',
    perms: 'moderator',
    cmds: [
      { n:'vmute',   u:'!vmute <@üye|ID> [sebep]',     d:'Ses kanalında server mute uygular.',
        det:['Kullanıcının ses kanalında konuşmasını engeller.','Kullanıcının ses kanalında olması gerekir.','**İzin:** Üyeleri Sustur'], al:['sessus'], cd:'3sn' },

      { n:'vunmute', u:'!vunmute <@üye|ID>',            d:'Ses kanalındaki mute\'u kaldırır.',
        det:['Server mute uygulanmış kullanıcının sesini açar.','**İzin:** Üyeleri Sustur'], al:['sessusaç'], cd:'3sn' },

      { n:'vdeafen', u:'!vdeafen <@üye|ID> [sebep]',    d:'Ses kanalında sağırlaştırır — hiçbir şey duymaz.',
        det:['Server deaf uygular.','**İzin:** Üyeleri Sağırlaştır'], al:['sağırlaştır'], cd:'3sn' },

      { n:'vmove',   u:'!vmove <@üye|ID> <kanal-ID>',   d:'Kullanıcıyı başka bir ses kanalına taşır.',
        det:['Hedef ses kanalının ID\'sini belirt.','**İzin:** Üyeleri Taşı'], al:['sestasi'], cd:'3sn' },

      { n:'vkick',   u:'!vkick <@üye|ID> [sebep]',      d:'Kullanıcıyı ses kanalından atar.',
        det:['Sadece ses kanalından çıkarır, sunucuda kalır.','**İzin:** Üyeleri Taşı'], al:['sesat'], cd:'3sn' },
    ],
  },

  bilgi: {
    label: 'Bilgi Komutları', emoji: e.infoCategory,
    desc:  'Kullanıcı, sunucu, rol, davet bilgileri',
    perms: 'everyone',
    cmds: [
      { n:'userinfo',          u:'!userinfo [@üye|ID]',   d:'Detaylı kullanıcı bilgisi — durum, rozetler, roller.',
        det:['Durum, rozetler, roller, mod geçmişi, uyarı durumu.','Kendi bilgini herkes, başkasınıkini sadece modlar görebilir.'], al:['ui','whois'], cd:'5sn' },

      { n:'serverinfo',        u:'!serverinfo',            d:'Sunucu bilgisi — üye, kanal, boost, güvenlik.',
        det:['Üye/kanal/boost sayıları, online/idle/dnd dağılımı.','Sunucu özellikleri ve banner gösterimi.'], al:['si','guild'], cd:'10sn' },

      { n:'roleinfo',          u:'!roleinfo <@rol|isim>',  d:'Rol bilgisi ve izin listesi.',
        det:['Tüm izinleri listeler.','Tehlikeli izin varsa kırmızı uyarı gösterir.','Renk, üye sayısı, pozisyon bilgisi.'], al:['ri'], cd:'5sn' },

      { n:'avatar',            u:'!avatar [@üye|ID]',      d:'Profil fotoğrafını PNG/JPG butonlarıyla gösterir.',
        det:['Global ve sunucu avatarını ayrı gösterir.','PNG ve JPG indirme butonları.'], al:['av','pfp','pp'], cd:'5sn' },

      { n:'banner',            u:'!banner [@üye|ID]',      d:'Profil bannerını gösterir.',
        det:['Banner yoksa profil aksan rengi gösterilir.'], al:['profil-banner'], cd:'5sn' },

      { n:'invites',           u:'!invites [@üye|ID]',     d:'Davet istatistiklerini gösterir.',
        det:['Toplam, gerçek, ayrılan, sahte davet sayıları.','Kim tarafından davet edildi bilgisi.'], al:['davetler','davet'], cd:'5sn' },

      { n:'inviteleaderboard', u:'!invitelb',              d:'Davet sıralaması — Top 15.',
        det:['Gerçek davet sayısına göre sıralama.','Ayrılan üyeler çıkarılır.'], al:['invitelb','davetliste'], cd:'10sn' },

      { n:'ping',              u:'!ping',                  d:'Bot ve API gecikmesini gösterir.',
        det:['Progress bar ile gecikme durumu.','🟢 <100ms · 🟡 <250ms · 🔴 250ms+'], al:['gecikme','ms'], cd:'5sn' },

      { n:'botinfo',           u:'!botinfo',               d:'Bot istatistikleri, uptime, teknik bilgiler.',
        det:['Sunucu/üye/komut sayıları, RAM kullanımı.','Son kapanış zamanı, önceki uptime.'], al:['bot','hakkında'], cd:'10sn' },

      { n:'uptime',            u:'!uptime',                d:'Çalışma süresi ve geçmiş oturumlar.',
        det:['Mevcut uptime ve başlangıç zamanı.','Son 5 oturum geçmişi (crash/normal).'], al:['süre'], cd:'10sn' },
    ],
  },

  araclar: {
    label: 'Araçlar', emoji: e.utilCategory,
    desc:  'Snipe, editsnipe, report komutları',
    perms: 'everyone',
    cmds: [
      { n:'snipe',     u:'!snipe',                        d:'Bu kanalda son silinen mesajı gösterir.',
        det:['Bot başladıktan sonra silinen son mesajı gösterir.','Bot yeniden başlarsa veri sıfırlanır.'], al:['s'], cd:'5sn' },

      { n:'editsnipe', u:'!editsnipe',                    d:'Bu kanalda son düzenlenen mesajı gösterir.',
        det:['Son düzenlenen mesajın önceki ve yeni halini gösterir.','Mesaj linkine direkt atlamak için buton.'], al:['es','esnipe'], cd:'5sn' },

      { n:'report',    u:'!report <@üye|ID> <sebep>',     d:'Yetkililere hızlı şikayet gönderir.',
        det:['Şikayet moderatör kanalına iletilir.','5 dakika cooldown var.','Komutun mesajı otomatik silinir.'], al:['şikayet','ihbar'], cd:'5dk' },
    ],
  },

  admin_rol: {
    label: 'Admin — Rol & Üye', emoji: e.adminCategory,
    desc:  'Rol verme/alma, toplu rol, takma ad',
    perms: 'admin',
    cmds: [
      { n:'giverole',  u:'!giverole <@üye|ID> <@rol|ID|isim>', d:'Kullanıcıya rol verir.',
        det:['Tehlikeli izin uyarısı gösterir.','Hiyerarşi kontrolü yapılır.','**İzin:** Rolleri Yönet'], al:['rolekle','addrole'], cd:'3sn' },

      { n:'takerole',  u:'!takerole <@üye|ID> <@rol|ID|isim>', d:'Kullanıcıdan rol alır.',
        det:['Hiyerarşi kontrolü yapılır.','**İzin:** Rolleri Yönet'], al:['rolkaldır'], cd:'3sn' },

      { n:'roleall',   u:'!roleall <ekle|kaldır> <@rol> [--botlar]', d:'Tüm üyelere toplu rol işlemi.',
        det:['`--botlar` ile sadece botlara uygula.','Büyük sunucularda rate limit nedeniyle uzun sürebilir.','**İzin:** Rolleri Yönet'], al:['toplurol'], cd:'10sn' },

      { n:'nickname',  u:'!nickname <@üye|ID> <yeni ad|sıfırla>', d:'Üyenin takma adını değiştirir veya kaldırır.',
        det:['`sıfırla` yazarak takma adı kaldır.','**İzin:** Takma Adları Yönet'], al:['nick','ad'], cd:'3sn' },
    ],
  },

  admin_kanal: {
    label: 'Admin — Kanal & Duyuru', emoji: e.channelCreate,
    desc:  'Say, announce, statssetup',
    perms: 'admin',
    cmds: [
      { n:'say',        u:'!say [#kanal] <mesaj>',         d:'Bot kimliğiyle mesaj gönderir.',
        det:['Bot adına mesaj gönderir.','Komutu yazan mesaj otomatik silinir.','**İzin:** Mesajları Yönet'], al:['söyle','yaz'], cd:'5sn' },

      { n:'announce',   u:'!announce [#kanal] <mesaj>',    d:'@everyone ping ile embed duyuru gönderir.',
        det:['Embed formatında duyuru.','@everyone mention ekler.','Komutu yazan mesaj silinir.','**İzin:** Mesajları Yönet'], al:['duyur'], cd:'10sn' },

      { n:'statssetup', u:'!statssetup',                   d:'Otomatik güncellenen istatistik kanalları oluşturur.',
        det:['Üye/bot/kanal sayısı için ses kanalları oluşturur.','Her 10 dakikada otomatik güncellenir.','Oluşturulan ID\'leri config.js\'e eklemen gerekir.','**İzin:** Kanalları Yönet'], al:['statkanal'], cd:'30sn' },
    ],
  },

  admin_sistemler: {
    label: 'Admin — Sistemler', emoji: e.ticketCategory,
    desc:  'Ticket, Reaction Role, Kelime Filtresi',
    perms: 'admin',
    cmds: [
      { n:'ticket',     u:'!ticket setup [#kanal]',        d:'Ticket paneli oluşturur.',
        det:['5 farklı ticket tipi: Genel, Şikayet, Öneri, Ceza İtirazı, Diğer.','Transcript otomatik kaydedilir.','Rating (5 yıldız) sistemi DM ile gönderilir.','**İzin:** Kanalları Yönet'], al:['tsetup'], cd:'5sn' },

      { n:'rr',         u:'!rr setup|ekle|kaldır|liste',   d:'Reaction Role — butonla rol al/bırak.',
        det:['`!rr setup <başlık>` → Panel oluştur','`!rr ekle <msj-ID> <emoji> <@rol>` → Rol ekle','`!rr kaldır <msj-ID> <emoji>` → Rol kaldır','`!rr liste` → Tüm panelleri listele','**İzin:** Rolleri Yönet'], al:['reactionrole'], cd:'5sn' },

      { n:'wordlist',   u:'!wordlist',                     d:'Küfür filtresi durumunu ve AI bilgisini gösterir.',
        det:['Kelime sayıları, AI durumu, ceza sistemi bilgisi.','OpenAI aktivasyon rehberi butonu.','**İzin:** Moderatör'], al:['filtreliste'], cd:'10sn' },

      { n:'addword',    u:'!addword <kelime>',             d:'Küfür listesine yasaklı kelime ekler.',
        det:['Runtime\'da liste kelime ekler.','Bot yeniden başlayınca sıfırlanır.','Kalıcı için profanityFilter.js\'e ekle.','**İzin:** Sunucuyu Yönet'], al:['kelimeekle'], cd:'3sn' },

      { n:'removeword', u:'!removeword <kelime>',          d:'Küfür listesinden kelime çıkarır.',
        det:['Sadece runtime\'da eklenen kelimeler kaldırılabilir.','**İzin:** Sunucuyu Yönet'], al:['kelimesil'], cd:'3sn' },
    ],
  },

  otomod: {
    label: 'Otomod & Güvenlik', emoji: e.shield,
    desc:  'Otomatik koruma sistemleri hakkında bilgi',
    perms: 'moderator',
    cmds: [
      { n:'Anti-Spam',           u:'Otomatik (config.js)', d:'Spam tespit eder ve kademeli ceza uygular.',
        det:['Hız spam: 5sn içinde 5+ mesaj','Duplicate: Aynı mesajı 3+ kez','Mention spam: Tek mesajda 5+ mention','Caps: %70+ büyük harf','Ceza: uyarı → mute → kick → ban'], al:[], cd:'Otomatik' },

      { n:'Anti-Küfür',          u:'Otomatik (config.js)', d:'AI + kelime listesi ile küfür tespiti.',
        det:['100+ kelime listesi (Türkçe + İngilizce)','L33tspeak bypass önleme: s1k→sik','OpenAI AI Moderation (opsiyonel, ücretsiz)','Kademeli ceza: 3→2dk, 4→5dk, 5→15dk, 6→1sa, 7→6sa, 8→1g, 9+→ban'], al:[], cd:'Otomatik' },

      { n:'Anti-Link',           u:'Otomatik (config.js)', d:'İzinsiz link ve davet linklerini engeller.',
        det:['Whitelist dışı linkler silinir.','Discord davet linkleri engellenir.','Whitelist: discord.com, youtube, twitch vb.'], al:[], cd:'Otomatik' },

      { n:'Anti-Raid',           u:'Otomatik (config.js)', d:'Toplu katılım tespiti ve lockdown modu.',
        det:['10sn içinde 10+ üye → raid modu aktif','Yeni katılanlar otomatik atılır','10dk sonra otomatik kapanır'], al:[], cd:'Otomatik' },

      { n:'Ghost-Ping',          u:'Otomatik',             d:'Mention edip mesaj silmeyi tespit eder.',
        det:['Birini mention edip mesajı silen kişiyi loglar.','Kanalda bildirim gönderilir.'], al:[], cd:'Otomatik' },

      { n:'Hesap-Yaşı-Kontrolü', u:'Otomatik (config.js)', d:'7 günden yeni hesapları otomatik atar.',
        det:['Hesap yaşı config.js\'ten değiştirilebilir.','Kick edilen kişi loglanır.'], al:[], cd:'Otomatik' },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════
//  İZİN KONTROL
// ══════════════════════════════════════════════════════════════════════
function hasAccess(member, level) {
  if (!member) return level === 'everyone';
  if (member.id === member.guild?.ownerId) return true;
  if (member.id === config.ownerID)        return true;

  if (level === 'everyone') return true;

  if (level === 'moderator') {
    return (
      member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      (config.roles.moderator && member.roles.cache.has(config.roles.moderator)) ||
      (config.roles.admin     && member.roles.cache.has(config.roles.admin))
    );
  }

  if (level === 'admin') {
    return (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (config.roles.admin && member.roles.cache.has(config.roles.admin))
    );
  }

  return false;
}

function accessLabel(level) {
  return { everyone:'👥 Herkes', moderator:'👮 Moderatör+', admin:'⚙️ Admin+', owner:'👑 Owner' }[level] || level;
}

// ══════════════════════════════════════════════════════════════════════
//  EMBED BUILDER'LAR
// ══════════════════════════════════════════════════════════════════════
function mainEmbed(member, client, guild) {
  const visible   = Object.entries(CATS).filter(([, c]) => hasAccess(member, c.perms));
  const totalCmds = visible.reduce((a, [, c]) => a + c.cmds.length, 0);
  const isOwner   = member?.id === guild?.ownerId || member?.id === config.ownerID;
  const isAdmin   = hasAccess(member, 'admin');
  const isMod     = hasAccess(member, 'moderator');
  const badge     = isOwner ? '👑 Owner' : isAdmin ? '⚙️ Admin' : isMod ? '👮 Moderatör' : '👥 Üye';

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name:`${client.user.username} — Komut Merkezi`, iconURL: client.user.displayAvatarURL({ dynamic:true }) })
    .setThumbnail(client.user.displayAvatarURL({ dynamic:true, size:512 }))
    .setDescription(
      `> ${badge} olarak **${totalCmds}** komuta erişimin var.\n` +
      `> **Prefix:** \`${config.prefix}\`\n\n` +
      `Aşağıdaki **menüden bir kategori seç** → komut listesini gör.\n` +
      `Komut listesinden birini seç → **detaylı bilgi** al.`,
    )
    .addFields(
      visible.map(([, cat]) => ({
        name:   cat.label,
        value:  `> ${cat.desc}\n> **${cat.cmds.length}** komut · ${accessLabel(cat.perms)}`,
        inline: true,
      })),
    )
    .setFooter({ text:`${guild?.name || ''} • Prefix: ${config.prefix} • Aşağıdan kategori seç`, iconURL: guild?.iconURL({ dynamic:true }) || undefined })
    .setTimestamp();
}

function catEmbed(catKey, client, guild) {
  const cat = CATS[catKey];
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name:`${client.user.username} — ${cat.label}`, iconURL: client.user.displayAvatarURL({ dynamic:true }) })
    .setDescription(
      `> **${cat.label}**\n> ${cat.desc}\n> ${accessLabel(cat.perms)}\n\n` +
      `Aşağıdan bir komut seç — detaylı bilgi göster.`,
    )
    .addFields(
      cat.cmds.map(cmd => ({
        name:   `\`!${cmd.n}\``,
        value:  `> ${cmd.d}\n> **Kullanım:** \`${cmd.u}\``,
        inline: false,
      })),
    )
    .setFooter({ text:`${guild?.name || ''} • ${cat.cmds.length} komut`, iconURL: guild?.iconURL({ dynamic:true }) || undefined })
    .setTimestamp();
}

function cmdEmbed(catKey, cmdName, client, guild) {
  const cat = CATS[catKey];
  const cmd = cat?.cmds.find(c => c.n === cmdName);
  if (!cmd) return null;

  return new EmbedBuilder()
    .setColor(config.colors.blurple || config.colors.primary)
    .setAuthor({ name:`${client.user.username} — Komut Detayı`, iconURL: client.user.displayAvatarURL({ dynamic:true }) })
    .setTitle(`\`!${cmd.n}\` — ${cmd.d}`)
    .addFields(
      { name:'📋 Kullanım',        value:`\`\`\`${cmd.u}\`\`\``,                      inline:false },
      { name:'📖 Detay',           value: cmd.det.map(l => `> ${l}`).join('\n'),        inline:false },
      ...(cmd.al?.length ? [{ name:'🔤 Kısayollar', value: cmd.al.map(a=>`\`${config.prefix}${a}\``).join(' '), inline:true }] : []),
      { name:'⏱️ Cooldown',        value: cmd.cd || '3sn',                             inline:true  },
      { name:'📁 Kategori',        value: cat.label,                                   inline:true  },
    )
    .setFooter({ text:`${guild?.name || ''} • Geri dönmek için butona tıkla`, iconURL: guild?.iconURL({ dynamic:true }) || undefined })
    .setTimestamp();
}

// ══════════════════════════════════════════════════════════════════════
//  SELECT MENÜ / BUTON BUILDER'LAR
// ══════════════════════════════════════════════════════════════════════
function buildCatSelect(member) {
  const visible = Object.entries(CATS).filter(([, c]) => hasAccess(member, c.perms));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_cat')
      .setPlaceholder('📂 Kategori seç...')
      .addOptions(
        visible.map(([key, cat]) => {
          const opt = new StringSelectMenuOptionBuilder()
            .setValue(`cat:${key}`)
            .setLabel(cat.label)
            .setDescription(cat.desc.slice(0, 100));

          // Custom emoji parse et
          const parsed = pe(cat.emoji);
          if (parsed && typeof parsed === 'object') opt.setEmoji(parsed);
          else if (parsed) opt.setEmoji(parsed);

          return opt;
        }),
      ),
  );
}

function buildCmdSelect(catKey) {
  const cat  = CATS[catKey];
  const cmds = cat.cmds.slice(0, 25);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_cmd')
      .setPlaceholder('🔍 Komut seç...')
      .addOptions(
        cmds.map(cmd =>
          new StringSelectMenuOptionBuilder()
            .setValue(`cmd:${catKey}:${cmd.n}`)
            .setLabel(`!${cmd.n}`)
            .setDescription(cmd.d.slice(0, 100)),
        ),
      ),
  );
}

function navRow(showBack, showHome) {
  const btns = [];
  if (showHome) btns.push(
    new ButtonBuilder().setCustomId('help_home').setLabel('Ana Menü').setEmoji(pe(e.home) || '🏠').setStyle(ButtonStyle.Primary),
  );
  if (showBack) btns.push(
    new ButtonBuilder().setCustomId('help_back').setLabel('Geri').setEmoji(pe(e.back) || '🔙').setStyle(ButtonStyle.Secondary),
  );
  btns.push(
    new ButtonBuilder().setCustomId('help_close').setLabel('Kapat').setEmoji(pe(e.stop) || '⏹️').setStyle(ButtonStyle.Danger),
  );
  return new ActionRowBuilder().addComponents(btns);
}

function closeRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_close').setLabel('Kapat').setEmoji(pe(e.stop) || '⏹️').setStyle(ButtonStyle.Danger),
  );
}

// ══════════════════════════════════════════════════════════════════════
//  KOMUT EXPORT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
  name: 'help',
  aliases: ['yardım', 'h', 'komutlar', 'menu'],
  description: 'İnteraktif, 3 seviyeli yardım menüsü.',
  usage: '!help [komut adı]',
  category: 'utility',
  cooldown: 5000,

  async execute(message, args, client) {
    const member = message.member;

    // Direkt komut arama: !help ban
    if (args[0]) {
      const q = args[0].toLowerCase().replace(/^!/, '');
      for (const [catKey, cat] of Object.entries(CATS)) {
        const found = cat.cmds.find(c => c.n === q || c.al?.includes(q));
        if (found) {
          return message.reply({
            embeds: [cmdEmbed(catKey, found.n, client, message.guild)],
            components: [closeRow()],
          });
        }
      }
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${e.error} \`!${q}\` komutu bulunamadı.\n\`!help\` ile kategorilere göz at.`)],
      });
    }

    // Ana menü
    const msg = await message.reply({
      embeds: [mainEmbed(member, client, message.guild)],
      components: [buildCatSelect(member), closeRow()],
    });

    let currentCat = null;

    const col = msg.createMessageComponentCollector({ time: 8 * 60 * 1000 });

    col.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: `${e.error} Bu menü **${message.author.tag}** tarafından açıldı!`, flags: 64 });
      }

      const id  = i.customId;
      const val = i.values?.[0];

      // Kapat
      if (id === 'help_close') {
        await msg.edit({ components: [] }).catch(() => null);
        return i.reply({ content: `${e.success} Menü kapatıldı.`, flags: 64 });
      }

      // Ana menü
      if (id === 'help_home') {
        currentCat = null;
        return i.update({
          embeds: [mainEmbed(member, client, message.guild)],
          components: [buildCatSelect(member), closeRow()],
        });
      }

      // Geri
      if (id === 'help_back') {
        if (currentCat) {
          return i.update({
            embeds: [catEmbed(currentCat, client, message.guild)],
            components: [buildCmdSelect(currentCat), navRow(false, true)],
          });
        }
        currentCat = null;
        return i.update({
          embeds: [mainEmbed(member, client, message.guild)],
          components: [buildCatSelect(member), closeRow()],
        });
      }

      // Kategori seçildi
      if (id === 'help_cat' && val?.startsWith('cat:')) {
        const catKey = val.replace('cat:', '');
        if (!CATS[catKey] || !hasAccess(member, CATS[catKey].perms)) {
          return i.reply({ content: `${e.error} Bu kategoriye erişim izniniz yok.`, flags: 64 });
        }
        currentCat = catKey;
        return i.update({
          embeds: [catEmbed(catKey, client, message.guild)],
          components: [buildCmdSelect(catKey), navRow(false, true)],
        });
      }

      // Komut seçildi
      if (id === 'help_cmd' && val?.startsWith('cmd:')) {
        const [, catKey, cmdName] = val.split(':');
        const embed = cmdEmbed(catKey, cmdName, client, message.guild);
        if (!embed) return;
        return i.update({
          embeds: [embed],
          components: [navRow(true, true)],
        });
      }
    });

    col.on('end', () => msg.edit({ components: [] }).catch(() => null));
  },
};
