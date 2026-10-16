// Kullanici CRUD Islemleri
const { db, admin } = require('./firebase');

const usersCol = db.collection('sevgili_users');

function bugun() {
    return new Date().toISOString().split('T')[0];
}

async function getUser(userId) {
    const ref = usersCol.doc(userId);
    const doc = await ref.get();
    return doc.exists ? doc.data() : null;
}

async function createUser(userId, kullaniciAdi) {
    const ref = usersCol.doc(userId);
    const fresh = {
        kullaniciAdi,
        karakter: null,
        iliski: {
            sevgiPuani: 0,
            seviye: 1,
            ruhHali: 'mutlu',
            baslangic: new Date().toISOString(),
            sonMesaj: Date.now(),
            kavgaSebebi: null
        },
        cuzdan: 500,
        sonGunluk: null,
        gecmis: [],
        anilar: [],
        hatiralar: {},
        aktifDate: null,
        istatistik: {
            toplamMesaj: 0,
            toplamDate: 0,
            kavgaSayisi: 0,
            hediyeSayisi: 0
        },
        spam: {
            dakikaMesajlar: [],
            sonUyari: 0
        },
        olusturulma: new Date().toISOString()
    };
    await ref.set(fresh);
    return fresh;
}

async function updateUser(userId, data) {
    await usersCol.doc(userId).update(data);
}

async function addSevgi(userId, miktar) {
    const ref = usersCol.doc(userId);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const data = doc.data();
    const yeniSevgi = Math.max(0, data.iliski.sevgiPuani + miktar);
    await ref.update({ 'iliski.sevgiPuani': yeniSevgi });
    return yeniSevgi;
}

async function addPara(userId, miktar) {
    await usersCol.doc(userId).update({
        cuzdan: admin.firestore.FieldValue.increment(miktar)
    });
}

async function ekleGecmis(userId, rol, mesaj) {
    const ref = usersCol.doc(userId);
    const doc = await ref.get();
    if (!doc.exists) return;

    const data = doc.data();
    const gecmis = data.gecmis || [];
    gecmis.push({ rol, mesaj, zaman: Date.now() });

    // Son 30 mesaji tut
    if (gecmis.length > 30) gecmis.splice(0, gecmis.length - 30);

    await ref.update({ gecmis });
}

async function ekleAni(userId, baslik, detay) {
    const ref = usersCol.doc(userId);
    await ref.update({
        anilar: admin.firestore.FieldValue.arrayUnion({
            tarih: new Date().toISOString(),
            baslik,
            detay
        })
    });
}

async function ekleHatura(userId, anahtar, deger) {
    await usersCol.doc(userId).update({
        [`hatiralar.${anahtar}`]: deger
    });
}

async function guncelleSonMesaj(userId) {
    await usersCol.doc(userId).update({
        'iliski.sonMesaj': Date.now()
    });
}

async function istatistikArttir(userId, alan) {
    const map = {
        mesaj: 'istatistik.toplamMesaj',
        date: 'istatistik.toplamDate',
        kavga: 'istatistik.kavgaSayisi',
        hediye: 'istatistik.hediyeSayisi'
    };
    const key = map[alan];
    if (!key) return;
    await usersCol.doc(userId).update({
        [key]: admin.firestore.FieldValue.increment(1)
    });
}

async function setKavga(userId, sebep) {
    await usersCol.doc(userId).update({
        'iliski.kavgaSebebi': sebep,
        'iliski.ruhHali': 'kizgin'
    });
}

async function kavgaCoz(userId) {
    await usersCol.doc(userId).update({
        'iliski.kavgaSebebi': null,
        'iliski.ruhHali': 'mutlu'
    });
}

async function setDate(userId, date) {
    await usersCol.doc(userId).update({ aktifDate: date });
}

async function clearDate(userId) {
    await usersCol.doc(userId).update({ aktifDate: null });
}

async function getLeaderboard(limit = 10) {
    const snap = await usersCol.orderBy('iliski.sevgiPuani', 'desc').limit(limit).get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
}

module.exports = {
    getUser,
    createUser,
    updateUser,
    addSevgi,
    addPara,
    ekleGecmis,
    ekleAni,
    ekleHatura,
    guncelleSonMesaj,
    istatistikArttir,
    setKavga,
    kavgaCoz,
    setDate,
    clearDate,
    getLeaderboard
};
