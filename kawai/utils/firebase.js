// Firebase Admin SDK Baglantisi (Base64 decode)
const admin = require('firebase-admin');

let db;

function initFirebase() {
    if (admin.apps.length) {
        return admin.firestore();
    }

    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 tanimli degil!');
    }

    const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));

    // Private key icindeki \n leri gercek newline a cevir
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase baglantisi kuruldu.');
    return admin.firestore();
}

db = initFirebase();

module.exports = { db, admin };
