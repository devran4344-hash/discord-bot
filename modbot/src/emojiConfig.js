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

  ban:        '<:duuyuer:1566356930593693806>',   // Ban komutu - kullanıcı banlandığında gösterilir
  unban:      '<:dart:1566356909655719996>',   // Unban komutu - ban kaldırıldığında gösterilir
  kick:       '<:cks:1566356894900162590>',   // Kick komutu - kullanıcı atıldığında gösterilir
  mute:       '<:bariyer:1566356869700919416>',   // Mute komutu - kullanıcı susturulduğunda gösterilir
  unmute:     '<:alp:1566356829750169741>',   // Unmute komutu - ses açıldığında gösterilir
  warn:       '<:unlem:1566357185812893777>',   // Warn komutu - uyarı verildiğinde gösterilir
  timeout:    '<:restar:1566357130980630589>',   // Timeout komutu - timeout verildiğinde gösterilir
  untimeout:  '<:server2:1566357143907471482>',   // Timeout kaldırma komutu
  clear:      '<a:rdd:1566357126786580510>',   // Clear komutu - mesajlar silindiğinde gösterilir
  slowmode:   '<a:kzly:1566357033488359444>',   // Slowmode komutu - yavaş mod açılınca gösterilir
  lock:       '<:kapali:1566357017663119421>',   // Lock komutu - kanal kilitlenince gösterilir
  unlock:     '<:ack:1566356820187152424>',   // Unlock komutu - kanal kilidi açılınca gösterilir
  lockdown:   '<:alert:1566356825127911474>',   // Lockdown komutu - sunucu kilitlenmesinde gösterilir

  // ════════════════════════════════════════
  //  DURUM EMOJİLERİ
  // ════════════════════════════════════════

  success:    '<:yeah:1566357226338394182>',   // Başarılı işlem - her başarılı komut sonucunda gösterilir
  error:      '<a:alert2:1566356826738528296>',   // Hata - komut hatası olduğunda gösterilir
  warning:    '<a:acil:1566356821919273101>',   // Uyarı - dikkat gerektiren durumlarda gösterilir
  info:       '<a:unlemm:1566357187050086461>',   // Bilgi - bilgi mesajlarında gösterilir
  loading:    '<a:timer2:1566357176941809724>',   // Yükleniyor - işlem sürerken gösterilir
  yes:        '<a:network:1566357077226553495>',   // Evet/Onay - izin verilmiş durumlarda gösterilir
  no:         '<a:436t6:1566356805704089640>',   // Hayır/Red - izin verilmemiş durumlarda gösterilir
  maybe:      '<a:5j:1566356798771044362>',   // Belirsiz/Nötr - kararsız durumlar için

  // ════════════════════════════════════════
  //  LOG / KAYIT EMOJİLERİ
  // ════════════════════════════════════════

  messageDelete:  '<:cp:1566356903792091205>',   // Mod-log: Mesaj silindiğinde log embedinde gösterilir
  messageEdit:    '<:click:1566356899543384135>',   // Mod-log: Mesaj düzenlendiğinde log embedinde gösterilir
  memberJoin:     '<a:ping4:1566357099565555735>',   // Mod-log: Yeni üye katıldığında log embedinde gösterilir
  memberLeave:    '<a:ping5:1566357101075365938>',   // Mod-log: Üye ayrıldığında log embedinde gösterilir
  roleAdd:        '<:artuy:1566356838780244068>',   // Mod-log: Kullanıcıya rol verildiğinde gösterilir
  roleRemove:     '<:eks:1566356941347880960>',   // Mod-log: Kullanıcıdan rol alındığında gösterilir
  roleCreate:     '<:artuy:1566356838780244068>',   // Mod-log: Yeni rol oluşturulduğunda gösterilir
  roleDelete:     '<:eks:1566356941347880960>',   // Mod-log: Rol silindiğinde gösterilir
  roleUpdate:     '<a:ayars:1566356848389394432>',   // Mod-log: Rol güncellendiğinde gösterilir
  channelCreate:  '<a:ert:1566356950222897162>',   // Mod-log: Yeni kanal oluşturulduğunda gösterilir
  channelDelete:  '<:eks:1566356941347880960>',   // Mod-log: Kanal silindiğinde gösterilir
  channelUpdate:  '<:etiket:1566356951657619506>',   // Mod-log: Kanal güncellendiğinde gösterilir
  voiceJoin:      '<:geh:1566356968745205790>',   // Mod-log: Ses kanalına katıldığında gösterilir
  voiceLeave:     '<a:network:1566357077226553495>',   // Mod-log: Ses kanalından çıkıldığında gösterilir
  voiceMove:      '<a:network:1566357077226553495>',   // Mod-log: Ses kanalı değiştirildiğinde gösterilir
  inviteCreate:   '<:tet:1566357167953412176>',   // Mod-log: Yeni davet oluşturulduğunda gösterilir
  inviteDelete:   '<:tet:1566357167953412176>',   // Mod-log: Davet silindiğinde gösterilir
  emojiAdd:       '<a:kzly:1566357033488359444>',   // Mod-log: Yeni emoji eklendiğinde gösterilir
  emojiRemove:    '<a:klacyedc:1566357037997232148>',   // Mod-log: Emoji silindiğinde gösterilir
  serverUpdate:   '<:kzlkey:1566357030749343744>',   // Mod-log: Sunucu ayarları değiştiğinde gösterilir
  webhookUpdate:  '<:keys:1566357022319058975>',   // Mod-log: Webhook değiştiğinde gösterilir
  integration:    '<a:kar:1566357019483447366>',   // Mod-log: Entegrasyon eklenip/silindiğinde gösterilir
  reactionAdd:    '<:iii:1566357004753043476>',   // Mod-log: Tepki eklendiğinde gösterilir
  reactionRemove: '<:iii:1566357004753043476>',   // Mod-log: Tepki kaldırıldığında gösterilir
  nicknameChange: '<:etiket:1566356951657619506>',   // Mod-log: Takma ad değiştirildiğinde gösterilir
  permUpdate:     '<:gazete:1566356965519790240>',   // Mod-log: İzin güncellendiğinde gösterilir

  // ════════════════════════════════════════
  //  OTOMOD / KORUMA EMOJİLERİ
  // ════════════════════════════════════════

  spam:         '<a:dcloading:1566356912952315915>',   // Anti-spam: Spam tespit edildiğinde log/uyarıda gösterilir
  badword:      '<a:dcloading:1566356912952315915>',   // Anti-küfür: Yasaklı kelime tespit edildiğinde gösterilir
  link:         '<a:dcloading:1566356912952315915>',   // Anti-link: İzinsiz link tespit edildiğinde gösterilir
  raid:         '<a:dcloading:1566356912952315915>',   // Anti-raid: Raid modu aktif olduğunda gösterilir
  caps:         '<a:dcloading:1566356912952315915>',   // Anti-caps: Aşırı büyük harf tespit edildiğinde gösterilir
  mention:      '<a:dcloading:1566356912952315915>',   // Anti-mention: Toplu mention spam tespit edildiğinde
  flood:        '<a:dcloading:1566356912952315915>',   // Anti-flood: Mesaj seli tespit edildiğinde gösterilir
  ghost:        '<a:dcloading:1566356912952315915>',   // Ghost ping tespiti - sessiz mention sonra silme

  // ════════════════════════════════════════
  //  UYARI SİSTEMİ EMOJİLERİ
  // ════════════════════════════════════════

  warnList:     '<:dart:1566356909655719996>',   // Warn listesi komutu - uyarı listesi gösterilirken
  warnClear:    '<:cp:1566356903792091205>',   // Warn silme komutu - uyarı silinince gösterilir
  warnActive:   '<a:bomb:1566356880333471784>',   // Aktif uyarı - uyarı listesinde aktif uyarıları gösterir
  warnExpired:  '<:alp:1566356829750169741>',   // Süresi dolmuş uyarı - süresi geçmiş uyarıları gösterir
  strike:       '<:auto:1566356840072347658>',   // Strike - uyarı sayacı gösterilirken kullanılır

  // ════════════════════════════════════════
  //  TİCKET SİSTEMİ EMOJİLERİ
  // ════════════════════════════════════════

  ticketOpen:   '<a:ayars:1566356848389394432>',   // Ticket aç butonu - ticket açma mesajında gösterilir
  ticketClose:  '<a:ayars:1566356848389394432>',   // Ticket kapat butonu - ticket kapatma butonunda gösterilir
  ticketClaim:  '<a:436t6:1566356805704089640>',   // Ticket üstlen - moderatörün ticket'ı üstlenmesinde
  ticketDelete: '<a:acil:1566356821919273101>',   // Ticket sil - ticket silinirken gösterilir
  ticketReopen: '<:anasayfa:1566356832660750356>',   // Ticket yeniden aç - kapalı ticket açılırken gösterilir
  ticketLog:    '<:anasayfa:1566356832660750356>',   // Ticket log - ticket kapatılınca log alınırken

  // ════════════════════════════════════════
  //  ROL YÖNETİMİ EMOJİLERİ
  // ════════════════════════════════════════

  roleGive:     '<a:rdd:1566357126786580510>',   // Rol ver komutu - rol verildiğinde gösterilir
  roleTake:     '<:restar:1566357130980630589>',   // Rol al komutu - rol alındığında gösterilir
  roleAll:      '<:rexal:1566357132520062996>',   // Tüm rollere işlem - toplu rol işlemlerinde
  roleInfo:     '<:soru:1566357159267274792>',   // Rol bilgisi - rol bilgisi gösterilirken
  danger:       '<:grr:1566356984201093131>',   // Tehlikeli izin uyarısı - SS'te görülen "Tehlikeli izinler verildi" uyarısı
  shield:       '<a:guvenlik:1566356991293526057>',   // Koruma aktif - güvenlik sistemleri aktifken

  // ════════════════════════════════════════
  //  BİLGİ KOMUTLARI EMOJİLERİ
  // ════════════════════════════════════════

  user:         '<:guard:1566356988299055244>',   // Kullanıcı bilgisi komutu - userinfo embedinde
  server:       '<:etiktets:1566356954907938847>',   // Sunucu bilgisi komutu - serverinfo embedinde
  ping:         '<:dusukping:1566356929058709634>',   // Ping komutu - gecikme gösterilirken
  stats:        '<:anasayfa:1566356832660750356>',   // İstatistik - bot istatistikleri gösterilirken
  uptime:       '<:dra:1566356927108092024>',   // Uptime - bot çalışma süresi gösterilirken
  bot:          '<:cpu:1566356905381859460>',   // Bot bilgisi - botinfo embedinde
  calendar:     '<:date:1566356911131987978>',   // Tarih - hesap oluşturma tarihi vb.
  id:           '<:dosya5:1566356922184241202>',   // ID - Discord ID'si gösterilirken
  crown:        '<:taac:1566357162601611325>',   // Sunucu sahibi - serverinfo'da sunucu sahibi için
  online:       '<:yaprak:1566357211859386368>',   // Çevrimiçi durum - üye durumu gösterilirken
  idle:         '<:yry:1566357245246185562>',   // Boşta durum - üye durumu gösterilirken
  dnd:          '<:ragatszetme:1566357107664494663>',   // Rahatsız etme - üye durumu gösterilirken
  offline:      '<:ntn:1566357085812166696>',   // Çevrimdışı - üye durumu gösterilirken
  boost:        '<a:eeer:1566356938047098970>',   // Server boost - serverinfo'da boost bilgisinde
  verify:       '<a:acil:1566356821919273101>',   // Doğrulanmış - doğrulanmış hesap/sunucu için

  // ════════════════════════════════════════
  //  HOŞGELDİN / GÜLE GÜLE EMOJİLERİ
  // ════════════════════════════════════════

  welcome:      '<:artuy:1566356838780244068>',   // Hoşgeldin mesajı - yeni üye geldiğinde büyük emojide
  goodbye:      '<:alp:1566356829750169741>',   // Güle güle mesajı - üye ayrıldığında büyük emojide
  member:       '<a:zil:1566357248039460925>',   // Üye sayısı - üye sayısı gösterilirken

  // ════════════════════════════════════════
  //  HELP MENÜSÜ EMOJİLERİ
  // ════════════════════════════════════════

  helpMenu:     '<:yayyyy:1566357224396161044>',   // Help menüsü başlığında gösterilir
  modCategory:  '<:YAYYY:1566357222332694568>',   // Moderasyon kategorisi butonu - help menüsünde
  infoCategory: '<a:YJY:1566357241735544874>',   // Bilgi kategorisi butonu - help menüsünde
  utilCategory: '<:yeyy:1566357231002320926>',   // Araçlar kategorisi butonu - help menüsünde
  adminCategory:'<a:web2:1566357203193962556>',   // Admin kategorisi butonu - help menüsünde
  automodCategory:'<a:tat:1566357166238081124>', // Otomod kategorisi butonu - help menüsünde
  securityCategory:'<a:tr:1566357181740093480>',// Güvenlik kategorisi butonu - help menüsünde
  ticketCategory:'<:tickets:1566357171296280576>',  // Ticket kategorisi butonu - help menüsünde
  logCategory:  '<a:totem:1566357180305772604>',   // Log kategorisi butonu - help menüsünde

  // ════════════════════════════════════════
  //  BOT DURUM EMOJİLERİ
  // ════════════════════════════════════════

  startup:      '<:ttt:1566357183166418994>',   // Bot açıldığında botLog kanalında gösterilir
  shutdown:     '<:restar:1566357130980630589>',   // Bot kapandığında botLog kanalında gösterilir
  restart:      '<a:rdd:1566357126786580510>',   // Bot yeniden başladığında botLog kanalında gösterilir
  crash:        '<:iii:1566357004753043476>',   // Bot çöktüğünde (beklenmedik kapanma) log'da gösterilir
  update:       '<:ucbirim:1566357184520917012>',   // Bot güncellendiğinde gösterilir

  // ════════════════════════════════════════
  //  SAYFA NAVİGASYON EMOJİLERİ
  // ════════════════════════════════════════

  first:        '<:gds:1566356966899712051>',   // İlk sayfaya git - sayfalı komutlarda kullanılır
  prev:         '<:eks:1566356941347880960>',   // Önceki sayfa - sayfalı komutlarda kullanılır
  next:         '<:artuy:1566356838780244068>',   // Sonraki sayfa - sayfalı komutlarda kullanılır
  last:         '<:jra:1566357009010266263>',   // Son sayfaya git - sayfalı komutlarda kullanılır
  stop:         '<a:acil:1566356821919273101>',   // Durdur / Kapat - etkileşimli menüleri kapatır
  back:         '<:click:1566356899543384135>',   // Geri - menülerde bir önceki sayfaya döner
  home:         '<:135:1566356803271532615>',   // Ana menü - help menüsünün ana sayfasına döner

  // ════════════════════════════════════════
  //  ÖZEL / EKSTRAEMOJİLER
  // ════════════════════════════════════════

  // Buraya kendi sunucunun custom emojilarını ekleyebilirsin
  // Format: emojiAdi: '<:customEmojiAdi:emojiID>'
  // Örnek:
  // onay: '<:onay:1234567890>',    // Onay custom emojisi - başarılı işlemlerde
  // iptal: '<:iptal:1234567891>',  // İptal custom emojisi - başarısız işlemlerde

};
