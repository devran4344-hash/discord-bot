// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                    MODBOT - EMOJİ KONFİGÜRASYONU                    ║
// ║                                                                       ║
// ║  NASIL KULLANILIR?                                                    ║
// ║  Her emojinin yanındaki yorum satırında ne için kullanıldığı yazar.  ║
// ║  Kendi sunucunun custom emojilarını eklemek için:                    ║
// ║  '<:emojiAdi:emojiID>' formatını kullan (custom emoji)               ║
// ║  Ya da direkt Unicode emoji karakteri kullan                         ║
// ║                                                                       ║
// ║  ÖRNEK CUSTOM EMOJİ: '<:onay:1234567890123456789>'                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

module.exports = {

  // ════════════════════════════════════════
  //  MODERASYON EMOJİLERİ
  // ════════════════════════════════════════

  ban:        '<:1455969911389028539:1556032647648645121>',   // Ban komutu - kullanıcı banlandığında gösterilir
  unban:      '<a:1287533035364810854:1556032643735486615>',   // Unban komutu - ban kaldırıldığında gösterilir
  kick:       '<a:1452680903657783451:1556032645903949876>',   // Kick komutu - kullanıcı atıldığında gösterilir
  mute:       '<a:1534634405941874744:1556032738061193226>',   // Mute komutu - kullanıcı susturulduğunda gösterilir
  unmute:     '<a:1529178924842614824:1556032717911498972>',   // Unmute komutu - ses açıldığında gösterilir
  warn:       '<a:1534634403144400967:1556032736269963324>',   // Warn komutu - uyarı verildiğinde gösterilir
  timeout:    '<:1526130563231252511:1556032711855186081>',   // Timeout komutu - timeout verildiğinde gösterilir
  untimeout:  '<:1526130442867048488:1556032710198431866>',   // Timeout kaldırma komutu
  clear:      '<:1460271074691514422:1556032657098539089>',   // Clear komutu - mesajlar silindiğinde gösterilir
  slowmode:   '<a:1508163643622031380:1556032670138372146>',   // Slowmode komutu - yavaş mod açılınca gösterilir
  lock:       '<a:1457053629923201206:1556032655781269564>',   // Lock komutu - kanal kilitlenince gösterilir
  unlock:     '<a:1452680903657783451:1556032645903949876>',   // Unlock komutu - kanal kilidi açılınca gösterilir
  lockdown:   '<:1455970032373727487:1556032649221373952>',   // Lockdown komutu - sunucu kilitlenmesinde gösterilir

  // ════════════════════════════════════════
  //  DURUM EMOJİLERİ
  // ════════════════════════════════════════

  success:    '<:1507754571240439869:1556032664954343454>',   // Başarılı işlem - her başarılı komut sonucunda gösterilir
  error:      '<a:1507753694769184788:1556032663519756469>',   // Hata - komut hatası olduğunda gösterilir
  warning:    '<:1466239780508663873:1556032659178659961>',   // Uyarı - dikkat gerektiren durumlarda gösterilir
  info:       '<:1484413407678697563:1556032660584005682>',   // Bilgi - bilgi mesajlarında gösterilir
  loading:    '<:1508917090667466773:1556032671921086594>',   // Yükleniyor - işlem sürerken gösterilir
  yes:        '<:1515444956225998908:1556032690497654844>',   // Evet/Onay - izin verilmiş durumlarda gösterilir
  no:         '<:1515444953021677691:1556032687234359418>',   // Hayır/Red - izin verilmemiş durumlarda gösterilir
  maybe:      '<:1515444958176350408:1556032692338950204>',   // Belirsiz/Nötr - kararsız durumlar için

  // ════════════════════════════════════════
  //  LOG / KAYIT EMOJİLERİ
  // ════════════════════════════════════════

  messageDelete:  '🗑️',   // Mod-log: Mesaj silindiğinde log embedinde gösterilir
  messageEdit:    '📝',   // Mod-log: Mesaj düzenlendiğinde log embedinde gösterilir
  memberJoin:     '📥',   // Mod-log: Yeni üye katıldığında log embedinde gösterilir
  memberLeave:    '📤',   // Mod-log: Üye ayrıldığında log embedinde gösterilir
  roleAdd:        '🟢',   // Mod-log: Kullanıcıya rol verildiğinde gösterilir
  roleRemove:     '🔴',   // Mod-log: Kullanıcıdan rol alındığında gösterilir
  roleCreate:     '🆕',   // Mod-log: Yeni rol oluşturulduğunda gösterilir
  roleDelete:     '🗑️',   // Mod-log: Rol silindiğinde gösterilir
  roleUpdate:     '🔄',   // Mod-log: Rol güncellendiğinde gösterilir
  channelCreate:  '📢',   // Mod-log: Yeni kanal oluşturulduğunda gösterilir
  channelDelete:  '🗑️',   // Mod-log: Kanal silindiğinde gösterilir
  channelUpdate:  '🔧',   // Mod-log: Kanal güncellendiğinde gösterilir
  voiceJoin:      '🔊',   // Mod-log: Ses kanalına katıldığında gösterilir
  voiceLeave:     '🔇',   // Mod-log: Ses kanalından çıkıldığında gösterilir
  voiceMove:      '🔀',   // Mod-log: Ses kanalı değiştirildiğinde gösterilir
  inviteCreate:   '📨',   // Mod-log: Yeni davet oluşturulduğunda gösterilir
  inviteDelete:   '🚫',   // Mod-log: Davet silindiğinde gösterilir
  emojiAdd:       '😀',   // Mod-log: Yeni emoji eklendiğinde gösterilir
  emojiRemove:    '😶',   // Mod-log: Emoji silindiğinde gösterilir
  serverUpdate:   '⚙️',   // Mod-log: Sunucu ayarları değiştiğinde gösterilir
  webhookUpdate:  '🔗',   // Mod-log: Webhook değiştiğinde gösterilir
  integration:    '🔌',   // Mod-log: Entegrasyon eklenip/silindiğinde gösterilir
  reactionAdd:    '😄',   // Mod-log: Tepki eklendiğinde gösterilir
  reactionRemove: '😑',   // Mod-log: Tepki kaldırıldığında gösterilir
  nicknameChange: '✏️',   // Mod-log: Takma ad değiştirildiğinde gösterilir
  permUpdate:     '🛡️',   // Mod-log: İzin güncellendiğinde gösterilir

  // ════════════════════════════════════════
  //  OTOMOD / KORUMA EMOJİLERİ
  // ════════════════════════════════════════

  spam:         '<:1508163329686896680:1556032667965984778>',   // Anti-spam: Spam tespit edildiğinde log/uyarıda gösterilir
  badword:      '<:1515444976744530030:1556032695207862392>',   // Anti-küfür: Yasaklı kelime tespit edildiğinde gösterilir
  link:         '<a:1457044182005842117:1556032650819403806>',   // Anti-link: İzinsiz link tespit edildiğinde gösterilir
  raid:         '<:1455970032373727487:1556032649221373952>',   // Anti-raid: Raid modu aktif olduğunda gösterilir
  caps:         '<a:1452680903657783451:1556032645903949876>',   // Anti-caps: Aşırı büyük harf tespit edildiğinde gösterilir
  mention:      '<:1455969911389028539:1556032647648645121>',   // Anti-mention: Toplu mention spam tespit edildiğinde
  flood:        '<:1515444948579782806:1556032684529295441>',   // Anti-flood: Mesaj seli tespit edildiğinde gösterilir
  ghost:        '<a:1515444934113497258:1556032674597052558>',   // Ghost ping tespiti - sessiz mention sonra silme

  // ════════════════════════════════════════
  //  UYARI SİSTEMİ EMOJİLERİ
  // ════════════════════════════════════════

  warnList:     '<a:1486832922324369651:1556032661879914506>',   // Warn listesi komutu - uyarı listesi gösterilirken
  warnClear:    '<:1460271074691514422:1556032657098539089>',   // Warn silme komutu - uyarı silinince gösterilir
  warnActive:   '<a:1526130218706800730:1556032700039565382>',   // Aktif uyarı - uyarı listesinde aktif uyarıları gösterir
  warnExpired:  '<a:1526130358691561493:1556032708226850997>',   // Süresi dolmuş uyarı - süresi geçmiş uyarıları gösterir
  strike:       '<:1534634377688907857:1556032730788007966>',   // Strike - uyarı sayacı gösterilirken kullanılır

  // ════════════════════════════════════════
  //  TİCKET SİSTEMİ EMOJİLERİ
  // ════════════════════════════════════════

  ticketOpen:   '<a:1534634403144400967:1556032736269963324>',   // Ticket aç butonu - ticket açma mesajında gösterilir
  ticketClose:  '<a:1507753694769184788:1556032663519756469>',   // Ticket kapat butonu - ticket kapatma butonunda gösterilir
  ticketClaim:  '<:1455969911389028539:1556032647648645121>',   // Ticket üstlen - moderatörün ticket'ı üstlenmesinde
  ticketDelete: '<:1460271074691514422:1556032657098539089>',   // Ticket sil - ticket silinirken gösterilir
  ticketReopen: '<:1534634285821202574:1556032721334304799>',   // Ticket yeniden aç - kapalı ticket açılırken gösterilir
  ticketLog:    '<:1508917090667466773:1556032671921086594>',   // Ticket log - ticket kapatılınca log alınırken

  // ════════════════════════════════════════
  //  ROL YÖNETİMİ EMOJİLERİ
  // ════════════════════════════════════════

  roleGive:     '<:1507754571240439869:1556032664954343454>',   // Rol ver komutu - rol verildiğinde gösterilir
  roleTake:     '<a:1507753694769184788:1556032663519756469>',   // Rol al komutu - rol alındığında gösterilir
  roleAll:      '<:1515444938802991156:1556032677784723629>',   // Tüm rollere işlem - toplu rol işlemlerinde
  roleInfo:     '<a:1515444934113497258:1556032674597052558>',   // Rol bilgisi - rol bilgisi gösterilirken
  danger:       '<a:1507753694769184788:1556032663519756469>',   // Tehlikeli izin uyarısı - SS'te görülen "Tehlikeli izinler verildi" uyarısı
  shield:       '<:1534634285821202574:1556032721334304799>',   // Koruma aktif - güvenlik sistemleri aktifken

  // ════════════════════════════════════════
  //  BİLGİ KOMUTLARI EMOJİLERİ
  // ════════════════════════════════════════

  user:         '<:1508163329686896680:1556032667965984778>',   // Kullanıcı bilgisi komutu - userinfo embedinde
  server:       '<:1508917090667466773:1556032671921086594>',   // Sunucu bilgisi komutu - serverinfo embedinde
  ping:         '<:1515444938802991156:1556032677784723629>',   // Ping komutu - gecikme gösterilirken
  stats:        '<:1515444941818695780:1556032679986602205>',   // İstatistik - bot istatistikleri gösterilirken
  uptime:       '<:1515444943521321081:1556032681362460722>',   // Uptime - bot çalışma süresi gösterilirken
  bot:          '<:1455970032373727487:1556032649221373952>',   // Bot bilgisi - botinfo embedinde
  calendar:     '<a:1452680903657783451:1556032645903949876>',   // Tarih - hesap oluşturma tarihi vb.
  id:           '<a:1457048269179064412:1556032653902356511>',   // ID - Discord ID'si gösterilirken
  crown:        '<:1515444976744530030:1556032695207862392>',   // Sunucu sahibi - serverinfo'da sunucu sahibi için
  online:       '<:1515444956225998908:1556032690497654844>',   // Çevrimiçi durum - üye durumu gösterilirken
  idle:         '<:1515444935992545400:1556032676136493166>',   // Boşta durum - üye durumu gösterilirken
  dnd:          '<:1515444953021677691:1556032687234359418>',   // Rahatsız etme - üye durumu gösterilirken
  offline:      '<:1515444958176350408:1556032692338950204>',   // Çevrimdışı - üye durumu gösterilirken
  boost:        '<:1538596864394272879:1556032781245620274>',   // Server boost - serverinfo'da boost bilgisinde
  verify:       '<a:1534634427349467227:1556032745334120613>',   // Doğrulanmış - doğrulanmış hesap/sunucu için

  // ════════════════════════════════════════
  //  HOŞGELDİN / GÜLE GÜLE EMOJİLERİ
  // ════════════════════════════════════════

  welcome:      '<:1526130279981387896:1556032703135096843>',   // Hoşgeldin mesajı - yeni üye geldiğinde büyük emojide
  goodbye:      '<:1526130287006715995:1556032704477397053>',   // Güle güle mesajı - üye ayrıldığında büyük emojide
  member:       '<:2377688:1556032639838982154>',   // Üye sayısı - üye sayısı gösterilirken

  // ════════════════════════════════════════
  //  HELP MENÜSÜ EMOJİLERİ
  // ════════════════════════════════════════

  helpMenu:     '<:1534634368075829380:1556032728846176276>',   // Help menüsü başlığında gösterilir
  modCategory:  '<:1529185607060951060:1556032719287353375>',   // Moderasyon kategorisi butonu - help menüsünde
  infoCategory: '<a:1526145648661893192:1556032713696350302>',   // Bilgi kategorisi butonu - help menüsünde
  utilCategory: '<a:1534634403144400967:1556032736269963324>',   // Araçlar kategorisi butonu - help menüsünde
  adminCategory:'<a:1486832922324369651:1556032661879914506>',   // Admin kategorisi butonu - help menüsünde
  automodCategory:'<:1466239780508663873:1556032659178659961>', // Otomod kategorisi butonu - help menüsünde
  securityCategory:'<:1515444951658528818:1556032686047367248>',// Güvenlik kategorisi butonu - help menüsünde
  ticketCategory:'<:1529185607060951060:1556032719287353375>',  // Ticket kategorisi butonu - help menüsünde
  logCategory:  '<:1515444948579782806:1556032684529295441>',   // Log kategorisi butonu - help menüsünde

  // ════════════════════════════════════════
  //  BOT DURUM EMOJİLERİ
  // ════════════════════════════════════════

  startup:      '<:1515444956225998908:1556032690497654844>',   // Bot açıldığında botLog kanalında gösterilir
  shutdown:     '<:1515444953021677691:1556032687234359418>',   // Bot kapandığında botLog kanalında gösterilir
  restart:      '<a:1507753694769184788:1556032663519756469>',   // Bot yeniden başladığında botLog kanalında gösterilir
  crash:        '<a:1457053629923201206:1556032655781269564>',   // Bot çöktüğünde (beklenmedik kapanma) log'da gösterilir
  update:       '<a:1508163643622031380:1556032670138372146>',   // Bot güncellendiğinde gösterilir

  // ════════════════════════════════════════
  //  SAYFA NAVİGASYON EMOJİLERİ
  // ════════════════════════════════════════

  first:        '<a:1526130218706800730:1556032700039565382>',   // İlk sayfaya git - sayfalı komutlarda kullanılır
  prev:         '<a:1526130194463719425:1556032698483482654>',   // Önceki sayfa - sayfalı komutlarda kullanılır
  next:         '<a:15261303586915614931:1556032705966375062>',   // Sonraki sayfa - sayfalı komutlarda kullanılır
  last:         '<:1525493028851286110:1556032696852029500>',   // Son sayfaya git - sayfalı komutlarda kullanılır
  stop:         '<a:1457044182005842117:1556032650819403806>',   // Durdur / Kapat - etkileşimli menüleri kapatır
  back:         '<a:1452680903657783451:1556032645903949876>',   // Geri - menülerde bir önceki sayfaya döner
  home:         '<:1455970032373727487:1556032649221373952>',   // Ana menü - help menüsünün ana sayfasına döner

  // ════════════════════════════════════════
  //  ÖZEL / EKSTRAEMOJİLER
  // ════════════════════════════════════════

  // Buraya kendi sunucunun custom emojilarını ekleyebilirsin
  // Format: emojiAdi: '<:customEmojiAdi:emojiID>'
  // Örnek:
  // onay: '<:onay:1234567890>',    // Onay custom emojisi - başarılı işlemlerde
  // iptal: '<:iptal:1234567891>',  // İptal custom emojisi - başarısız işlemlerde

};
