const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '../database.json');

function getDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{"users":{}}');
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function getUser(id) {
    const db = getDB();
    if (!db.users[id]) {
        db.users[id] = { cash: 0, dailyStreak: 0, lastDaily: 0, luck: 0, animals: [] };
        saveDB(db);
    }
    return db.users[id];
}
module.exports = { getDB, saveDB, getUser };
