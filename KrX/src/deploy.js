/**
 * KrX NSFW Guard v2 — Deploy Script
 * Çalıştır: node src/deploy.js
 */
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const cfgPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(cfgPath)) { console.error('❌ config.json bulunamadı!'); process.exit(1); }
const { token, clientId } = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

if (!token || token.includes('BURAYA')) { console.error('❌ config.json içine token yaz!'); process.exit(1); }
if (!clientId || clientId.includes('BURAYA')) { console.error('❌ config.json içine clientId yaz!'); process.exit(1); }

const komutlar = [];
const dosyalar = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));

for (const f of dosyalar) {
  const cmd = require(`./commands/${f}`);
  komutlar.push(cmd.data.toJSON());
  console.log(`✅ ${f} → /${cmd.data.name}`);
}

const rest = new REST({ version:'10' }).setToken(token);

(async () => {
  try {
    console.log(`\n🚀 ${komutlar.length} komut Discord'a gönderiliyor...`);
    await rest.put(Routes.applicationCommands(clientId), { body: komutlar });
    console.log('\n✅ Tüm slash komutlar başarıyla kaydedildi!');
    console.log('⚠️  Komutlar Discord\'da görünmesi ~1 dakika sürebilir.\n');
  } catch (e) {
    console.error('❌ Deploy hatası:', e.message);
    if (e.message?.includes('401')) console.error('👉 Token hatalı!');
    if (e.message?.includes('clientId')) console.error('👉 Client ID hatalı!');
  }
})();
