require('dotenv').config();
const { db } = require('../firebase');
(async () => {
  if (!db) { console.log('Firebase yok'); process.exit(0); }
  const users = await db.collection('users').get(); let n=0;
  for (const d of users.docs) {
    const q = d.data().videoQueue||[];
    if (q.length===0 || q.length>100) { await d.ref.update({videoQueue:[]}); n++; }
  }
  console.log(`${n} kullanici temizlendi.`);
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});