// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                        MODBOT — AYARLAR                             ║
// ║              Tüm ayarları buradan yapılandırabilirsin               ║
// ╚═══════════════════════════════════════════════════════════════════════╝

module.exports = {

  // ════════════════════════════════════════════════════════
  //  TEMEL AYARLAR
  // ════════════════════════════════════════════════════════
  prefix:  process.env.PREFIX   || '!',
  ownerID: process.env.OWNER_ID || '',

  // Bot ismini buradan özelleştir
  botName: 'ModBot',

  // ════════════════════════════════════════════════════════
  //  RENK PALETİ
  // ════════════════════════════════════════════════════════
  colors: {
    primary:   0x5865F2,  // Discord Blurple
    success:   0x2ECC71,  // Canlı yeşil
    error:     0xE74C3C,  // Canlı kırmızı
    warning:   0xF39C12,  // Turuncu-sarı
    info:      0x3498DB,  // Mavi
    modlog:    0x9B59B6,  // Mor — mod log başlıkları
    ban:       0xC0392B,  // Koyu kırmızı
    kick:      0xE67E22,  // Turuncu
    mute:      0xF1C40F,  // Sarı
    warn:      0xE74C3C,  // Kırmızı
    unban:     0x2ECC71,  // Yeşil
    timeout:   0xE67E22,  // Turuncu
    join:      0x1ABC9C,  // Teal
    leave:     0xE74C3C,  // Kırmızı
    log:       0x95A5A6,  // Gri
    ticket:    0x5865F2,  // Blurple
    ticketOpen:   0x2ECC71,
    ticketClose:  0xE74C3C,
    ticketClaim:  0x3498DB,
    dark:      0x2B2D31,
    gold:      0xF1C40F,
    blurple:   0x5865F2,
    // Gradient benzeri çift ton
    automod:   0xFF6B6B,  // Anti-spam/küfür logları
    raid:      0xFF0000,  // Anti-raid logları
    ghost:     0x95A5A6,  // Ghost ping logları
  },

  // ════════════════════════════════════════════════════════
  //  KANAL ID'LERİ  (mevcut ID'ler korundu)
  // ════════════════════════════════════════════════════════
  channels: {
    // ── Log Kanalları ──
    modLog:         '1556039145770717284',  // Moderasyon işlemleri (ban/kick/mute/warn)
    messageLog:     '1556039277597429780',  // Mesaj silme & düzenleme logları
    memberLog:      '1556039511476273232',  // Üye giriş/çıkış logları
    serverLog:      '1556039572910112869',  // Sunucu ayar değişiklikleri
    voiceLog:       '1556039668896628736',  // Ses kanalı hareketleri
    roleLog:        '1556039760026411018',  // Rol değişiklikleri
    joinLog:        '1556039858529632276',  // Yeni üye katılım (hoşgeldin)
    leaveLog:       '1556039905715425390',  // Üye ayrılma
    botLog:         '1556041042430529537',  // Bot açılma/kapanma
    spamLog:        '1556041108276903936',  // Spam tespiti
    automodLog:     '1556041163776073748',  // Otomod (küfür/link/raid)

    // ── Ticket ──
    ticketCategory: '1556042803992330400',  // Ticket kanallarının oluşturulacağı kategori
    ticketLog:      '1556041280201687040',  // Ticket işlem logları
    ticketPanel:    '',                      // !ticket setup buraya gönderir (boş bırakırsan komutun kullanıldığı kanala gönderilir)
    ticketTranscript: '1556041280201687040',                    // Transcript dosyaları buraya gönderilir

    // ── Hoşgeldin/Güle Güle ──
    welcomeChannel: '1556041365513707631',  // Hoşgeldin embed mesajı
    leaveChannel:   '1556041417275740250',  // Güle güle embed mesajı

    // ── Yeni Eklenenler ──
    suggestionChannel: '',   // Öneri sistemi için kanal
    reportChannel:     '',   // Üye şikayet kanalı
    staffLog:          '',   // Sadece yetkililerin göreceği özel log
    joinGate:          '',   // Giriş doğrulama kanalı
    announcements:     '',   // Duyuru kanalı (announce komutu)
    rules:             '',   // Kurallar kanalı
  },

  // ════════════════════════════════════════════════════════
  //  ROL ID'LERİ  (mevcut ID'ler korundu)
  // ════════════════════════════════════════════════════════
  roles: {
    admin:      '1553325787719933952',  // Admin rolü
    moderator:  '1553117362092380294',  // Moderatör rolü
    helper:     '1556016756206600282',  // Yardımcı rolü
    muted:      '1556043194133774406',  // Susturulmuş (Muted) rolü
    autoRole:   '1553167045871276224',  // Sunucuya girince otomatik verilir
    memberRole: '',  // Doğrulanmış üye rolü
    botRole:    '1553167652598448239',  // Botlara otomatik verilir
    booster:    '1556015274866512035',  // Server Booster rolü

    // ── Yeni Eklenenler ──
    ticketSupport: '',   // Ticket destek ekibi rolü (boş = moderatör)
    vip:           '',   // VIP üye rolü
    unverified:    '',   // Doğrulanmamış üye rolü
  },

  // ════════════════════════════════════════════════════════
  //  UYARI SİSTEMİ
  // ════════════════════════════════════════════════════════
  warnings: {
    thresholds: {
      // ── İlk 3: sadece uyarı ──
      1:  { action: 'warn', duration: null, reason: '1. uyarı → Sadece uyarı' },
      2:  { action: 'warn', duration: null, reason: '2. uyarı → Sadece uyarı' },
      3:  { action: 'warn', duration: null, reason: '3. uyarı → Sadece uyarı' },

      // ── 27 mute: 5 dk → 20 dk, kademeli ──
      4:  { action: 'mute', duration: 5  * 60 * 1000, reason: '4. uyarı → 5dk mute' },
      5:  { action: 'mute', duration: 6  * 60 * 1000, reason: '5. uyarı → 6dk mute' },
      6:  { action: 'mute', duration: 6  * 60 * 1000, reason: '6. uyarı → 6dk mute' },
      7:  { action: 'mute', duration: 7  * 60 * 1000, reason: '7. uyarı → 7dk mute' },
      8:  { action: 'mute', duration: 7  * 60 * 1000, reason: '8. uyarı → 7dk mute' },
      9:  { action: 'mute', duration: 8  * 60 * 1000, reason: '9. uyarı → 8dk mute' },
      10: { action: 'mute', duration: 8  * 60 * 1000, reason: '10. uyarı → 8dk mute' },
      11: { action: 'mute', duration: 9  * 60 * 1000, reason: '11. uyarı → 9dk mute' },
      12: { action: 'mute', duration: 10 * 60 * 1000, reason: '12. uyarı → 10dk mute' },
      13: { action: 'mute', duration: 10 * 60 * 1000, reason: '13. uyarı → 10dk mute' },
      14: { action: 'mute', duration: 11 * 60 * 1000, reason: '14. uyarı → 11dk mute' },
      15: { action: 'mute', duration: 11 * 60 * 1000, reason: '15. uyarı → 11dk mute' },
      16: { action: 'mute', duration: 12 * 60 * 1000, reason: '16. uyarı → 12dk mute' },
      17: { action: 'mute', duration: 13 * 60 * 1000, reason: '17. uyarı → 13dk mute' },
      18: { action: 'mute', duration: 13 * 60 * 1000, reason: '18. uyarı → 13dk mute' },
      19: { action: 'mute', duration: 14 * 60 * 1000, reason: '19. uyarı → 14dk mute' },
      20: { action: 'mute', duration: 14 * 60 * 1000, reason: '20. uyarı → 14dk mute' },
      21: { action: 'mute', duration: 15 * 60 * 1000, reason: '21. uyarı → 15dk mute' },
      22: { action: 'mute', duration: 15 * 60 * 1000, reason: '22. uyarı → 15dk mute' },
      23: { action: 'mute', duration: 16 * 60 * 1000, reason: '23. uyarı → 16dk mute' },
      24: { action: 'mute', duration: 17 * 60 * 1000, reason: '24. uyarı → 17dk mute' },
      25: { action: 'mute', duration: 17 * 60 * 1000, reason: '25. uyarı → 17dk mute' },
      26: { action: 'mute', duration: 18 * 60 * 1000, reason: '26. uyarı → 18dk mute' },
      27: { action: 'mute', duration: 18 * 60 * 1000, reason: '27. uyarı → 18dk mute' },
      28: { action: 'mute', duration: 19 * 60 * 1000, reason: '28. uyarı → 19dk mute' },
      29: { action: 'mute', duration: 19 * 60 * 1000, reason: '29. uyarı → 19dk mute' },
      30: { action: 'mute', duration: 20 * 60 * 1000, reason: '30. uyarı → 20dk mute' },
    },
    expireTime: 30 * 24 * 60 * 60 * 1000, // 30 gün sonra silinir
    // Uyarı DM bildirimi
    dmOnWarn: true,
  },

  // ════════════════════════════════════════════════════════
  //  SPAM KORUMA
  // ════════════════════════════════════════════════════════
  antiSpam: {
    enabled:         true,
    messageLimit:    5,      // X mesaj
    timeWindow:      5000,   // Y ms içinde → spam
    duplicateLimit:  3,      // Aynı mesajı X kez tekrar
    duplicateWindow: 10000,
    mentionLimit:    5,      // Tek mesajda max mention
    capsLimit:       70,     // % büyük harf limiti
    capsMinLength:   15,     // Min karakter uzunluğu kontrol
    // Kademeli ceza
    punishments: {
      // ── İlk 3: mute yok ──
      1:  { action: 'delete', reason: 'Otomatik — Spam tespit (mesaj silindi)' },
      2:  { action: 'warn',   reason: 'Otomatik — Tekrar spam (uyarı)' },
      3:  { action: 'warn',   reason: 'Otomatik — 3. spam (uyarı)' },

      // ── 27 mute: 5 dk → 20 dk, kademeli ──
      4:  { action: 'mute', duration: 5  * 60 * 1000, reason: 'Otomatik — 4. spam (5dk mute)' },
      5:  { action: 'mute', duration: 6  * 60 * 1000, reason: 'Otomatik — 5. spam (6dk mute)' },
      6:  { action: 'mute', duration: 6  * 60 * 1000, reason: 'Otomatik — 6. spam (6dk mute)' },
      7:  { action: 'mute', duration: 7  * 60 * 1000, reason: 'Otomatik — 7. spam (7dk mute)' },
      8:  { action: 'mute', duration: 7  * 60 * 1000, reason: 'Otomatik — 8. spam (7dk mute)' },
      9:  { action: 'mute', duration: 8  * 60 * 1000, reason: 'Otomatik — 9. spam (8dk mute)' },
      10: { action: 'mute', duration: 8  * 60 * 1000, reason: 'Otomatik — 10. spam (8dk mute)' },
      11: { action: 'mute', duration: 9  * 60 * 1000, reason: 'Otomatik — 11. spam (9dk mute)' },
      12: { action: 'mute', duration: 10 * 60 * 1000, reason: 'Otomatik — 12. spam (10dk mute)' },
      13: { action: 'mute', duration: 10 * 60 * 1000, reason: 'Otomatik — 13. spam (10dk mute)' },
      14: { action: 'mute', duration: 11 * 60 * 1000, reason: 'Otomatik — 14. spam (11dk mute)' },
      15: { action: 'mute', duration: 11 * 60 * 1000, reason: 'Otomatik — 15. spam (11dk mute)' },
      16: { action: 'mute', duration: 12 * 60 * 1000, reason: 'Otomatik — 16. spam (12dk mute)' },
      17: { action: 'mute', duration: 13 * 60 * 1000, reason: 'Otomatik — 17. spam (13dk mute)' },
      18: { action: 'mute', duration: 13 * 60 * 1000, reason: 'Otomatik — 18. spam (13dk mute)' },
      19: { action: 'mute', duration: 14 * 60 * 1000, reason: 'Otomatik — 19. spam (14dk mute)' },
      20: { action: 'mute', duration: 14 * 60 * 1000, reason: 'Otomatik — 20. spam (14dk mute)' },
      21: { action: 'mute', duration: 15 * 60 * 1000, reason: 'Otomatik — 21. spam (15dk mute)' },
      22: { action: 'mute', duration: 15 * 60 * 1000, reason: 'Otomatik — 22. spam (15dk mute)' },
      23: { action: 'mute', duration: 16 * 60 * 1000, reason: 'Otomatik — 23. spam (16dk mute)' },
      24: { action: 'mute', duration: 17 * 60 * 1000, reason: 'Otomatik — 24. spam (17dk mute)' },
      25: { action: 'mute', duration: 17 * 60 * 1000, reason: 'Otomatik — 25. spam (17dk mute)' },
      26: { action: 'mute', duration: 18 * 60 * 1000, reason: 'Otomatik — 26. spam (18dk mute)' },
      27: { action: 'mute', duration: 18 * 60 * 1000, reason: 'Otomatik — 27. spam (18dk mute)' },
      28: { action: 'mute', duration: 19 * 60 * 1000, reason: 'Otomatik — 28. spam (19dk mute)' },
      29: { action: 'mute', duration: 19 * 60 * 1000, reason: 'Otomatik — 29. spam (19dk mute)' },
      30: { action: 'mute', duration: 20 * 60 * 1000, reason: 'Otomatik — 30. spam (20dk mute)' },
    },
    exemptRoles:    [],
    exemptChannels: [],
  },
  // ════════════════════════════════════════════════════════
  //  KÜFÜR / KELİME FİLTRESİ
  // ════════════════════════════════════════════════════════
  wordFilter: {
    enabled: true,

    // ── Ek yasaklı kelimeler (profanityFilter.js zaten kapsamlı liste içeriyor) ──
    // Buraya sadece listede OLMAYAN özel kelimeleri ekle:
    extraBannedWords: [],

    // Kaç ihlal sonrası ne yapılsın
    action:         'delete_and_warn', // delete_only | delete_and_warn | delete_warn_mute
    warnBeforeMute: 3,                 // 3. ihlalde timeout başlar
    // ── Kademeli Ceza Sistemi ──────────────────────────────────────────
    // İhlal sayısına göre timeout süresi artar
    mutePunishments: {
      3: 2  * 60 * 1000,   // 3. ihlal → 2 dakika
      4: 5  * 60 * 1000,   // 4. ihlal → 5 dakika
      5: 15 * 60 * 1000,   // 5. ihlal → 15 dakika
      6: 60 * 60 * 1000,   // 6. ihlal → 1 saat
      7: 6  * 60 * 60 * 1000, // 7. ihlal → 6 saat
      8: 24 * 60 * 60 * 1000, // 8. ihlal → 1 gün
    },
    // 9+ ihlalde otomatik ban
    banAfter: 9,
    logDetections:  true,              // Her tespiti automodLog'a yaz
    dmUser:         true,              // Kullanıcıya DM bildir
    useRegex:       true,              // l33tspeak / bypass önleme (normalizer)
    exemptRoles:    [],                // Bu rollere sahipler muaf
    exemptChannels: [],                // Bu kanallar muaf (örn: küfür-serbest)

    // ── AI MODERATION (OpenAI - Tamamen Ücretsiz!) ────────────────────
    // Açmak için .env dosyasında:
    //   OPENAI_API_KEY=sk-...
    //   OPENAI_MODERATION_ENABLED=true
    ai: {
      enabled:   process.env.OPENAI_MODERATION_ENABLED === 'true',
      apiKey:    process.env.OPENAI_API_KEY || '',
      // Hassasiyet (0.0-1.0): yüksek = daha az yanlış alarm
      threshold: parseFloat(process.env.OPENAI_THRESHOLD || '0.75'),
      // Hangi AI kategorileri engelleme tetiklesin
      blockCategories: [
        'hate',
        'hate/threatening',
        'harassment',
        'harassment/threatening',
        'sexual',
        'sexual/minors',
        'violence',
        'violence/graphic',
        'self-harm',
        'self-harm/intent',
        'illicit',
        'illicit/violent',
      ],
    },
  },

  // ════════════════════════════════════════════════════════
  //  LINK KORUMA
  // ════════════════════════════════════════════════════════
  antiLink: {
    enabled:       true,
    blockInvites:  true,
    whitelist: [
      // ── Discord ──────────────────────────────────────────
      'discord.com','discordapp.com',

      // ── Video / Müzik ────────────────────────────────────
      'youtube.com','youtu.be',
      'twitch.tv',
      'spotify.com','soundcloud.com',

      // ── GIF Platformları (En Popülerler) ─────────────────
      'giphy.com',      // Dünyanın en büyük GIF kütüphanesi
      'tenor.com',      // Google'ın GIF platformu, Discord'da yerleşik
      'imgur.com',      // En büyük resim/GIF barındırma servisi
      'klipy.com',      // Kırp/GIF (eski adı: Kikliko), sesli GIF desteği
      'gfycat.com',     // Yüksek kaliteli, akıcı GIF'ler
      'reddit.com',     // r/gifs ve r/reactiongifs gibi devasa topluluklar
      'pinterest.com',  // Görsel keşif ve GIF koleksiyonları
      'tumblr.com',     // GIF kültürünün doğduğu yer

      // ── Ek GIF Siteleri ──────────────────────────────────
      'gifbin.com',     // Basit ve hızlı GIF kataloğu
      'gifer.com',      // GIF arama motoru
      'coub.com',       // Döngüsel video/GIF platformu
      'gifbox.com',     // GIF barındırma ve paylaşım
      'gifzz.com',      // GIF kütüphanesi
      'ezgif.com',      // Online GIF düzenleme ve barındırma
      'reactiongifs.com', // Tepki GIF'leri
      'pixabay.com',    // Telifsiz stok görsel ve GIF
    ],
    action:         'delete_and_warn',
    logDetections:  true,
    exemptRoles:    [],
    exemptChannels: [],
  },

  // ════════════════════════════════════════════════════════
  //  RAID KORUMA
  // ════════════════════════════════════════════════════════
  antiRaid: {
    enabled:          true,
    joinLimit:        10,
    joinWindow:       10000,
    action:           'lockdown',
    lockdownDuration: 10 * 60 * 1000,
    newJoinAction:    'kick',
    accountAge:       7 * 24 * 60 * 60 * 1000, // 7 gün
    accountAgeAction: 'kick',
    // Raid tespitinde yetkililere DM at
    notifyOwner: true,
  },

  // ════════════════════════════════════════════════════════
  //  HOŞGELDİN / GÜLE GÜLE
  // ════════════════════════════════════════════════════════
  welcome: {
    enabled:    true,
    message:    '{user} sunucumuza hoş geldin! Sen **{memberCount}**. üyemizsin.',
    useEmbed:   true,
    embedColor: 0x1ABC9C,
    sendDM:     true,
    dmMessage:  '**{server}** sunucusuna hoş geldin! Lütfen kuralları oku.',
    // Hoşgeldin görselini göster (sunucunun bannerı varsa)
    showBanner: true,
  },

  leave: {
    enabled:    true,
    message:    '**{username}** sunucudan ayrıldı. Kalan üye: **{memberCount}**',
    useEmbed:   true,
    embedColor: 0xE74C3C,
  },

  // ════════════════════════════════════════════════════════
  //  TİCKET SİSTEMİ
  // ════════════════════════════════════════════════════════
  ticket: {
    enabled:          true,
    nameFormat:       'destek-{username}',
    maxTicketsPerUser: 1,
    // Ticket açılınca karşılama mesajı
    welcomeMessage:   'Merhaba {user}! 👋\nDestek ekibimiz en kısa sürede seninle ilgilenecek.\n\nLütfen sorununu **detaylıca** anlat.',
    // Ticket tiplerini aç
    types: [
      { id: 'genel',    label: 'Genel Destek',   emoji: '💬', description: 'Genel sorular ve yardım',    color: 0x5865F2 },
      { id: 'sikayet',  label: 'Üye Şikayeti',   emoji: '🚨', description: 'Bir üyeyi şikayet et',       color: 0xE74C3C },
      { id: 'oneri',    label: 'Öneri',           emoji: '💡', description: 'Sunucu önerin var mı?',      color: 0xF1C40F },
      { id: 'ceza',     label: 'Ceza İtirazı',    emoji: '⚖️', description: 'Haksız ceza aldın mı?',     color: 0xE67E22 },
      { id: 'other',    label: 'Diğer',           emoji: '📋', description: 'Diğer konular',              color: 0x95A5A6 },
    ],
    // Ticket kapanınca transcript kaydet
    saveTranscript:   true,
    // Kapatma onay butonu
    closeConfirm:     true,
    // Çözüm değerlendirmesi sor
    askRating:        true,
    // Support roller (boş = moderator rolü)
    supportRoles:     [],
    // Ticket ping (açılınca bu rolleri ping at)
    pingRoles:        [],
  },

  // ════════════════════════════════════════════════════════
  //  COOLDOWN
  // ════════════════════════════════════════════════════════
  cooldowns: {
    default:    3000,
    moderation: 2000,
    info:       5000,
    ticket:     10000,
  },

  // ════════════════════════════════════════════════════════
  //  LOG AYARLARI
  // ════════════════════════════════════════════════════════
  logging: {
    messageDelete:    true,
    messageEdit:      true,
    memberJoin:       true,
    memberLeave:      true,
    memberBan:        true,
    memberUnban:      true,
    memberKick:       true,
    memberMute:       true,
    memberUnmute:     true,
    memberWarn:       true,
    memberTimeout:    true,
    roleCreate:       true,
    roleDelete:       true,
    roleUpdate:       true,
    roleGiven:        true,
    roleTaken:        true,
    channelCreate:    true,
    channelDelete:    true,
    channelUpdate:    true,
    voiceJoin:        true,
    voiceLeave:       true,
    voiceMove:        true,
    inviteCreate:     true,
    inviteDelete:     true,
    emojiCreate:      true,
    emojiDelete:      true,
    guildUpdate:      true,
    webhookUpdate:    true,
    integrationCreate: true,
    integrationDelete: true,
    reactionAdd:      true,
    reactionRemove:   true,
    nicknameChange:   true,
    permissionUpdate: true,
    botStartup:       true,
    botShutdown:      true,
    // Ghost ping tespiti
    ghostPing:        true,
  },

  // ════════════════════════════════════════════════════════
  //  İSTATİSTİK KANALLARI (statssetup komutuyla oluşturulur)
  // ════════════════════════════════════════════════════════
  statChannels: {
    enabled:             false,   // true yap ve aşağıya kanal ID'lerini ekle
    totalMembersChannel: '',      // 👥 Toplam Üye: X
    humansChannel:       '',      // 👤 Üye: X
    botsChannel:         '',      // 🤖 Bot: X
    channelsChannel:     '',      // 📢 Kanal: X
    rolesChannel:        '',      // 🎭 Rol: X
    boostsChannel:       '',      // 💎 Boost: X
    onlineChannel:       '',      // 🟢 Çevrimiçi: X
    // Format etiketleri ({count} = sayı olarak değiştirilir)
    totalMembersLabel:   '👥 Toplam Üye: {count}',
    humansLabel:         '👤 Üye: {count}',
    botsLabel:           '🤖 Bot: {count}',
    channelsLabel:       '📢 Kanal: {count}',
    rolesLabel:          '🎭 Rol: {count}',
    boostsLabel:         '💎 Boost: {count}',
    onlineLabel:         '🟢 Çevrimiçi: {count}',
  },

  // ════════════════════════════════════════════════════════
  //  DAVET TAKİP SİSTEMİ
  // ════════════════════════════════════════════════════════
  inviteTracker: {
    enabled: true,      // Davet takibini aktif et
    logJoins: true,     // Üye katılınca "X, Y'nin daveti ile geldi" logla
  },

  // ════════════════════════════════════════════════════════
  //  BOT DURUM MESAJLARI
  // ════════════════════════════════════════════════════════
  statusMessages: [
    { type: 'WATCHING',  text: '{memberCount} üyeyi koruyorum' },
    { type: 'PLAYING',   text: '!help | ModBot v2' },
    { type: 'WATCHING',  text: '{serverCount} sunucuyu' },
    { type: 'LISTENING', text: '!help komutuna' },
    { type: 'PLAYING',   text: 'Spam ile savaşıyorum ⚔️' },
  ],
  statusInterval: 3, // dakika

};
