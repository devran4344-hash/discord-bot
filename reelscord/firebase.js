const admin = require('firebase-admin');
require('dotenv').config();
let db;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64,'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    db = admin.firestore();
    console.log('[SYSTEM] Firebase OK.');
  } else console.warn('[WARN] Firebase env yok.');
} catch(e) { console.error('[ERROR]', e); }
module.exports = { admin, db };