# 🎵 RRT Müzik Bot Havuzu — Kurulum Rehberi

## Ne Bu?

Tek bir `/play` komutu yeterli. RRT bot 3 ajan bottan hangisi boşsa ona yönlendiriyor.  
Aynı anda 3 ayrı ses kanalında 3 ayrı şarkı çalabilir. Herkes kendi panelini görür.

```
Kullanıcı → /play → RRT Bot → boş ajan seç → RRT-1/2/3 ses kanalına girer ve çalar
```

---

## Adım 1 — Discord Developer Portal'da 4 Bot Oluştur

1. [discord.com/developers](https://discord.com/developers/applications) → "New Application"
2. Her biri için: Application → Bot → "Add Bot" → Token kopyala
3. Bot izinleri: `Send Messages`, `Connect`, `Speak`, `Use Slash Commands`
4. Sunucuna davet et (hepsini ayrı ayrı)

**Botların adları:** RRT, RRT-1, RRT-2, RRT-3

---

## Adım 2 — .env Dosyalarını Doldur

### `rrt-bot/.env` — Yönlendirici bot
```env
DISCORD_TOKEN=  ← RRT botunun token'ı
CLIENT_ID=      ← RRT botunun client ID'si
GUILD_ID=       ← Boş bırakırsan global (önerilir), sunucu ID'si girersen anında aktif

AGENT_1_PORT=3101
AGENT_2_PORT=3102
AGENT_3_PORT=3103
AGENT_SECRET=buraya-gizli-bir-sifre-yaz
```

### `agent-1/.env` — RRT-1 botu
```env
DISCORD_TOKEN=  ← RRT-1 botunun token'ı
CLIENT_ID=      ← RRT-1 botunun client ID'si

AGENT_MODE=true
AGENT_ID=1
AGENT_NAME=RRT-1
AGENT_PORT=3101
AGENT_SECRET=buraya-gizli-bir-sifre-yaz  ← rrt-bot/.env ile AYNI olmalı!

COOKIES_FILE=../cookies.txt  ← YouTube için
```

### `agent-2/.env` — RRT-2 botu
```env
DISCORD_TOKEN=  ← RRT-2 token'ı
CLIENT_ID=      ← RRT-2 client ID'si
AGENT_ID=2
AGENT_NAME=RRT-2
AGENT_PORT=3102
AGENT_SECRET=...  ← aynı şifre
```

### `agent-3/.env` — RRT-3 botu
```env
DISCORD_TOKEN=  ← RRT-3 token'ı
CLIENT_ID=      ← RRT-3 client ID'si
AGENT_ID=3
AGENT_NAME=RRT-3
AGENT_PORT=3103
AGENT_SECRET=...  ← aynı şifre
```

---

## Adım 3 — Başlat

### Tüm botları tek komutla başlat:
```bash
node pool-start.js
```

### Veya npm ile:
```bash
npm run pool
```

### Sadece bir botu başlatmak için:
```bash
npm run agent1   # RRT-1
npm run agent2   # RRT-2
npm run agent3   # RRT-3
npm run rrt      # Yönlendirici
```

---

## Komutlar (Discord'da)

| Komut | Açıklama |
|-------|----------|
| `/play <sorgu>` | Boş ajan bul, müzik çal |
| `/skip` | Şarkıyı atla |
| `/stop` | Durdur ve kanaldan çık |
| `/pause` | Duraklatı / devam ettir |
| `/botlar` | Tüm ajanların durumunu gör |

Ajan botların kendi kontrol butonları embed'de görünür (▶️⏸️⏭️🔀vb).

---

## Nasıl Çalışıyor?

1. `/play rick astley` yazarsın
2. RRT bot → `agent-1:3101/status`, `agent-2:3102/status`, `agent-3:3103/status` kontrol eder
3. Boş olan (örn. RRT-2) seçilir
4. RRT bot → `agent-2:3102/play` POST atar
5. RRT-2 sese girer, çalmaya başlar, kendi now-playing embed'ini gönderir
6. Başka biri `/play` yazarsa RRT-3'e gider

---

## Sorun Giderme

**`Tüm müzik botları çevrimdışı` hatası:**  
→ Ajan botlar henüz başlamamış. `node pool-start.js` çalıştır.

**Bir ajan cevap vermiyor:**  
→ `AGENT_SECRET` tüm `.env` dosyalarında aynı mı kontrol et.

**Şarkı çalmıyor:**  
→ `cookies.txt` dosyasının var olduğundan ve geçerli olduğundan emin ol.
