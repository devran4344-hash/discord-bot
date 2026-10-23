// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                        MODBOT — AYARLAR                             ║
// ║  Sadece buraya ID'leri yaz, başka bir şey yapma gerek yok           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

module.exports = {
  prefix:  '!',
  ownerID: '1160564359727173792',
  botName: 'ModBot',

  colors: {
    primary:      0x5865F2,
    success:      0x2ECC71,
    error:        0xE74C3C,
    warning:      0xF39C12,
    info:         0x3498DB,
    modlog:       0x9B59B6,
    ban:          0xC0392B,
    kick:         0xE67E22,
    mute:         0xF1C40F,
    warn:         0xE74C3C,
    unban:        0x2ECC71,
    timeout:      0xE67E22,
    join:         0x1ABC9C,
    leave:        0xE74C3C,
    log:          0x95A5A6,
    ticket:       0x5865F2,
    ticketOpen:   0x2ECC71,
    ticketClose:  0xE74C3C,
    ticketClaim:  0x3498DB,
    dark:         0x2B2D31,
    gold:         0xF1C40F,
    blurple:      0x5865F2,
    automod:      0xFF6B6B,
    raid:         0xFF0000,
    ghost:        0x95A5A6,
  },

  // ════════════════════════════════════════════════════════════════
  //  KANALLAR
  //  Discord'da Geliştirici Modu açık olmalı:
  //  Ayarlar → Gelişmiş → Geliştirici Modu → Açık
  //  Sonra kanala sağ tıkla → "ID'yi Kopyala"
  // ════════════════════════════════════════════════════════════════
  channels: {
    modLog:           '1556039145770717284',  // Ban/kick/mute logları
    messageLog:       '1556039277597429780',  // Mesaj silme/düzenleme logları
    memberLog:        '1556039511476273232',  // Üye giriş/çıkış logları
    serverLog:        '1556039572910112869',  // Sunucu ayar logları
    voiceLog:         '1556039668896628736',  // Ses kanalı logları
    roleLog:          '1556039760026411018',  // Rol değişikliği logları
    joinLog:          '1556039858529632276',  // Giriş logları
    leaveLog:         '1556039905715425390',  // Çıkış logları
    botLog:           '1556041042430529537',  // Bot başlatma/kapanma
    spamLog:          '1556041108276903936',  // Spam logları
    automodLog:       '1556041163776073748',  // Otomod logları
    ticketCategory:   '1556042803992330400',  // Ticket kanallarının kategorisi (KATEGORİ ID'Sİ)
    ticketLog:        '1556041280201687040',  // Ticket logları
    ticketPanel:      '',                     // !ticket komutu buraya panel gönderir
    ticketTranscript: '1556041280201687040',  // Transcript dosyaları buraya gönderilir
    welcomeChannel:   '1556041365513707631',  // Hoşgeldin mesajı kanalı
    leaveChannel:     '1556041417275740250',  // Güle güle mesajı kanalı
    suggestionChannel:'',                     // Öneri kanalı (boş bırakabilirsin)
    reportChannel:    '',                     // /report komutu buraya gönderir
    staffLog:         '',                     // Yetkili log kanalı (boş bırakabilirsin)
    joinGate:         '',                     // Giriş kapısı (boş bırakabilirsin)
    announcements:    '',                     // Duyuru kanalı (boş bırakabilirsin)
    rules:            '',                     // Kurallar kanalı (boş bırakabilirsin)
  },

  // ════════════════════════════════════════════════════════════════
  //  ROLLER
  //  Role sağ tıkla → "ID'yi Kopyala"
  // ════════════════════════════════════════════════════════════════
  roles: {
    admin:         '1553325787719933952',  // Admin rolü
    moderator:     '1553117362092380294',  // Moderatör rolü
    helper:        '1556016756206600282',  // Yardımcı rolü
    muted:         '1556043194133774406',  // Muted rolü
    autoRole:      '',                     // Otomatik üye rolü (kapatıldı, boş bırak)
    botRole:       '1553167652598448239',  // Botlara verilecek rol
    booster:       '1556015274866512035',  // Server booster rolü
    ticketSupport: '',                     // Ticket destek rolü (boş bırakabilirsin)
    vip:           '',                     // VIP rolü (boş bırakabilirsin)
    unverified:    '',                     // Doğrulanmamış rolü (boş bırakabilirsin)
  },

  // ════════════════════════════════════════════════════════════════
  //  UYARI SİSTEMİ
  // ════════════════════════════════════════════════════════════════
  warnings: {
    thresholds: {
      1:  { action: 'warn', duration: null,            reason: '1. uyarı' },
      2:  { action: 'warn', duration: null,            reason: '2. uyarı' },
      3:  { action: 'warn', duration: null,            reason: '3. uyarı' },
      4:  { action: 'mute', duration:  5 * 60 * 1000, reason: '4. uyarı → 5dk mute' },
      5:  { action: 'mute', duration:  6 * 60 * 1000, reason: '5. uyarı → 6dk mute' },
      6:  { action: 'mute', duration:  6 * 60 * 1000, reason: '6. uyarı → 6dk mute' },
      7:  { action: 'mute', duration:  7 * 60 * 1000, reason: '7. uyarı → 7dk mute' },
      8:  { action: 'mute', duration:  7 * 60 * 1000, reason: '8. uyarı → 7dk mute' },
      9:  { action: 'mute', duration:  8 * 60 * 1000, reason: '9. uyarı → 8dk mute' },
      10: { action: 'mute', duration:  8 * 60 * 1000, reason: '10. uyarı → 8dk mute' },
      11: { action: 'mute', duration:  9 * 60 * 1000, reason: '11. uyarı → 9dk mute' },
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
    expireTime: 30 * 24 * 60 * 60 * 1000,
    dmOnWarn:   true,
  },

  // ════════════════════════════════════════════════════════════════
  //  ANTİ SPAM
  // ════════════════════════════════════════════════════════════════
  antiSpam: {
    enabled:         true,
    messageLimit:    5,
    timeWindow:      5000,
    duplicateLimit:  3,
    duplicateWindow: 10000,
    mentionLimit:    5,
    capsLimit:       70,
    capsMinLength:   15,
    punishments: {
      1:  { action: 'delete', reason: 'Spam (mesaj silindi)' },
      2:  { action: 'warn',   reason: 'Tekrar spam (uyarı)' },
      3:  { action: 'warn',   reason: '3. spam (uyarı)' },
      4:  { action: 'mute', duration:  5 * 60 * 1000, reason: '4. spam (5dk)' },
      5:  { action: 'mute', duration:  6 * 60 * 1000, reason: '5. spam (6dk)' },
      6:  { action: 'mute', duration:  6 * 60 * 1000, reason: '6. spam (6dk)' },
      7:  { action: 'mute', duration:  7 * 60 * 1000, reason: '7. spam (7dk)' },
      8:  { action: 'mute', duration:  7 * 60 * 1000, reason: '8. spam (7dk)' },
      9:  { action: 'mute', duration:  8 * 60 * 1000, reason: '9. spam (8dk)' },
      10: { action: 'mute', duration:  8 * 60 * 1000, reason: '10. spam (8dk)' },
      11: { action: 'mute', duration:  9 * 60 * 1000, reason: '11. spam (9dk)' },
      12: { action: 'mute', duration: 10 * 60 * 1000, reason: '12. spam (10dk)' },
      13: { action: 'mute', duration: 10 * 60 * 1000, reason: '13. spam (10dk)' },
      14: { action: 'mute', duration: 11 * 60 * 1000, reason: '14. spam (11dk)' },
      15: { action: 'mute', duration: 11 * 60 * 1000, reason: '15. spam (11dk)' },
      16: { action: 'mute', duration: 12 * 60 * 1000, reason: '16. spam (12dk)' },
      17: { action: 'mute', duration: 13 * 60 * 1000, reason: '17. spam (13dk)' },
      18: { action: 'mute', duration: 13 * 60 * 1000, reason: '18. spam (13dk)' },
      19: { action: 'mute', duration: 14 * 60 * 1000, reason: '19. spam (14dk)' },
      20: { action: 'mute', duration: 14 * 60 * 1000, reason: '20. spam (14dk)' },
      21: { action: 'mute', duration: 15 * 60 * 1000, reason: '21. spam (15dk)' },
      22: { action: 'mute', duration: 15 * 60 * 1000, reason: '22. spam (15dk)' },
      23: { action: 'mute', duration: 16 * 60 * 1000, reason: '23. spam (16dk)' },
      24: { action: 'mute', duration: 17 * 60 * 1000, reason: '24. spam (17dk)' },
      25: { action: 'mute', duration: 17 * 60 * 1000, reason: '25. spam (17dk)' },
      26: { action: 'mute', duration: 18 * 60 * 1000, reason: '26. spam (18dk)' },
      27: { action: 'mute', duration: 18 * 60 * 1000, reason: '27. spam (18dk)' },
      28: { action: 'mute', duration: 19 * 60 * 1000, reason: '28. spam (19dk)' },
      29: { action: 'mute', duration: 19 * 60 * 1000, reason: '29. spam (19dk)' },
      30: { action: 'mute', duration: 20 * 60 * 1000, reason: '30. spam (20dk)' },
    },
    exemptRoles:    [],
    exemptChannels: [],
  },

  // ════════════════════════════════════════════════════════════════
  //  KELİME FİLTRESİ
  // ════════════════════════════════════════════════════════════════
  wordFilter: {
    enabled:          true,
    extraBannedWords: [],   // ['kelime1', 'kelime2'] şeklinde ekleyebilirsin
    action:           'delete_and_warn',
    warnBeforeMute:   3,
    mutePunishments: {
      3: 2  * 60 * 1000,
      4: 5  * 60 * 1000,
      5: 15 * 60 * 1000,
      6: 60 * 60 * 1000,
      7: 6  * 60 * 60 * 1000,
      8: 24 * 60 * 60 * 1000,
    },
    banAfter:       9,
    logDetections:  true,
    dmUser:         true,
    useRegex:       true,
    exemptRoles:    [],
    exemptChannels: [],
    ai: {
      enabled:   false,   // OpenAI moderasyon istemiyorsan false bırak
      apiKey:    process.env.OPENAI_API_KEY || '',
      threshold: 0.75,
      blockCategories: [
        'hate', 'hate/threatening', 'harassment', 'harassment/threatening',
        'sexual', 'sexual/minors', 'violence', 'violence/graphic',
        'self-harm', 'self-harm/intent', 'illicit', 'illicit/violent',
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  //  ANTİ LİNK
  // ════════════════════════════════════════════════════════════════
  antiLink: {
    enabled:      true,
    blockInvites: true,
    whitelist: [
      'roblox.com', 'discord.com', 'discordapp.com',
      'youtube.com', 'youtu.be', 'twitch.tv', 'spotify.com', 'soundcloud.com',
      'giphy.com', 'tenor.com', 'imgur.com', 'klipy.com', 'gfycat.com',
      'reddit.com', 'pinterest.com', 'tumblr.com',
      'gifbin.com', 'gifer.com', 'coub.com', 'gifbox.com', 'gifzz.com',
      'ezgif.com', 'reactiongifs.com', 'pixabay.com',
    ],
    action:         'delete_and_warn',
    logDetections:  true,
    exemptRoles:    [],
    exemptChannels: [],
  },

  // ════════════════════════════════════════════════════════════════
  //  ANTİ RAİD
  // ════════════════════════════════════════════════════════════════
  antiRaid: {
    enabled:          true,
    joinLimit:        10,
    joinWindow:       10000,
    action:           'lockdown',
    lockdownDuration: 10 * 60 * 1000,
    newJoinAction:    'kick',
    accountAge:       7 * 24 * 60 * 60 * 1000,
    accountAgeAction: 'kick',
    notifyOwner:      true,
  },

  // ════════════════════════════════════════════════════════════════
  //  HOŞGELDİN / GÜLEGÜLE
  // ════════════════════════════════════════════════════════════════
  welcome: {
    enabled:     true,
    message:     '{user} sunucumuza hoş geldin! Sen **{memberCount}**. üyemizsin.',
    useEmbed:    true,
    embedColor:  0x1ABC9C,
    sendDM:      true,
    dmMessage:   '**{server}** sunucusuna hoş geldin! Lütfen kuralları oku.',
    showBanner:  true,
    // RSS giriş banner görseli — imgür'e yükle, direkt .png/.gif linkini yaz
    // Boş bırakırsan sunucunun banner'ı kullanılır
    bannerUrl:   'https://i.imgur.com/dTL1Mmc.png',
    bannerColor: 0x1ABC9C,
    altYazi:     'Sunucuya Hoşgeldiniz',
  },

  leave: {
    enabled:     true,
    message:     '**{username}** sunucudan ayrıldı. Kalan üye: **{memberCount}**',
    useEmbed:    true,
    embedColor:  0xE74C3C,
    bannerUrl:   'https://i.imgur.com/dTL1Mmc.png',
    bannerColor: 0xE74C3C,
    altYazi:     'Sunucudan Ayrıldı',
  },

  // ════════════════════════════════════════════════════════════════
  //  TİCKET SİSTEMİ
  // ════════════════════════════════════════════════════════════════
  ticket: {
    enabled:           true,
    nameFormat:        'destek-{username}',
    maxTicketsPerUser: 1,
    welcomeMessage:    'Merhaba {user}! 👋\nDestek ekibimiz en kısa sürede seninle ilgilenecek.\n\nLütfen sorununu **detaylıca** anlat.',
    types: [
      { id: 'genel',   label: 'Genel Destek', emoji: '💬', description: 'Genel sorular ve yardım', color: 0x5865F2 },
      { id: 'sikayet', label: 'Üye Şikayeti', emoji: '🚨', description: 'Bir üyeyi şikayet et',    color: 0xE74C3C },
      { id: 'oneri',   label: 'Öneri',        emoji: '💡', description: 'Sunucu önerin var mı?',   color: 0xF1C40F },
      { id: 'ceza',    label: 'Ceza İtirazı', emoji: '⚖️', description: 'Haksız ceza aldın mı?',   color: 0xE67E22 },
      { id: 'other',   label: 'Diğer',        emoji: '📋', description: 'Diğer konular',           color: 0x95A5A6 },
    ],
    saveTranscript: true,
    closeConfirm:   true,
    askRating:      true,
    supportRoles:   [],
    pingRoles:      [],
  },

  cooldowns: {
    default:    3000,
    moderation: 2000,
    info:       5000,
    ticket:     10000,
  },

  logging: {
    messageDelete: true, messageEdit: true, memberJoin: true, memberLeave: true,
    memberBan: true, memberUnban: true, memberKick: true, memberMute: true,
    memberUnmute: true, memberWarn: true, memberTimeout: true,
    roleCreate: true, roleDelete: true, roleUpdate: true, roleGiven: true, roleTaken: true,
    channelCreate: true, channelDelete: true, channelUpdate: true,
    voiceJoin: true, voiceLeave: true, voiceMove: true,
    inviteCreate: true, inviteDelete: true,
    emojiCreate: true, emojiDelete: true, guildUpdate: true,
    webhookUpdate: true, integrationCreate: true, integrationDelete: true,
    reactionAdd: true, reactionRemove: true, nicknameChange: true,
    permissionUpdate: true, botStartup: true, botShutdown: true, ghostPing: true,
  },

  statChannels: {
    enabled:             false,
    totalMembersChannel: '',
    humansChannel:       '',
    botsChannel:         '',
    channelsChannel:     '',
    rolesChannel:        '',
    boostsChannel:       '',
    onlineChannel:       '',
    totalMembersLabel:   '👥 Toplam Üye: {count}',
    humansLabel:         '👤 Üye: {count}',
    botsLabel:           '🤖 Bot: {count}',
    channelsLabel:       '📢 Kanal: {count}',
    rolesLabel:          '🎭 Rol: {count}',
    boostsLabel:         '💎 Boost: {count}',
    onlineLabel:         '🟢 Çevrimiçi: {count}',
  },

  inviteTracker: { enabled: true, logJoins: true },

  // ════════════════════════════════════════════════════════════════
  //  KAYIT SİSTEMİ
  //  Aşağıdaki boş tırnaklara kendi ID'lerini yaz
  // ════════════════════════════════════════════════════════════════
  kayit: {
    enabled: true,

    kanalId:       '1553156367018106931',   // Yeni üye girince bildirim kanalı
    logKanalId:    '1553156367018106931',   // Kimin kimi kaydettiği buraya loglanır
    kayitsizRolId: '1553166464905646133',   // Yeni girişlerde otomatik verilecek kayıtsız rolü

    // Kayıt edilince verilecek üye rolleri
    memberRoller:  ['1553167045871276224'],   // Üye rolü — kayıt edince verilir, kayıtsız rol alınır

    // Bu rollere sahip olanlar !kayit ve /kayit yapabilir
    yetkiliRoller: ['1553117362092380294'],   // Örn: ['1553117362092380294']

    // İsim formatı — {isim} zorunlu, {sayı} opsiyonel
    // Örn: '{isim}' → 'Ahmet'
    // Örn: '{isim} | {sayı}' → 'Ahmet | 42'
    isimFormati:   '{isim}',

    turler: [
      { id: 'normal', label: 'Normal', emoji: '✅', renk: 0x2ECC71 },
      { id: 'vip',    label: 'VIP',    emoji: '⭐', renk: 0xF1C40F },
      { id: 'bot',    label: 'Bot',    emoji: '🤖', renk: 0x5865F2 },
      { id: 'ozel',   label: 'Özel',   emoji: '💎', renk: 0x9B59B6 },
    ],

    dmAc:            true,
    dmMesaj:         '**{server}** sunucusuna hoş geldin, {user}! Kaydın başarıyla tamamlandı.',
    hesapYasiUyari:  7,
    sayacGoster:     true,
  },

  statusMessages: [
    { type: 'WATCHING',  text: '{memberCount} Üye İle İçli Dışlıyım Cano ❤🐞' },
    { type: 'PLAYING',   text: 'BlackNetwork İle Sunucunu Renklendir' },
    { type: 'WATCHING',  text: '{serverCount} Sunucuyu Koruyorum Asklarım' },
    { type: 'LISTENING', text: '!help komutuna Ulaşabilirsin Asko' },
    { type: 'PLAYING',   text: 'Spam ile savaşıyorum Ayol biri yardım etsin⚔️ ' },
  ],
  statusInterval: 3,
};
