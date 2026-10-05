// ╔══════════════════════════════════════════════════════════════════════╗
// ║           MODBOT — GELİŞMİŞ KÜFÜR FİLTRE SİSTEMİ                   ║
// ║                                                                      ║
// ║  3 katmanlı koruma:                                                  ║
// ║  1. Akıllı kelime listesi (exact vs substring, yanlış alarm yok)    ║
// ║  2. L33t-speak / bypass önleme                                       ║
// ║  3. OpenAI Moderation API (opsiyonel)                               ║
// ╚══════════════════════════════════════════════════════════════════════╝

const axios = require('axios');

// ══════════════════════════════════════════════════════════════════════
//  KELİME LİSTESİ
//
//  _exact  → Sadece tam kelime eşleşmesi
//            "it" yakalar ama "git", "itmek", "itiyor" içinde YAKALANMAZ
//            "mal" yakalar ama "normal", "malakobi" içinde YAKALANMAZ
//
//  _substr → Kelime içinde geçse de yakala
//            "siktir" → "siktirgit" içinde de yakalanır
// ══════════════════════════════════════════════════════════════════════

const BANNED_WORDS = {

  // ─── TÜRKÇE — Tam kelime (kısa/tehlikeli yanlış alarm yapanlar) ─────
  turkce_exact: [
    'it', 'oç', 'göt', 'bok', 'amk', 'ibne', 'piç', 'mal', 'eşek', 'öküz', 'hıyar', 'gerzek',
    'salak', 'aptal', 'dangalak', 'alçak', 'kalleş', 'namert', 'yavşak', 'kahpe', 'kaltak',
    'sürtük', 'şerefsiz', 'namussuz', 'haysiyetsiz', 'orospu', 'yarrak', 'gerizekalı', 'abaza',
    'abazan', 'abazn', 'agzınascm', 'allahsiz', 'allahsız', 'amarım', 'ambiti', 'amcigi',
    'amcik', 'amck', 'amckl', 'amcklama', 'amcklaryla', 'amckta', 'amcktan', 'amcug', 'amcuh',
    'amcuk', 'amcukk', 'amcıh', 'amcıq', 'amcığ', 'amcığı', 'amcığın', 'amcığını',
    'amcığınızı', 'amgk', 'amin', 'amina', 'aminda', 'amindan', 'amindayken', 'amini',
    'aminiyarraaniskiim', 'aminoglu', 'amiyum', 'amjk', 'amjık', 'amkafa', 'amkk', 'amkkk',
    'amkocu', 'amkoyim', 'amlarnzn', 'amlı', 'ammak', 'ammk', 'ammna', 'amna', 'amnako',
    'amnda', 'amndaki', 'amngtn', 'amnn', 'amnskm', 'amnskym', 'amona', 'amq', 'amsiz',
    'amsuratlı', 'amsz', 'amsız', 'amteri', 'amugaa', 'amuk', 'amuna', 'amuğa', 'amuş', 'amv',
    'amı', 'amık', 'amın', 'amında', 'amınoglu', 'amınoğlu', 'amınoğluhayvan', 'amınun',
    'amısına', 'amısını', 'ananizi', 'ananiziskiyim', 'ananizyrrk', 'ananıs', 'ananıslym',
    'ananısıkm', 'ananızyrrk', 'anasini', 'anası', 'anasının', 'anasınısatayım', 'anasız',
    'angut', 'atkafasi', 'atmık', 'auzlu', 'avradini', 'avradını', 'ağzına',
    'babaannesi', 'babası', 'bacağına', 'bacınıskm', 'bacısikik', 'bacısız', 'boka', 'bokbok',
    'bokcuklar', 'bokhu', 'bokkkumu', 'boklar', 'boklu', 'boktan', 'bokubokuna', 'bokum',
    'bokça', 'bombok', 'bızır', 'cibiliyetsiz', 'cibilliyetini', 'cibilliyetsiz', 'cocugu',
    'cıbılsız', 'daltassak', 'daltassk', 'dalyarak', 'danyal', 'dassagi', 'dassak',
    'dassaklara', 'daşak', 'daşağı', 'daşşak', 'daşşağı', 'dingilini', 'dinsiz', 'dkerim',
    'domal', 'domalan', 'domaldı', 'domaldın', 'domalmak', 'domalmış', 'domalsın', 'domalt',
    'domaltarak', 'domaltip', 'domaltmak', 'domaltıp', 'domaltır', 'domaltırım', 'domalık',
    'domalıyor', 'döllek', 'dölleme', 'dölsüz', 'dölü', 'düdük', 'dümbelek', 'dıyrak', 'ebeni',
    'ebenin', 'ebeninki', 'ebenizi', 'ebenın', 'ebenınkı', 'ecdadini', 'ecdadını', 'emcükle',
    'fahise', 'fck', 'fcku', 'folloş', 'foseptik', 'fucker', 'fuckin', 'fucking', 'fuker',
    'fısatçı', 'gabat', 'gabdiz', 'gavad', 'geber', 'geberik', 'gebermek', 'gebermiş',
    'gebertir', 'gerizekali', 'gerızekalı', 'giberim', 'giberler', 'gibis', 'gibiş', 'gibmek',
    'gibtiler', 'goddamn', 'godoş', 'godumun', 'goot', 'gotelek', 'gotlalesi', 'gotlek',
    'gotlu', 'gotten', 'gotum', 'gotun', 'gotundeki', 'gotunden', 'gotune', 'gotunu',
    'gotveren', 'goyiim', 'goyum', 'goyuyim', 'goyyim', 'gtelek', 'gtn', 'gtnde', 'gtnden',
    'gtne', 'gtt', 'gtten', 'gtveren', 'gusülsüz', 'gvnt', 'gvt', 'götelek', 'götlalesi',
    'götlek', 'götoğlanı', 'götoş', 'götten', 'götü', 'götün', 'götüne', 'götünekoyim',
    'gıberler', 'gıberım', 'gıbtıler', 'gıbıs', 'gıbısler', 'hasihtir', 'hassikome',
    'hassittir', 'helallı', 'hsktr', 'huur', 'hırbo', 'hıyarto', 'ibina', 'ibine', 'ibinenin',
    'ibinetor', 'ibnedir', 'ibneler', 'ibneleri', 'ibnelik', 'ibneliği', 'ibnelri', 'ibnemsi',
    'ibneni', 'ibnenin', 'ibnerator', 'ibnesi', 'imansz', 'ipne', 'iserim', 'itoğlu', 'işerim',
    'kahbe', 'kaltağ', 'kancik', 'kancık', 'kancığ', 'kappe', 'karhane', 'karisini', 'karını',
    'karısını', 'kavat', 'kavatn', 'kavt', 'kaşar', 'kerane', 'kerhane', 'kerhanelerde',
    'kevase', 'kevaşe', 'kevvase', 'kodugum', 'kodumun', 'kodumunun', 'koduumun', 'koduğmun',
    'koduğmunun', 'koyarm', 'koyayım', 'koyiim', 'koyiiym', 'koyim', 'koyum', 'koyyim',
    'köpoğlu', 'madafaka', 'malafat', 'malafatçı', 'malak', 'maldovya', 'mcik', 'mna',
    'motherfucker', 'mudik', 'nigır', 'ocuu', 'ocuun', 'oglan', 'orosp', 'orostoban',
    'orostopol', 'orrospu', 'orsp', 'orspcocu', 'orusbu', 'osbir', 'ossurduum', 'ossurmak',
    'ossuruk', 'osurduu', 'osuruk', 'osururum', 'otuzbir', 'oğlancı', 'pezevek', 'pezeven',
    'pezeveng', 'pezevengi', 'pezevengin', 'pezo', 'picler', 'pisliktir', 'piçin', 'piçler',
    'puşt', 'puşttur', 'pzvng', 'pzvnk', 'pıch', 'pıç', 'qavat', 'rosbu', 'salaak', 'serefsiz',
    'serefsz', 'shıt', 'sicarsin', 'sihtir', 'sikcem', 'sikdi', 'sikdiğim', 'sikecem', 'sikem',
    'siken', 'sikenin', 'siker', 'sikerler', 'sikersin', 'sikertir', 'sikertmek', 'sikesen',
    'sikesicenin', 'sikey', 'sikeydim', 'sikeym', 'sikicem', 'sikici', 'sikien', 'sikienler',
    'sikiiim', 'sikiiimmm', 'sikiir', 'sikiirken', 'sikil', 'sikildiini', 'sikilesice',
    'sikilmi', 'sikilmie', 'sikilmis', 'sikilmiş', 'sikilsin', 'sikim', 'sikimde', 'sikimden',
    'sikime', 'sikimi', 'sikimiin', 'sikimin', 'sikimle', 'sikimsonik', 'sikimtrak', 'sikin',
    'sikinde', 'sikinden', 'sikine', 'sikini', 'sikip', 'sikis', 'sikisek', 'sikisen',
    'sikish', 'sikismis', 'sikitiin', 'sikiym', 'sikiyorum', 'sikkim', 'sikko', 'sikle',
    'sikler', 'sikleri', 'sikleriii', 'sikli', 'sikm', 'sikme', 'sikmek', 'sikmem', 'sikmiler',
    'sikmisligim', 'siksem', 'sikseydin', 'sikseyidin', 'siksin', 'siksinbaya', 'siksinler',
    'siksiz', 'siksok', 'siksonik', 'siksz', 'sikt', 'sikti', 'siktigimin', 'siktigiminin',
    'siktii', 'siktiim', 'siktiimin', 'siktiiminin', 'siktiler', 'siktim', 'siktimin',
    'siktiminin', 'siktiği', 'siktiğim', 'siktiğimin', 'siktiğiminin', 'silkeyim', 'siqtir',
    'sittimin', 'sittir', 'skcem', 'skecem', 'skem', 'sker', 'skerim', 'skerm', 'skeyim',
    'skiim', 'skik', 'skime', 'skm', 'skmek', 'sksin', 'sksn', 'sksz', 'sktiimin', 'sktr',
    'sktrr', 'skyim', 'skym', 'slaleni', 'sokam', 'sokarim', 'sokarm', 'sokarmkoduumun',
    'sokarım', 'sokaym', 'sokayım', 'sokiim', 'soktuğumunun', 'sokuk', 'sokum', 'sokuyum',
    'sokuş', 'soxum', 'srfsz', 'sulaleni', 'sxtir', 'sülaleni', 'sülalenizi', 'sıecem',
    'sıçar', 'sıçarım', 'sıçayım', 'sıçmak', 'sıçsın', 'sıçtığım', 'taaklarn', 'taaklarna',
    'tarrakimin', 'tasak', 'tassak', 'taşağa', 'taşağı', 'taşşağa', 'taşşağı', 'topsun',
    'totoş', 'veled', 'veledizina', 'weled', 'weledizina', 'xikeyim', 'yaaraaa', 'yalama',
    'yalarun', 'yalarım', 'yaraaam', 'yaraak', 'yaraam', 'yarak', 'yaraksız', 'yaraktr',
    'yaram', 'yaraminbasi', 'yaramn', 'yarağ', 'yarra', 'yarraaaa', 'yarraak', 'yarraam',
    'yarraamı', 'yarrag', 'yarragi', 'yarragimi', 'yarragina', 'yarragindan', 'yarragm',
    'yarragımı', 'yarraimin', 'yarram', 'yarrama', 'yarramin', 'yarraminbaşı', 'yarramn',
    'yarran', 'yarrana', 'yarrrak', 'yavak', 'yavsak', 'yavuşak', 'yavş', 'yogurtlayam',
    'yoğurtlayam', 'yrrak', 'yrrk', 'yvsk', 'zigsin', 'zikeyim', 'zikiiim', 'zikiim', 'zikik',
    'zikim', 'ziksiiin', 'ziksiin', 'zıkkım', 'zıkkımım', 'çük', 'öşex', 'ıbne', 'ıbnelık',
    'ıbnetor', 'ıtoğluıt', 'şerefsizim', 'şerefsizlik', 'şerefsizliği', 'şerefsz', 'şre',
    'şrefsiz', 'şrfsz', 'şıllık', '!bne', '$erefsiz', '$iktir', '0-r-o-s-p-u', '0-rospu',
    '0.c', '0.c.o.c.u.g.u', '0.ç', '0r0spu1', '0rospu', '0rsp', '0rspu', '0ç', '0ç-cocu',
    '1-b-n-e', '1b-n-e', '1bn3', '1bne', '1bneler', '1bnelik', '1pn3', '1pne', '1pnelik', '1t',
    '1toğlu', '1toğluit', '1tsoyu', '3-v-l-a-d', '3be', '3be-n-in', '3be_n1n', '3may1',
    '3nay1', '3nayi', '4-m-k', '4hm4k1', '4m-c-i-k', '4m-cik', '4m-cık', '4m-koy-ayim',
    '4m-koy-im', '4m-koyarim', '4m-q', '4m-v', '4m-ın-a', '4m1k', '4m1n4k0y4y1m', '4m1na',
    '4mcuk', '4mk', '4mk1', '4mkoyim', '4mkoyum', '4mq', '4mık', '4mın4koy4yım', '4ptal1',
    '5-1-k', '5-1-k-t-1-r', '5-i-k-e-r-i-m', '5-i-k-t-i-r', '51-k', '51k-erim', '51kt1r',
    '51ktirgit', '5ikerim', '5ikik', '5iktir', '5iktir_git', '5k-m', '5skm', '8-o-k', '8-ok',
    '8ok', '9-0-t', '90t', '@m-cık', '@m-k', '@m-koyim', '@m-v', '@m1cik', '@m1na', '@mcuk',
    '@mcık', '@min4', '@minakoyim', '@mk', '@munakoyim', '@mıcık', '@mık', '@mın4-koyim',
    '@mınakoyim', 'a-m-c-ı-k', 'a-m-k', 'a-m-q', 'a-q', 'a.m.c.i.k', 'a.m.cik', 'a.m.k',
    'a.m.q', 'a.m.v', 'a.mk', 'a.mık', 'a.q', 'a_m_c_ı_k', 'a_m_k', 'a_m_q', 'a_q', 'abaz1an',
    'abaz4', 'abaz4-n', 'abaz4n', 'ag-zina', 'ag-zina-scym', 'agz-ina', 'agzina-s',
    'agzınas1cayim', 'agzınas1cm', 'ahm4k1', 'akp1l1', 'alag4t', 'alagav4t', 'am-c-ı-k',
    'am-cik', 'am-cukk', 'am-cıh', 'am-cık', 'am-k', 'am-koy-arim', 'am-koyim', 'am-q',
    'am-skm', 'am-skym', 'am-v', 'am.cigi', 'am.cik', 'am.ciklar', 'am.cıgı', 'am.cık',
    'am.cıkkafa', 'am.ina', 'am.k', 'am.koyim', 'am.koyum', 'am.q', 'am.ık', 'am.ın', 'am.ına',
    'am.ınakoyayım', 'am.ınakoyim', 'am.ınakoyum', 'am.ınasokm', 'am.ında', 'am.ından',
    'am.ınoglu', 'am.ınoğlu', 'am.ınçocuğu', 'am.ını', 'am.ınısikeyim', 'am.ınısikim', 'am1n',
    'am1n4', 'am1n4k0y1m', 'am1na', 'am1nako', 'am1nakoyim', 'am1nakoyum', 'am1nasokm',
    'am1noglu', 'am4na', 'am_feryadi', 'am_k', 'amc1-k', 'amc1g1', 'amc1g1n', 'amc1g1n1',
    'amc1g1niz', 'amc1g1nı', 'amc1g1zı', 'amc1k', 'amc1kkafalı', 'amc1klama', 'amc1klan',
    'amc1kland1', 'amc1klandin', 'amc1ks1z', 'amc1m', 'amc1q', 'amcukl4r', 'amcı-g-ı',
    'amcı-k-lı', 'amcı-k-tan', 'amcık-herif', 'amcık-kafa', 'amcık-kafalı', 'amcıq-lar',
    'amk1', 'amk1m', 'aml-arnzn', 'amnskm1', 'amnskym1', 'amona-k', 'amonak0yım', 'amq1',
    'ams1zlar', 'amter1', 'amunskm1', 'amın-a', 'amın-feryadı', 'amın-k-oyim', 'amın-oğlu',
    'amına-k', 'amına-kodugum', 'amına-koduğum', 'amına-koyim', 'amına-koyum', 'amını-s',
    'amıs1n', 'an.anı', 'an.anın', 'an.anısikeyim', 'an.anısikim', 'an.anızın', 'an.asını',
    'an.asınısatayım', 'anan1s', 'anan1s1k', 'anan1s1kerim', 'anan1s1kım', 'anan1z1n',
    'anan1zyrrak', 'anan1zyrrk', 'ananc1', 'ananiz-i', 'ananiz-skm', 'ananiz-skym', 'ananı-s',
    'ananı-sikeyim', 'ananı-sikim', 'ananı-sıkm', 'ananın-k', 'ananın-k-i', 'ananın-ki',
    'ananıs1kiyim', 'ananıs1km', 'ananıs1kım', 'ananıslym1', 'anas1', 'anas1n1', 'anas1n1n',
    'anas1n1satayim', 'anas1nı', 'anasns1kım', 'anasını-s', 'andav4l', 'andavall1', 'angut1',
    'anuna_k0yım', 'apt4l1', 'aptal1', 'as1kt1r', 'as1lmasana', 'at-kafası',
    'av-radını', 'avrad-ini', 'avradın1s', 'azdır1c1', 'b-o-k', 'b.a.c.ı.n.ı', 'b.a.s.t.a.r.d',
    'b.i.t.c.h', 'b.k', 'b.o.k', 'b.o.k.t.a.n', 'b.o.k.u', 'b.o.k.u.m', 'b0k', 'b0kyiyen',
    'b1zır1', 'b1zırlama', 'b4cıs1', 'ba-cını', 'bac1n1', 'bac1n1n', 'bac1s1', 'bac1s1k',
    'bacı-sikik', 'bacını-s', 'bacıs1k1k', 'bacısız1', 'bamy4', 'bamyap1p1', 'basur1',
    'bedev1', 'belan1s1kım', 'belan1vers1n', 'beyn1n1skm', 'boynuzlu1', 'c.u.n.t', 'c0cuk',
    'c0mmer', 'c1b1ll1yet', 'c1ns1z', 'c1v1k', 'c4h1l', 'cebel1', 'cedd1n1', 'cıbıl1',
    'cıvık1', 'cıvıtm4', 'd-a-s-s-a-k', 'd-a-ş-a-k', 'd-a-ş-ş-a-k', 'd.a.s.s.a.k', 'd.a.ş.a.k',
    'd.a.ş.ş.a.k', 'd.o.m.a.l', 'd0mal', 'd0maldı', 'd0maldın', 'd0malt', 'd1ktıler', 'd1ldo',
    'd1ngıl', 'd1ns1z', 'd1rek', 'd4mızlık', 'd4şak', 'dall4ma', 'daltassak1', 'dalyarr4k',
    'dangalak1', 'dassag1', 'dassag1m', 'daşak1', 'daşşak1', 'döl1', 'döl1srafı', 'dölsüz1',
    'e.b.e.n.i', 'e.b.e.n.i.n', 'e.c.d.a.d.ı.n.ı', 'eb-en', 'eb-eni', 'eben1', 'eben1n',
    'eben1nk1', 'ebene1', 'ebenin-a', 'ec-dadını', 'ecdad1n1', 'ecdad1nız', 'ecdadın1',
    'ecdadın1skm', 'elıne_verdım', 'emcük1', 'enay1', 'enay1ler', 'ergen1', 'eskort1',
    'evlad1', 'evlad1m', 'evladın1', 'ez1k', 'ez1kler', 'ez1ksin', 'f.a.h.i.ş.e', 'f.c.k',
    'f.u.c.k', 'f0llos', 'f0llos_olmus', 'f1cktir', 'f1stan', 'f4h1se', 'f4h1şe', 'f4hise',
    'f4hıse', 'f4hışe', 'fck_u', 'feryad1', 'feryat1', 'g*t', 'g-a-v-a-t', 'g-ö-t',
    'g.a.v.a.t', 'g.o.t', 'g.t', 'g.tveren', 'g.ö.t', 'g.ö.t.e.l.e.k', 'g.ö.t.l.e.k',
    'g.ö.t.u', 'g.ö.t.u.n', 'g.ö.t.u.n.e', 'g.ö.t.u.n.u', 'g.ö.t.v.e.r.e.n', 'g0bek', 'g0t',
    'g0t_delıgı', 'g0t_herıf', 'g0t_oglanı', 'g0tu_kalkmıs', 'g0tunu_ye', 'g0tunun_kılı',
    'g0tveren', 'g0tverenler', 'g1b1s', 'g1b1ş', 'g1ber', 'g1berim', 'g1berler', 'g1bmek',
    'g1bt1ler', 'g4v-at', 'g4v4t', 'g4v4t1', 'g4vat', 'g4vurluk', 'g7_karısı', 'gabdız1',
    'gancık1', 'gav-at', 'gavat1', 'gavatlar1', 'gavatın_oglu', 'gavur1', 'gerdanl1k',
    'gerı_zekali', 'gerı_zekalı', 'gerızekal1', 'geveze1', 'gi-berler', 'gi-bis', 'gi-biş',
    'gi-btiler', 'go-t', 'godos1', 'godoş1', 'got-lek', 'got-u', 'got-un', 'got-une',
    'got-unu', 'got-veren', 'gu_sulu', 'gup_guru', 'gusulsuz1', 'gv-nt', 'gvnt1', 'göd0s1',
    'göd0ş1', 'göt-ü', 'götelek1', 'götü_bası', 'h-a-s-i-k-t-i-r', 'h.a.s.i.k.t.i.r',
    'h.a.s.s.i.k.t.i.r', 'h0varda', 'h4s1kt1r', 'h4s1ktır', 'h4siktir', 'h4ss1kt1r',
    'h4ssiktir', 'h4yin', 'h4ynın', 'h4yvan', 'h4yvannoğlu', 'ha-siktir', 'hadım1', 'haksız1',
    'halıs1z', 'has-iktir', 'has1kt1r', 'haysiyet-siz', 'haysıyetsız1', 'herıfın_oglu',
    'hsktr1', 'huur_cocu', 'hırdav4t', 'hırt1', 'i*ne', 'i-b-n-e', 'i.b.n.e', 'i.b.n.e.l.e.r',
    'i.d.i.o.t', 'ib-ne', 'ibne-ler', 'ibne_evladı', 'imansız1', 'it-oğlu', 'it_oğlu_it',
    'k-a-h-p-e', 'k-a-l-t-a-k', 'k-a-n-c-ı-k', 'k.a.h.b.e', 'k.a.h.p.e', 'k.a.l.t.a.k',
    'k.a.n.c.ı.k', 'k.a.ş.a.r', 'k.e.r.h.a.n.e', 'k.o.d.u.m.u.n', 'k4hbe', 'k4hpeler',
    'k4ltak', 'k4ncık', 'kahbe1', 'kaltak1', 'kancık1', 'kar1n1', 'kar1s1', 'kav-t', 'kevaş1',
    'kevaş1e', 'ko-dugum', 'm-a-l', 'm.a.l', 'm.k', 'm4l4f4t1', 'm_a_l', 'mal-afat',
    'malafat1', 'many4k1', 'manyak1', 'n*gger', 'o***pu', 'o-r-o-s-p-u', 'o-ç', 'o. çocuğu',
    'o.c', 'o.q', 'o.r.o.s.p.u', 'o.ç', 'o.çocu', 'o.çocukları', 'o_c', 'o_r_o_s_p_u', 'o_ç',
    'oglan1', 'oglan1n', 'or-ospu', 'oro-spu', 'orosbu1', 'orospu-ç', 'orsp-cocu', 'p!ç',
    'p-i-ç', 'p.e.z.e.v.e.n.k', 'p.i.c', 'p.i.ç', 'p.u.ş.t', 'p.z.v.n.k', 'p.ç', 'p1c',
    'p1cin', 'p1cini', 'p1cler', 'p1cleri', 'p1clik', 'p1cın', 'p1p1', 'p1p1ş', 'p1ç',
    'p3z3v3nk', 'pe-zevenk', 'pezo1', 'pzvng1', 'pzvnk1', 'r.s.ç', 'r.spu', 's!kt!r', 's-i-k',
    's-i-k-t-i-r', 's.i.k', 's.i.k.e.y.i.m', 's.i.k.i.m', 's.i.k.i.ş', 's.i.k.m.e',
    's.i.k.t.i.r', 's.k', 's.k.m', 's.keyim', 's.kt', 's.ktr', 's.o.k.a.r.ı.m',
    's.o.k.a.y.ı.m', 's.q', 's1-k', 's1-kerim', 's1-kt1r', 's1k', 's1k1c1', 's1k1ci', 's1k1l',
    's1k1lmis', 's1k1lmısh', 's1k1m', 's1k1mc1', 's1k1mtrak', 's1k1s', 's1k1sonik',
    's1k1y0rum', 's1k1ym', 's1k1yrum', 's1k1ş', 's1k1şc1', 's1kerim', 's1kerm', 's1kik',
    's1krm', 's1kt1r', 's1kt1rgit', 's1ktir', 's1ktirgit', 's1ktiro', 's1ktrm', 's1ktır',
    's1ktırol', 's1kyim', 's1kyım', 's1m1k', 's1m1kler', 's1muk', 's1mukler', 's1tt1m1n',
    's1tt1r', 'sa-kso', 'si-kerim', 'si-ktir', 'si.kerim', 'sik-erim', 'sik-ik', 'sik-im',
    'sik-in', 'sik-tir', 'siktir-git', 'sk-m', 'sk-tr', 'sk.m', 'sk1m', 'sk1rm', 'sk1ym',
    'sk1yım', 'skm1', 'skm1n', 'sktr1', 'skym1', 'so-karım', 'so-kayım', 'sok-arım',
    'sulalen1', 'sulalen1z1', 'sülalen1', 'sülalen1z1', 'tasag1', 'tassag1', 'tipini s.k',
    'tipinizi s.keyim', 'v4j1n4', 'v4j1na', 'y.a.r.a.k', 'y.a.r.r.a.k', 'y.a.v.ş.a.k', 'y.rak',
    'y1l1s1k', 'y1l1şık', 'y1lısık', 'y4rrak', 'ya-rrak', 'yalak4', 'yar-rak', 'yarag1',
    'yarrag1', 'yarrag1m1', 'yarram1', 'yarram1n', 'yarram1nbaş1', 'yav-sak', 'yavsak1',
    'yavşak1', 'yrrk.o.ç', 'yrrk@mc1k', 'yvsk1', 'yvsk1m', 'z1b1d1', 'z1k11m', 'z1k3y1m',
    'z1kkım', 'z1ks11n', 'z1ks1n', 'z1kım', 'ç.ü.k', 'ıbnelık1', 'ş.e.r.e.f.s.i.z', 'ahmak',
    'amsalak', 'anavrat', 'atkafası', 'avrat', 'aşağılık', 'beyinsiz', 'boynuzlu', 'büyükbaş',
    'cenabet', 'dalaksız', 'dalkavuk', 'dallama', 'deyyus', 'dingil', 'domuz', 'dönek',
    'dürzü', 'ebleh', 'embesil', 'ezik', 'eşek sıpası', 'gabdız', 'gavur', 'gevşek', 'hayvan',
    'hayvan herif', 'hergele', 'hödük', 'hırsız', 'hıyar ağası', 'idiot', 'idiyot', 'iffetsiz',
    'kafasiz', 'kafasız', 'kaypak', 'kaz kafalı', 'köpek', 'kılkuyruk', 'lavuk', 'liboş',
    'manyak', 'müptezel', 'piskopat', 'ucube', 'velet', 'yalak', 'yalaka', 'yilisik',
    'yılışık', 'zibidi', 'amm', 'amn', 'awk', 'biti', 'boku', 'buku', 'eben', 'got', 'gotu',
    'kaka', 'mk', 'oc', 'osur', 'pic', 'pici', 'sie', 'sik', 'sike', 'siki', 'skim', 'wtf',
    'zina', 'amk_', 'amına k', 'anaaann', 'analarn', 'anan1', 'anana', 'anandan', 'anani',
    'ananin', 'anann', 'ananz', 'ananı s', 'ananı_', 'ananın', 'ananınki', 'ananızın',
    'ananızın-', 'anasi', 'anayin', 'anneni', 'annenin', 'annesiz', 'anuna', 'attrrm',
    'attırdığım', 'ayagınıskm1', 'azdım', 'azdır', 'azdırıcı', 'babani', 'babanın',
    'bacak kadar', 'bacini', 'bacn', 'bacndan', 'bacy', 'bacına', 'bacının', 'basur', 'biting',
    'dalyan gibi', 'diktim', 'evlat olsa sevilmez', 'feriştah', 'ferre', 'hoşafı', 'kayyum',
    'krar', 'kukudaym', 'mezveleli', 'mincikliyim', 'monakkoluyum', 'oğlan', 'rahminde',
    'saksofon', 'sevişelim', 'tiyniyat', 'verdiimin', 'zulliyetini', 'zviyetini',
    '.ç', '@m', 'a', 'ag', 'am', 'anal', 'anan', 'anas', 'anay', 'deliği', 'e!', 'evladı',
    'feryadı', 'g', 'girsin', 'kafam', 'koca', 'kurusu', 'laciye', 'meme', 'memelerini',
    'o.', 'oe', 'oglu', 'ol', 'oğlu', 'patlak', 'tipini', 'tipinizi', 'top',
    'veren', 'verir', 'zar', 'zekalı', 'çocukları', 'amlar', 'göte', 'götler',
    'götlerde', 'götlerden', 'götlere', 'götleri', 'götlerin', 'götte', 'saksocu', 'saksocuda',
    'saksocudan', 'saksocular', 'saksoculara', 'saksocularda', 'saksoculardan', 'saksocuları',
    'saksocuların', 'saksocunun', 'saksocuya', 'saksocuyu', 'siklerde', 'siklerden', 'siklere',
    'siklerin', 'sikmemek', 'sikte', 'sikten', 'çingenede', 'çingeneden', 'çingeneler',
    'çingenelerde', 'çingenelerden', 'çingenelere', 'çingeneleri', 'çingenelerin',
    'çingenenin', 'çingeneye', 'çingeneyi', 'çingene',
  ],

  // ─── TÜRKÇE — Substring (uzun/bileşik — içinde geçse de yakala) ─────
  turkce_substr: [
    'sıktır', 'siktir', 'orosbuçuk', 'pezevenk', 'fahişe', 'orospuçocuğu', 'ovusbu', 'ocusbu', 'diktir', 'bictir', 'tictir', 'rictir', 'anasını', 'ananı',
    'babanı', 'bacını', 'götünü', 'amcık', 'taşak', 'sikeyim', 'sikiim', 'sikiyim', 'sikerim',
    'sikiyor', 'sikilmek', 'sikişmek', 'siktirgit', 'sikik', 'orospu çocuğu', 'piçlik',
    'it oğlu it', 'anasını satayım', 'amına', 'amını', 'döl', 'alagavat', 'am biti',
    'am bitii', 'am feryadı', 'am hoşafı', 'am kafa', 'am suyu', 'amcık ağızlı',
    'amcık hoşafı', 'amcıkhosafı', 'amcıklama', 'amcıklandı', 'amcıksın', 'amin oglu',
    'amina g', 'amina k', 'amina koyarim', 'amina koyayim', 'amina koyayım', 'aminako',
    'aminakoyarim', 'aminakoyim', 'amk çocuğu', 'amın feryadı', 'amın oglu', 'amın oğlu',
    'amına goyim', 'amına kodugum', 'amına kodumun', 'amına koy', 'amına koyarım',
    'amına koyayım', 'amına koyduğumun', 'amına koyim', 'amına koyyim', 'amına s',
    'amına sikem', 'amına sokam', 'amınako', 'amınakodugum', 'amınakoyarim', 'amınakoyayım',
    'amınakoyim', 'amınakoyım', 'amınasok', 'amınasokarım', 'amınasokm', 'amınasokum',
    'amınatofas', 'amını s', 'anani sikerim', 'anani sikeyim', 'ananisikerim', 'ananisikeyim',
    'ananı sikerim', 'ananı sikeyim', 'ananın am', 'ananın amı', 'ananın dölü', 'ananısikerim',
    'ananısikeyim', 'ananısikim', 'ananızın am', 'anası orospu', 'anasının am', 'anasının amı',
    'anasının gözü', 'asiktir', 'avradını siktirten', 'ayklarmalrmsikerim', 'ağzına sıçayım',
    'babaannesi kaşar', 'babası pezevenk', 'bacağına sıçayım', 'bacım sikiş', 'bok kafa',
    'bok yoluna', 'boka sarmak', 'cibiliyeti bozuk', 'dalyarrak', 'dilsiz siktir',
    'dinsiz imansız', 'döl israfı', 'dıkşın siktir', 'ebenin amı', 'eline verdim',
    'fahişe evladı', 'fantezi sikiş', 'gavat', 'gavat oğlu gavat', 'gavatn', 'gavur tohumu',
    'giberim seni', 'godoş evladı', 'gora gavatı', 'göt deliği', 'göt feryadı', 'göt herif',
    'göt kılı', 'göt lalesi', 'göt oğlanı', 'göt oğlu', 'göt veren', 'göt verir',
    'götten bacaklı', 'götveren', 'götü başı ayrı oynamak', 'götü kalkık', 'götüne koyim',
    'has siktir', 'hasiktir', 'hassiktir', 'huur çocuğu', 'ibne kılıklı', 'ibne torunu',
    'it dölü', 'it herif', 'it soyu', 'itoğlu it', 'kafam girsin', 'kahpenin',
    'kahpenin feryadı', 'kaltak karı', 'kancık evladı', 'karı kılıklı', 'kaşar herif',
    'kevaşe ruhlu', 'koca göt', 'koduğumun çocuğu', 'köpek soyu', 'kıllı göt',
    'kıvırtma siktir', 'kızıl fahişe', 'mal kafa', 'maldovya gavatı', 'manyak herif',
    'minaamcık', 'orosbu', 'orosbucocuu', 'orospu cocugu', 'orospu dölü', 'orospu evladı',
    'orospu çoc', 'orospu çocukları', 'orospu çocuğudur', 'orospucocugu', 'orospucocuklugu',
    'orospudur', 'orospular', 'orospunun', 'orospunun evladı', 'orospuydu', 'orospuyuz',
    'oruspu', 'oruspu çocuğu', 'oruspuçocuğu', 'osuruktan teyyare', 'oç evladı', 'oğlu it',
    'patlak zar', 'pezevengin evladı', 'pezevenk oğlu', 'pezevenklik', 'piç kurusu',
    'piçin oğlu', 'siki tutmak', 'sikik herif', 'sikiş', 'sikişen', 'sikişme', 'siktir et',
    'siktir git', 'siktir git lan', 'siktir lan', 'siktir ol git', 'siktirhadi', 'siktirir',
    'siktiririm', 'siktiriyor', 'siktirolgit', 'sülalesini siktigim', 'taşşak', 'veled i zina',
    'yararmorospunun', 'yarrağ', 'yarrağım', 'yarrağımı', 'yavşak oğlu', 'yavşaktır',
    'amcıklar', 'amcıklara', 'amcıklarda', 'amcıklardan', 'amcıkları', 'amcıkların', 'amcıkta',
    'amcıktan', 'amcığa', 'götverende', 'götverenden', 'götverene', 'götvereni', 'götverenin',
    'götverenler', 'götverenlerde', 'götverenlerden', 'götverenlere', 'götverenleri',
    'götverenlerin', 'kaltaklar', 'kaltaklara', 'kaltaklarda', 'kaltaklardan', 'kaltakları',
    'kaltakların', 'kaltakta', 'kaltaktan', 'kaltağa', 'kaltağı', 'kaltağın', 'orospuda',
    'orospudan', 'orospulara', 'orospularda', 'orospulardan', 'orospuları', 'orospuların',
    'orospuya', 'orospuyu', 'taşaklar', 'taşaklara', 'taşaklarda', 'taşaklardan', 'taşakları',
    'taşakların', 'taşakta', 'taşaktan', 'taşağın', 'yaraklar', 'yaraklara', 'yaraklarda',
    'yaraklardan', 'yarakları', 'yarakların', 'yarakta', 'yaraktan', 'yarağa', 'yarağı',
    'yarağın', 'otuz birci', 'otuz bircide', 'otuz birciden', 'otuz birciler',
    'otuz bircilerde', 'otuz bircilerden', 'otuz bircilere', 'otuz bircileri',
    'otuz bircilerin', 'otuz bircinin', 'otuz birciye', 'otuz birciyi', 'siker sikmez',
    'sikilir sikilmez', 'siktirir siktirmez',
  ],

  // ─── İNGİLİZCE — Tam kelime ─────
  ingilizce_exact: [
    'ass', 'fag', 'shit', 'fuck', 'cunt', 'slut', 'bitch', 'prick', 'twat', 'wanker', 'dick',
    'cock', 'nigga', 'crap', 'damn', 'arse', 'arsed', 'arsehole', 'arseholes', 'arses',
    'bitche', 'bitchs', 'bitchy', 'bullcrap', 'chink', 'chinks', 'cunts', 'douche',
    'douchebaggery', 'douchebaggy', 'douchebags', 'douches', 'douchey', 'dumbassed',
    'dumbassery', 'dumbasses', 'fuckas', 'fucked', 'fuckee', 'fuckem', 'fucken', 'fuckes',
    'fucket', 'fuckig', 'fuckit', 'fuckme', 'fuckng', 'fucks', 'fuckup', 'kike', 'pussies',
    'shite', 'shited', 'shiter', 'shites', 'shits', 'shitte', 'shittt', 'shitty', 'squaw',
    'turd', 'turds', 'wank', 'wanked', 'wankers', 'wanking', 'wanks', 'wop', 'bastards',
    'camwhore', 'camwhores', 'crackwhore', 'fage', 'faget', 'fagg', 'fagged', 'fagget',
    'fagging', 'faggit', 'faggits', 'faggoting', 'faggotry', 'faggots', 'faggotty', 'faggoty',
    'faggy', 'fago', 'fagot', 'fagots', 'fags', 'famewhore', 'honky', 'horndog', 'kinderwhore',
    'manwhore', 'manwhores', 'nympho', 'nymphos', 'pedo', 'pedophile', 'pedophiles',
    'pedophilia', 'perv', 'pervert', 'pervs', 'poof', 'poofs', 'poofy', 'sicko', 'sickos',
    'slutbag', 'sluts', 'slutt', 'slutted', 'sluttery', 'sluttier', 'sluttiest', 'sluttiness',
    'slutting', 'sluttish', 'slutts', 'sluttty', 'slutty', 'slutwife', 'sluty', 'slutz',
    'superslut', 'twats', 'twatt', 'twatted', 'twatter', 'twatting', 'twattish', 'twatts',
    'twatty', 'twatwaffle', 'whored', 'whorehouse', 'whoreing', 'whoremonger', 'whores',
    'whoreson', 'crapload', 'crapola', 'crapped', 'crapper', 'crapping', 'crappy', 'craps',
    'crapshoot', 'craptastic', 'crapware', 'cuck', 'cuckold', 'cuckolded', 'cuckolding',
    'damnable', 'damnation', 'damndest', 'damned', 'damnedest', 'damning', 'damnit', 'damns',
    'fart', 'farted', 'farting', 'farts', 'goddamned', 'kickass', 'suck', 'sucka', 'sucked',
    'sucker', 'suckers', 'suckin', 'sucking', 'sucks', 'sucky', 'dimwit', 'fatso', 'floozy',
    'halfwit', 'hussy', 'meathead', 'numskull', 'piss', 'pissed', 'pisses', 'pissing',
    'schmuck', 'toerag', 'trollop', 'wench', 'wuss', 'wussy', 'sexier', 'sexiest', 'sexily',
    'sexiness', 'sexual', 'sexually', 'sexy', 'aboslute', 'aboslutely', 'abslutely', 'accunt',
    'acocunt', 'adcock', 'admfuckermate', 'agoblowjob', 'agodamn', 'agofuck', 'agofucking',
    'aishiteru', 'allhomeporn', 'alotporn', 'alphagaycock', 'alphaporno', 'analfuck',
    'analfucked', 'analfucking', 'animalporn', 'antiporn', 'anudder', 'anyporn', 'arseblog',
    'arsen', 'arsenate', 'arsenates', 'arsenide', 'arsenides', 'arsenious', 'arsenite',
    'arsenobetaine', 'arsenokoitai', 'arsenokoites', 'arsenopyrite', 'arsewipe', 'arsey',
    'artits', 'ashita', 'ashitaba', 'assed', 'assfucks', 'asspussy', 'asswipe', 'asswipes',
    'atits', 'atittude', 'attittude', 'autococker', 'autocockers', 'aycockonxion', 'babcock',
    'badcock', 'ballcock', 'bareback', 'barebacking', 'barf', 'barfed', 'barfi', 'barfight',
    'barfine', 'barfing', 'barflies', 'barfly', 'barfs', 'barfy', 'bartitsu', 'bastarda',
    'bastardi', 'bastardisation', 'bastardise', 'bastardised', 'bastardising',
    'bastardization', 'bastardizations', 'bastardize', 'bastardized', 'bastardizes',
    'bastardizing', 'bastardly', 'bastardo', 'bastardry', 'bastardy', 'batcrap', 'bbdshemale',
    'bedamned', 'belch', 'belched', 'belcher', 'belcheri', 'belches', 'belching',
    'bestgayporno', 'bhagpuss', 'bigayporn', 'bigblackcock', 'bigboob', 'bigboobs',
    'bigcocked', 'bigcocks', 'bigdick', 'bigdickvideos', 'bigtitted', 'bigtitts', 'birdshit',
    'blackcock', 'blackdick', 'blacknude', 'blackporn', 'blooksuckers', 'bluberries',
    'bluberry', 'bluetits', 'boink', 'boinked', 'boinking', 'boinks', 'booba', 'boobage',
    'boobalicious', 'boobbs', 'boober', 'boobery', 'boobes', 'boobing', 'boobjob', 'boobless',
    'boobms', 'booboisie', 'boobpedia', 'boobquake', 'boobtastic', 'boobtube', 'boobytrap',
    'boobytrapped', 'boobytraps', 'boobz', 'booz', 'booze', 'boozed', 'boozer', 'boozers',
    'boozing', 'boozy', 'boyfriendnudes', 'brainfart', 'brainfarts', 'brainfuck', 'brushite',
    'bugfuck', 'bullshite', 'bullshiting', 'bullshits', 'bullshitted', 'bullshitter',
    'bullshitters', 'bullshittery', 'bullshitthis', 'bullshittin', 'bullshitty', 'bulshit',
    'bum', 'bumblefuck', 'bumfuck', 'bums', 'bushite', 'bushtits', 'butits', 'buttfuck',
    'buttfucked', 'buttfucking', 'buzzcocks', 'celebitchy', 'celebsnude', 'chainsuck',
    'chapcrap', 'chashitsu', 'chickenshits', 'childporn', 'chinkapin', 'chinkara', 'chinky',
    'chitranna', 'clitellum', 'clitheroe', 'clitorises', 'clitoromegaly', 'clitty', 'clube',
    'clubes', 'clusterfucks', 'cocka', 'cockade', 'cockades', 'cockamamie', 'cockamamy',
    'cockbig', 'cockblock', 'cockblocked', 'cockblocker', 'cockblocking', 'cockblocks',
    'cockburn', 'cockby', 'cockchafer', 'cockchafers', 'cockcrow', 'cocke', 'cocked', 'cocker',
    'cockeral', 'cockerpoo', 'cockers', 'cockerspaniel', 'cockeyed', 'cockfight',
    'cockfighters', 'cockfighting', 'cockfights', 'cockhttp', 'cockhungry', 'cockier',
    'cockies', 'cockiest', 'cockily', 'cockin', 'cockiness', 'cockk', 'cockks', 'cockle',
    'cocklebur', 'cockleburs', 'cockles', 'cockleshell', 'cocklicking', 'cockling', 'cockmeat',
    'cockold', 'cockpit', 'cockpits', 'cockriding', 'cockring', 'cockrings', 'cockscomb',
    'cockscombs', 'cocksfoot', 'cockshaft', 'cockslut', 'cocksman', 'cocksmen', 'cockspur',
    'cocksure', 'cocksureness', 'cocktease', 'cockup', 'cockups', 'cocky', 'cockylatinos',
    'cockyness', 'cockysimon', 'comfartable', 'cowshit', 'crackhead', 'crackheads', 'crapaud',
    'crapby', 'crapcrap', 'crape', 'craped', 'crapemyrtle', 'crapes', 'crapfest', 'crapflood',
    'craphole', 'crapiness', 'craping', 'crapless', 'craploads', 'crapmatic', 'crapness',
    'crapp', 'crappers', 'crappest', 'crappie', 'crappiei', 'crappier', 'crappies',
    'crappiest', 'crappily', 'crappin', 'crappiness', 'crappity', 'crapple', 'crappola',
    'crapsack', 'crapshoots', 'crapstorm', 'craptacular', 'crapton', 'craptop', 'crapulence',
    'crapulent', 'crapulous', 'crapy', 'crazyshit', 'crunchies', 'cucked', 'cuckhold',
    'cucking', 'cuckoldress', 'cuckoldry', 'cuckolds', 'cuckquean', 'cucks', 'cuckservative',
    'cuckservatives', 'cucky', 'cumaru', 'cumb', 'cumber',
    'cumberbatch', 'cumberbund', 'cumbered', 'cumbers', 'cumblast', 'cumblastcity', 'cumbre',
    'cumbrous', 'cumby', 'cumdump', 'cumdumpster', 'cume', 'cumeating', 'cumecs', 'cumed',
    'cumene', 'cumes', 'cumfaced', 'cumfiesta', 'cumfy', 'cumi', 'cumingii', 'cumini',
    'cuminmouth', 'cumload', 'cumloads', 'cumm', 'cummer', 'cummers', 'cummin', 'cummings',
    'cummins', 'cummm', 'cummon', 'cummulative', 'cummunity', 'cummy', 'cumpara', 'cumparare',
    'cumpilation', 'cumple', 'cumplir', 'cumputer', 'cumquat', 'cumquats', 'cumshoot',
    'cumshow', 'cumslut', 'cumsluts', 'cumsprayed', 'cumstance', 'cumswallow', 'cumswap',
    'cumswapping', 'cuntal', 'cunted', 'cunthole', 'cunting', 'cuntish', 'cuntlips',
    'cuntries', 'cuntry', 'cuntt', 'cuntts', 'cunty', 'cyberporn', 'dabitch', 'dagos',
    'damnably', 'damnatio', 'damnations', 'damndelicious', 'damnest', 'damningly', 'damnn',
    'damnnn', 'damnnnn', 'damnum', 'darkie', 'darkies', 'ddamn', 'deadass', 'deadeyedick',
    'decock', 'decocked', 'decocker', 'decocking', 'deepthroated', 'deepthroater', 'defleshed',
    'defleshing', 'democrap', 'democraps', 'denudata', 'denudation', 'denude', 'denuded',
    'denuder', 'denudes', 'denuding', 'deshita', 'desnuda', 'desnudas', 'desnudo', 'desnudos',
    'dickbag', 'dickbags', 'dickby', 'dicke', 'dicken', 'dickens', 'dicker', 'dickered',
    'dickering', 'dickerson', 'dickery', 'dickey', 'dickeys', 'dickface', 'dickfreckle',
    'dickgirl', 'dickgirls', 'dickheaded', 'dickhole', 'dickie', 'dickies', 'dickin',
    'dickinson', 'dickishness', 'dickite', 'dickks', 'dickless', 'dickory', 'dickplenty',
    'dickriding', 'dickson', 'dickspicks', 'dickss', 'dicksucking', 'dickwad', 'dickwads',
    'dickweed', 'dickweeds', 'dickwolves', 'dicky', 'dicunt', 'dicuntur', 'diflubenzuron',
    'dimwits', 'dimwitted', 'dimwittedness', 'disocunt', 'dogfart', 'doggyfuck', 'dogshit',
    'donged', 'dontfuckmyass', 'douch', 'douchbag', 'douchbaggery', 'douchbags', 'douchecanoe',
    'douched', 'douchenozzle', 'douchenozzles', 'doucher', 'douchery', 'douchie', 'douchier',
    'douchiest', 'douchiness', 'douching', 'douchy', 'dumbfuck', 'dumbfuckery', 'dumbfucks',
    'dumbshit', 'dumbshits', 'ebonynude', 'ejaculate', 'ejaculated', 'ejaculates',
    'ejaculating', 'ejaculation', 'ejaculations', 'ejaculator', 'ejaculators', 'ejaculatory',
    'enfleshed', 'facefuck', 'facefucked', 'facefucking', 'faclities', 'faginea', 'fagioli',
    'fagisuga', 'fagotto', 'fagus', 'famewhores', 'familyporn', 'fanfic', 'fanfiction', 'fapd',
    'fapdu', 'fape', 'fappable', 'fapped', 'fappening', 'faps', 'farter', 'farters',
    'fartface', 'fartglitter', 'farthe', 'farti', 'fartin', 'fartlek', 'fartleks', 'fartsy',
    'farty', 'fatsos', 'fcuk', 'fingerfuck', 'fingerfucked', 'fingerfucking', 'fingerfucks',
    'fistfuck', 'fistfucking', 'flamer', 'flesh', 'fleshand', 'fleshed', 'flesher', 'fleshes',
    'fleshie', 'fleshier', 'fleshies', 'fleshiness', 'fleshing', 'fleshisgrass', 'fleshjack',
    'fleshless', 'fleshlight', 'fleshlights', 'fleshly', 'fleshpots', 'fleshtone',
    'fleshtones', 'fleshy', 'floozie', 'floozies', 'foodporn', 'forcefuck', 'forcefuckers',
    'fornicata', 'fornicate', 'fornicated', 'fornicates', 'fornicating', 'fornication',
    'fornications', 'fornicator', 'fornicators', 'fornicatus', 'fouler', 'freecock',
    'freegaypornos', 'freeporn', 'freesluts', 'frigg', 'frigga', 'friggin', 'frigging',
    'fucka', 'fuckd', 'fucke', 'fucki', 'fuckk', 'fuckn', 'fucko', 'fuckt', 'fucky',
    'gamecock', 'gamecocks', 'gaminwench', 'gangbanger', 'gangbangin', 'gangbanging',
    'gangbangsquad', 'gaycockmaster', 'gayporn', 'gearslutz', 'genderfuck', 'girlsnude',
    'givemegaydick', 'gnudi', 'goatsucker', 'gobshite', 'gobshites', 'godamn', 'godamned',
    'goddamnit', 'gotdamn', 'gotporn', 'gozaimashita', 'grouch', 'grouched', 'grouches',
    'grouchier', 'grouchiest', 'grouchily', 'grouching', 'groucho', 'grouchy', 'grumpyoldfart',
    'hairypussy', 'halfwits', 'halfwitted', 'hardfuck', 'harshit', 'hatefuck', 'hatefucked',
    'haycock', 'headfuck', 'hentaiporn', 'heteroclite', 'highasfuck', 'hobo', 'hoboes',
    'hoboing', 'hobos', 'holyshit', 'homeporn', 'honkyoku', 'honkytonk', 'honkytonks',
    'hooker', 'hookeri', 'hookeriana', 'hookerianum', 'hookers', 'horning', 'hornist',
    'hornygaydick', 'hornymon', 'hornyness', 'horsecock', 'horsecrap', 'horseflesh',
    'hugecock', 'hugecocked', 'hugecocks', 'hugetits', 'icrap', 'incestporn', 'incestporno',
    'iporn', 'iporntv', 'iridocyclitis', 'ishitha', 'itits', 'jackshit', 'jarbarf', 'javporn',
    'jizzes', 'jizzhut', 'jizzing', 'jizzload', 'jizzster', 'jizzum', 'jizzy', 'kickasstube',
    'kikes', 'kikester', 'konuda', 'kuroshitsuji', 'ladyboygold', 'lech', 'lecha', 'leche',
    'lechem', 'lecher', 'lecherous', 'lecherously', 'lechers', 'lechery', 'leches', 'leching',
    'lechleri', 'lechon', 'lechuguilla', 'lechwe', 'lesbianporn', 'lesbianporno', 'lubeltri',
    'macadamnut', 'makushita', 'manboobs', 'manflesh', 'masterbatch', 'masterbatches',
    'masterbated', 'masterbates', 'masterbath', 'masturbat', 'masturbater', 'masturbatin',
    'masturbators', 'maxcuckold', 'meatheads', 'medick', 'megaporn', 'megasquirt', 'menudo',
    'mikegrouchy', 'milker', 'milkers', 'mindfuck', 'mindfucked', 'mindfuckery', 'mindfucking',
    'mindfucks', 'mishit', 'mishits', 'missgamecock', 'monstercock', 'mothafucka',
    'mothafuckas', 'mothafuckin', 'mouthfuck', 'moviesporn', 'mporn', 'multivibrator',
    'multivibrators', 'muthafucka', 'muthafuckas', 'muthafucker', 'muthafuckers',
    'muthafuckin', 'muthafucking', 'naturaltits', 'needcockinass', 'nonnude', 'nonude', 'nud',
    'nuda', 'nuddy', 'nudegirls', 'nudegrils', 'nudelittle', 'nudeness', 'nudenude', 'nudeo',
    'nudepics', 'nudepicture', 'nudepictures', 'nudepush', 'nuder', 'nudesex', 'nudest',
    'nudewoman', 'nudewomen', 'nudey', 'nudez', 'nudged', 'nudger', 'nudges', 'nudging',
    'nudgings', 'nudi', 'nudibranch', 'nudibranches', 'nudibranchs', 'nudicaule', 'nudicaulis',
    'nudies', 'nudiest', 'nudiflora', 'nudiflorum', 'nudis', 'nudnik', 'nudo', 'nudone',
    'nudu', 'nudum', 'nudus', 'nudy', 'numskulls', 'nymphomania', 'nymphomaniac',
    'nymphomaniacal', 'nymphomaniacs', 'octopussy', 'ofart', 'oik', 'oiks', 'oldfart',
    'oldfarthenry', 'oneeyeddick', 'orgies', 'orgy', 'painslut', 'peacockery', 'peacocking',
    'peacocky', 'pedology', 'pedophiliac', 'pedophilic', 'pee', 'peed', 'peeing', 'perverted',
    'pervertedly', 'pervertedness', 'perverters', 'perverteth', 'perverting', 'perverts',
    'petcock', 'petcocks', 'petits', 'pettitte', 'phobos', 'piercedpussy', 'pigshit', 'pocock',
    'poo', 'pooed', 'poop', 'pooped', 'pooper', 'poopers', 'poopiebitch', 'pooping', 'poops',
    'poopy', 'poppycock', 'porna', 'pornaccess', 'pornagraphic', 'pornagraphy', 'pornanytim',
    'pornasian', 'pornbb', 'pornbig', 'porncraft', 'pornd', 'porndownload', 'porne', 'porneia',
    'pornfilm', 'pornforced', 'pornfree', 'porngirl', 'porngirls', 'pornhost', 'pornhot',
    'porni', 'pornici', 'pornification', 'pornified', 'pornincest', 'pornjapan',
    'pornjapanese', 'pornlarge', 'pornloverx', 'pornmobi', 'pornmovi', 'pornmovie',
    'pornmovies', 'pornn', 'pornno', 'pornodroid', 'pornofilm', 'pornofilme', 'pornofilms',
    'pornofree', 'pornografia', 'pornoid', 'pornolari', 'pornomovies', 'pornorape', 'pornosex',
    'pornostar', 'pornosu', 'pornotube', 'pornovideo', 'pornovideos', 'pornoxo', 'pornoz',
    'pornpics', 'pornporn', 'pornporno', 'pornprom', 'pornpros', 'pornrape', 'pornreal',
    'pornsex', 'pornsexy', 'pornsharia', 'pornsite', 'pornsites', 'pornstache', 'pornteen',
    'porntubes', 'pornvideo', 'pornvideos', 'pornvids', 'pornx', 'porny', 'pornyoung',
    'postits', 'potranno', 'pporn', 'prepubescence', 'prepubescent', 'prepubescents', 'pube',
    'pubens', 'puber', 'puberulent', 'puberulous', 'pubescence', 'pubescens', 'pubescent',
    'pubescents', 'puke', 'puked', 'pukeko', 'puker', 'pukers', 'pukes', 'pukey', 'puking',
    'purenudism', 'pusse', 'pussed', 'pusser', 'pusses', 'pussey', 'pussi', 'pussie',
    'pussied', 'pussification', 'pussified', 'pussing', 'pussology', 'pussssy', 'pusssy',
    'pusst', 'pussu', 'pussybow', 'pussyboy', 'pussyby', 'pussyclothed', 'pussyeating',
    'pussyfuck', 'pussyfucked', 'pussyfucking', 'pussyhat', 'pussyhats', 'pussyhole',
    'pussyhttp', 'pussying', 'pussylicked', 'pussylicking', 'pussylips', 'pussyplay',
    'pussyrubbing', 'pussyspace', 'pussytoes', 'pussywhipped', 'pussywillow', 'pussywillows',
    'rapeporn', 'rapeporno', 'rapeporntube', 'ratfucking', 'ratshit', 'recock', 'recocking',
    'reddick', 'redick', 'redneck', 'rednecked', 'rednecks', 'rednecky', 'rehoboth', 'relube',
    'relubed', 'repuke', 'repukes', 'reslut', 'resluts', 'riddick', 'robohobo', 'roughfucked',
    'schmuckers', 'schmucks', 'schmucky', 'scockery', 'scrounger', 'scroungers', 'seacock',
    'seacocks', 'seersucker', 'selfsuck', 'seminude', 'sexa', 'sexaholic', 'sexanimal',
    'sexasian', 'sexaudition', 'sexaul', 'sexay', 'sexbb', 'sexbig', 'sexbomb', 'sexbot',
    'sexbots', 'sexby', 'sexc', 'sexcam', 'sexcams', 'sexcapade', 'sexcapades', 'sexchat',
    'sexcom', 'sexconker', 'sexcraft', 'sexcy', 'sexdating', 'sexdoll', 'sexdownload',
    'sexdrive', 'sexer', 'sexercise', 'sexers', 'sexeskimo', 'sexey', 'sexfight', 'sexfilm',
    'sexforced', 'sexfree', 'sexfuck', 'sexgames', 'sexgay', 'sexgirl', 'sexgirls',
    'sexgrafia', 'sexgraph', 'sexgraphers', 'sexgraphic', 'sexhd', 'sexhost', 'sexhot',
    'sexhub', 'sexie', 'sexies', 'sexified', 'sexify', 'sexii', 'sexin', 'sexincest',
    'sexjapan', 'sexjapanese', 'sexkcd', 'sexlessness', 'sexlife', 'sexly', 'sexmom',
    'sexmovie', 'sexmovies', 'sexn', 'sexold', 'sexos', 'sexp', 'sexparty', 'sexperience',
    'sexperts', 'sexphone', 'sexpics', 'sexpicture', 'sexpictures', 'sexpistols', 'sexplay',
    'sexploits', 'sexporn', 'sexporno', 'sexposition', 'sexpots', 'sexrape', 'sexreal',
    'sexsex', 'sexsexy', 'sexshop', 'sexsi', 'sexsign', 'sexsite', 'sexsites', 'sexsomnia',
    'sexstarbook', 'sexstories', 'sexstory', 'sexsy', 'sexta', 'sextapes', 'sextastic',
    'sexted', 'sexteen', 'sexter', 'sextet', 'sextets', 'sexthe', 'sextic', 'sextile',
    'sextiles', 'sexto', 'sextodecimo', 'sexton', 'sextons', 'sextortion', 'sextoy',
    'sextoying', 'sextoys', 'sexts', 'sextub', 'sextuple', 'sextupled', 'sextuplet',
    'sextuplets', 'sextupole', 'sextus', 'sexu', 'sexua', 'sexuales', 'sexuall', 'sexuallity',
    'sexuals', 'sexualy', 'sexualz', 'sexuel', 'sexuelle', 'sexus', 'sexvedio', 'sexvid',
    'sexvideo', 'sexvideos', 'sexvids', 'sexwife', 'sexwith', 'sexworld', 'sexx', 'sexxi',
    'sexxx', 'sexxxx', 'sexxxy', 'sexxy', 'sexyandfamous', 'sexybabes', 'sexyback', 'sexyby',
    'sexyest', 'sexygirls', 'sexynaked', 'sexyness', 'sexyoung', 'sexyphil', 'sexypics',
    'sexyporn', 'sexyrobot', 'sexys', 'sexytime', 'sexytimes', 'sexyy', 'shecock', 'shecocks',
    'shishito', 'shita', 'shitaki', 'shiting', 'shito', 'shitt', 'shity', 'shitz', 'shonky',
    'sickout', 'sideboob', 'skullfuck', 'skycraper', 'skycrapers', 'slob', 'slobber',
    'slobbered', 'slobbering', 'slobbery', 'sloboda', 'slobs', 'slutby', 'slutiest',
    'slutload', 'slutwalk', 'smalltits', 'snigger', 'sniggering', 'snot', 'snotling',
    'snotlings', 'snotrocket', 'snots', 'snotted', 'snottier', 'snottiest', 'snottily',
    'snottiness', 'snotting', 'snotty', 'snowcock', 'softporn', 'someshit', 'sonofabitch',
    'sonovabitch', 'sonsabitches', 'sonsofbitches', 'sonuvabitch', 'sourpuss', 'sourpusses',
    'spit', 'spitball', 'spitballing', 'spitballs', 'spitbull', 'spiti', 'spiting',
    'spititual', 'spitless', 'spitoon', 'spitroast', 'spitroasted', 'spitroasting', 'spits',
    'spitta', 'spitted', 'spitter', 'spitters', 'spittin', 'spitting', 'spittle', 'spittlebug',
    'spittlebugs', 'spittoon', 'spittoons', 'spitty', 'spitup', 'spitwads', 'spitz', 'spitzak',
    'spitze', 'spitzerella', 'sporn', 'squawfish', 'squaws', 'squirtin', 'squirtings',
    'squirtle', 'squirty', 'starfucker', 'steamygayporn', 'stevepusser', 'stink', 'stinkbait',
    'stinkbomb', 'stinkbug', 'stinkbugs', 'stinked', 'stinken', 'stinker', 'stinkers',
    'stinketh', 'stinkeye', 'stinkface', 'stinkhole', 'stinkhorn', 'stinkhorns', 'stinkier',
    'stinkies', 'stinkiest', 'stinkin', 'stinkiness', 'stinking', 'stinkingly', 'stinko',
    'stinkpot', 'stinks', 'stinkweed', 'stinkwood', 'stinky', 'stinkycheese', 'stinkysaurus',
    'stitting', 'stopcock', 'stopcocks', 'strop', 'strophe', 'strophes', 'stropping',
    'stroppy', 'suckable', 'suckage', 'suckah', 'suckas', 'suckass', 'suckaz', 'sucke',
    'suckerfish', 'suckering', 'suckermouth', 'suckerpunch', 'suckerpunched', 'suckes',
    'sucketh', 'suckfest', 'suckgaycock', 'suckhole', 'sucki', 'suckie', 'suckier', 'suckiest',
    'suckiness', 'suckings', 'suckish', 'suckit', 'suckitude', 'sucklings', 'suckmymuscle',
    'suckout', 'suckouts', 'sucktastic', 'sucktitude', 'suckup', 'suckups', 'sumbitch',
    'sumbitches', 'sunporno', 'sureporn', 'takeshita', 'teenporn', 'thoughtsdick', 'threesome',
    'threesomes', 'throatfuck', 'throatfucked', 'throatfucking', 'thunderpuss', 'tightwad',
    'tightwads', 'timesuck', 'titfuck', 'titfucked', 'titfucking', 'titfucks', 'titsbig',
    'titsup', 'titt', 'titta', 'tittanfall', 'tittays', 'titten', 'tittes', 'tittie',
    'tittied', 'tittilating', 'tittle', 'tittled', 'tittles', 'titts', 'tittties', 'tittyfuck',
    'tittyfucking', 'tittyfucks', 'tittys', 'tofuck', 'towelhead', 'towelheads', 'tranne',
    'trannie', 'tranning', 'transvestite', 'transvestites', 'trollops', 'tubeporn', 'turday',
    'turdy', 'uncock', 'uncocked', 'underboob', 'underboobs', 'underfucked', 'unfuck',
    'unfuckable', 'unfucked', 'unfucking', 'unfuckwithable', 'uniboob', 'unsuckdcmetro',
    'upchuck', 'upchucked', 'upchucking', 'upskirted', 'upskirting', 'userporn', 'videoporn',
    'videosporn', 'vporn', 'vrporn', 'wankby', 'wankel', 'wankery', 'wankfest', 'wankiam',
    'wankin', 'wankingby', 'wanksta', 'wanky', 'weathercock', 'weathercocks', 'wenches',
    'wenching', 'wetpussy', 'whoreby', 'whoredom', 'whoredoms', 'whoreholes', 'whorehouses',
    'whoremaster', 'whoremongers', 'whorey', 'wilcock', 'wino', 'winofiend', 'winos', 'winow',
    'winows', 'womanizer', 'womanizers', 'woodcock', 'woodcocks', 'wopping', 'wops', 'wopuld',
    'wusses', 'xxxporn', 'yamashita', 'yob', 'yobs', 'youjizz', 'youngporn',
  ],

  // ─── İNGİLİZCE — Substring ─────
  ingilizce_substr: [
    'motherfuck', 'bullshit', 'jackass', 'dumbass', 'dipshit', 'douchebag', 'asshole',
    'bastard', 'nigger', 'faggot', 'whore', 'pussy', 'stfu', 'gtfo', 'kys', 'kill yourself',
    'son of a bitch', 'apeshit', 'assfuck', 'assfucked', 'assfucking', 'assholes', 'batshit',
    'bitchass', 'bitchassness', 'bitchboy', 'bitched', 'bitchen', 'bitchers', 'bitchery',
    'bitches', 'bitchez', 'bitchface', 'bitchfest', 'bitchie', 'bitchier', 'bitchiest',
    'bitchily', 'bitchin', 'bitchiness', 'bitching', 'bitchitude', 'bitchslap', 'bitchslapped',
    'bitchslapping', 'bitchslaps', 'bullshitting', 'chickenshit', 'clusterfuck', 'dipshits',
    'fuckability', 'fuckable', 'fuckall', 'fuckathon', 'fuckbook', 'fuckbox', 'fuckboy',
    'fuckboys', 'fuckbuddies', 'fuckbuddy', 'fuckdoll', 'fuckers', 'fuckery', 'fuckface',
    'fuckfaces', 'fuckfest', 'fuckhead', 'fuckheads', 'fuckhole', 'fuckholes', 'fuckign',
    'fuckiing', 'fuckimg', 'fuckincest', 'fuckings', 'fuckity', 'fuckking', 'fuckload',
    'fuckloads', 'fuckmate', 'fuckmates', 'fucknut', 'fucknuts', 'fuckoff', 'fuckpole',
    'fuckrape', 'fucksake', 'fuckslut', 'fuckstick', 'fucksticks', 'fucktard', 'fucktarded',
    'fucktards', 'fucktastic', 'fuckton', 'fucktoy', 'fucktoys', 'fuckups', 'fuckwad',
    'fuckwads', 'fuckwit', 'fuckwits', 'fuckwitted', 'fuckwittery', 'fuckyou', 'horseshit',
    'motherfucka', 'motherfuckers', 'motherfuckin', 'motherfucking', 'mutherfucker',
    'mutherfuckers', 'mutherfucking', 'niggers', 'shitass', 'shitastic', 'shitbag', 'shitbags',
    'shitballs', 'shitbird', 'shitbirds', 'shitbox', 'shitboxes', 'shitcan', 'shitcanned',
    'shiteous', 'shitface', 'shitfaced', 'shitfest', 'shithead', 'shitheads', 'shitheap',
    'shitheel', 'shitheels', 'shithole', 'shitholes', 'shithouse', 'shitkicker', 'shitkickers',
    'shitless', 'shitlib', 'shitlibs', 'shitlist', 'shitload', 'shitloads', 'shitlord',
    'shitlords', 'shitness', 'shitpile', 'shitpost', 'shitposter', 'shitposters',
    'shitposting', 'shitposts', 'shitshow', 'shitstain', 'shitstains', 'shitstorm',
    'shitstorms', 'shittastic', 'shitted', 'shitter', 'shitters', 'shittest', 'shittier',
    'shittiest', 'shittily', 'shittin', 'shittiness', 'shitting', 'shitton', 'shittyness',
    'youfuck',
  ],

  // ─── CİNSEL İÇERİK ─────
  cinsel_exact: [
    'porno', 'porn', 'nude', 'nudes', 'naked', 'xxx', 'boner', 'bosalmak', 'boşalmak',
    'cinsel obje', 'dildo', 'penis', 'pipi', 'pipiş', 'sakso', 'saxo', 'seks', 'sex', 'sexs',
    'sperm', 'travesti', 'vajina', 'vajinanı', 'bdsm', 'bigcock', 'bigtits', 'blowjob',
    'blowjobs', 'boners', 'boob', 'boobed', 'boobie', 'boobies', 'boobs', 'booby', 'cameltoe',
    'cameltoes', 'clit', 'clitoral', 'clitoris', 'clits', 'cockhead', 'cocks', 'cocksuck',
    'cocksucker', 'cocksuckers', 'cocksucking', 'creampie', 'creampied', 'creampies', 'cum',
    'cuming', 'cummed', 'cumming', 'cums', 'cumshot', 'cumshots', 'deepthroat',
    'deepthroating', 'deepthroats', 'dicked', 'dickhead', 'dickheads', 'dicking', 'dickish',
    'dicks', 'fap', 'fapping', 'gangbang', 'gangbanged', 'gangbangers', 'gangbangs', 'handjob',
    'handjobs', 'hornier', 'horniest', 'horniness', 'horny', 'jizz', 'jizzed', 'ladyboy',
    'ladyboys', 'lube', 'lubed', 'lubes', 'masterbate', 'masterbating', 'masterbation',
    'masturbate', 'masturbated', 'masturbates', 'masturbating', 'masturbations', 'masturbator',
    'masturbatory', 'milf', 'milfs', 'milfseeker', 'nsfw', 'nudie', 'nudism', 'nudist',
    'nudists', 'nudity', 'pornos', 'porns', 'Purna', 'Purnas', 'facking', 'fack', 'fac', 'puss', 'pussys', 'sexe', 'sexed',
    'sexes', 'sexgraphy', 'sexi', 'sexing', 'sexless', 'sexo', 'sexpert', 'sexploitation',
    'sexpot', 'sexstar', 'sexstars', 'sext', 'sextape', 'sexting', 'shemale', 'shemales',
    'squirt', 'squirted', 'squirter', 'squirters', 'squirting', 'squirts', 'tits', 'titted',
    'titties', 'titty', 'trannies', 'tranny', 'trannys', 'upskirt', 'upskirts', 'vibrator',
    'vibrators',
  ],

  cinsel_substr: [
    'pornhub', 'xvideo', 'xhamster', 'hentai', 'mastürbasyon', 'masturbation', 'masturbasyon',
    'mastırbasyon', 'pornstar', 'pornstars', 'porntube', 'sextube', 'youporn',
  ],

  // ─── ŞİDDET / TEHDİT ─────
  siddet_substr: [
    'seni öldüreceğim', 'i kill you', 'imma kill', 'die bitch', 'go die', 'geberteyim',
    'kafanı kırarım',
  ],

};

// Runtime'da eklenen özel kelimeler
const CUSTOM_WORDS_EXACT  = [];
const CUSTOM_WORDS_SUBSTR = [];

// ══════════════════════════════════════════════════
//  NORMALIZE & BYPASS ÖNLEME
// ══════════════════════════════════════════════════

function normalizeText(text) {
  return text
    .toLowerCase()
    // L33tspeak
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/8/g, 'b').replace(/9/g, 'g').replace(/@/g, 'a')
    .replace(/\$/g, 's').replace(/!/g, 'i').replace(/\+/g, 't')
    // Tekrarlanan harf: fuuuck → fuuk → fuk
    .replace(/(.)\1{2,}/g, '$1$1')
    // Özel karakterleri kaldır
    .replace(/[^\wüöşığçiı\s]/g, ' ')
    // Çoklu boşluk
    .replace(/\s+/g, ' ')
    .trim();
}

function removeSeparators(text) {
  // s.i.k → sik,  f-u-c-k → fuck
  return text.replace(/(\w)[.\-_*|,;:~`'^]+(\w)/g, '$1$2');
}

// ══════════════════════════════════════════════════
//  AKILLI REGEX BUILDER
// ══════════════════════════════════════════════════

// Türkçe karakterleri destekleyen word boundary
// Bir kelimenin başında/sonunda harf veya sayı olmadığını kontrol eder
function buildExactRegex(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Türkçe uyumlu boundary: önünde ve arkasında harf/sayı olmamalı
  return new RegExp(
    `(?<![a-zA-ZğüşıöçĞÜŞİÖÇ0-9])${escaped}(?![a-zA-ZğüşıöçĞÜŞİÖÇ0-9])`,
    'i',
  );
}

function buildSubstrRegex(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

// ══════════════════════════════════════════════════
//  ANA OFFLİNE KONTROL
// ══════════════════════════════════════════════════

function checkOfflineFilter(text) {
  if (!text || text.trim().length < 2) return { found: false, word: null };

  const cleaned    = removeSeparators(text);
  const normalized = normalizeText(cleaned);
  const normOrig   = normalizeText(text);

  // ── Exact kelimeler ──────────────────────────────────────────────────
  const exactLists = [
    ...BANNED_WORDS.turkce_exact,
    ...BANNED_WORDS.ingilizce_exact,
    ...BANNED_WORDS.cinsel_exact,
    ...CUSTOM_WORDS_EXACT,
  ];

  for (const word of exactLists) {
    const normWord = normalizeText(word);
    if (normWord.length < 2) continue;
    const regex = buildExactRegex(normWord);
    if (regex.test(normalized) || regex.test(normOrig)) {
      return { found: true, word };
    }
  }

  // ── Substring kelimeler ──────────────────────────────────────────────
  const substrLists = [
    ...BANNED_WORDS.turkce_substr,
    ...BANNED_WORDS.ingilizce_substr,
    ...BANNED_WORDS.cinsel_substr,
    ...BANNED_WORDS.siddet_substr,
    ...CUSTOM_WORDS_SUBSTR,
  ];

  for (const word of substrLists) {
    const normWord = normalizeText(word);
    if (normWord.length < 3) continue;
    const regex = buildSubstrRegex(normWord);
    if (regex.test(normalized) || regex.test(normOrig)) {
      return { found: true, word };
    }
  }

  return { found: false, word: null };
}

// ══════════════════════════════════════════════════
//  OPENAI MODERATION API
// ══════════════════════════════════════════════════

async function checkOpenAI(text, apiKey) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/moderations',
      { input: text, model: 'omni-moderation-latest' },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 3000,
      },
    );
    const result = response.data.results[0];
    return {
      flagged:     result.flagged,
      categories:  result.categories,
      scores:      result.category_scores,
      topCategory: Object.entries(result.category_scores).sort(([,a],[,b]) => b-a)[0]?.[0] || null,
      topScore:    Math.max(...Object.values(result.category_scores)),
    };
  } catch (err) {
    return { flagged: false, error: err.message };
  }
}

const OPENAI_CATEGORY_TR = {
  'hate':                   'Nefret Söylemi',
  'hate/threatening':       'Tehdit İçeren Nefret',
  'harassment':             'Taciz/Hakaret',
  'harassment/threatening': 'Tehdit İçeren Taciz',
  'self-harm':              'Kendine Zarar Verme',
  'self-harm/intent':       'Kendine Zarar Niyeti',
  'sexual':                 'Cinsel İçerik',
  'sexual/minors':          'Reşit Olmayanlara Yönelik',
  'violence':               'Şiddet',
  'violence/graphic':       'Grafik Şiddet',
  'illicit':                'Yasadışı İçerik',
  'illicit/violent':        'Yasadışı Şiddet',
};

function getCategoryTR(cat) {
  return OPENAI_CATEGORY_TR[cat] || cat;
}

// ══════════════════════════════════════════════════
//  ANA KONTROL FONKSİYONU
// ══════════════════════════════════════════════════

async function checkMessage(text, options = {}) {
  const { useAI = false, apiKey = null, aiThreshold = 0.75 } = options;
  if (!text || text.trim().length < 2) return { blocked: false };

  const offlineResult = checkOfflineFilter(text);

  let aiResult = null;
  if (useAI && apiKey) {
    aiResult = await checkOpenAI(text, apiKey);
  }

  const offlineBlocked = offlineResult.found;
  const aiBlocked      = aiResult?.flagged && !aiResult?.error && (aiResult?.topScore || 0) >= aiThreshold;

  if (offlineBlocked && aiBlocked) {
    return { blocked: true, reason: `Küfür/Hakaret (Kelime: "${offlineResult.word}" + AI: ${getCategoryTR(aiResult.topCategory)})`, source: 'both', word: offlineResult.word, aiResult };
  }
  if (offlineBlocked) {
    return { blocked: true, reason: `Yasaklı içerik: "${offlineResult.word}"`, source: 'offline', word: offlineResult.word, aiResult };
  }
  if (aiBlocked) {
    return { blocked: true, reason: `AI tespiti: ${getCategoryTR(aiResult.topCategory)} (%${Math.round(aiResult.topScore * 100)})`, source: 'ai', word: null, aiResult };
  }

  return { blocked: false, reason: null, source: null, word: null, aiResult };
}

// ══════════════════════════════════════════════════
//  ÖZEL KELİME YÖNETİMİ
// ══════════════════════════════════════════════════

function addCustomWord(word, exact = false) {
  const w = word.toLowerCase().trim();
  const list = exact ? CUSTOM_WORDS_EXACT : CUSTOM_WORDS_SUBSTR;
  if (list.includes(w)) return false;
  list.push(w);
  return true;
}

function removeCustomWord(word) {
  const w = word.toLowerCase().trim();
  let removed = false;
  const ei = CUSTOM_WORDS_EXACT.indexOf(w);
  if (ei !== -1) { CUSTOM_WORDS_EXACT.splice(ei, 1); removed = true; }
  const si = CUSTOM_WORDS_SUBSTR.indexOf(w);
  if (si !== -1) { CUSTOM_WORDS_SUBSTR.splice(si, 1); removed = true; }
  return removed;
}

function getWordList() {
  return {
    ...BANNED_WORDS,
    custom_exact:  CUSTOM_WORDS_EXACT,
    custom_substr: CUSTOM_WORDS_SUBSTR,
  };
}

// Tüm kelimelerin flat listesi (wordlist komutu için)
const ALL_BANNED = [
  ...Object.values(BANNED_WORDS).flat(),
];

module.exports = {
  checkMessage, checkOfflineFilter, checkOpenAI,
  normalizeText, addCustomWord, removeCustomWord,
  getWordList, getCategoryTR, ALL_BANNED, BANNED_WORDS,
};
