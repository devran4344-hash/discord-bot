'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  TRANSFER SİSTEMİ — Takım & Rol Konfigürasyonu                      ║
// ║  Yeni takım eklemek için buraya bir satır ekle, başka hiçbir şey    ║
// ║  değiştirmene gerek yok.                                            ║
// ╚══════════════════════════════════════════════════════════════════════╝

// Transfer log kanalı
const TRANSFER_LOG_CHANNEL = '1554225273183015003';

// Kadro limiti (tüm takımlar için ortak)
const KADRO_LIMITI = 11;

// Genel üye rolü — takımdan çıkınca verilir
const UYE_ROLU = '1553167045871276224';

// Takım listesi
// presidentRole  → Başkan rolü ID
// viceRole       → Başkan Yardımcısı rolü ID
// playerRole     → Takım oyuncu rolü ID
const TEAMS = [
    {
        id:            'bnc',
        name:          'BNC',
        presidentRole: '1566460856919654500',
        viceRole:      '1566460892298612850',
        playerRole:    '1553169482678272030',
    },
    {
        id:            'deadlock',
        name:          'DeadLock',
        presidentRole: '1566460615306780743',
        viceRole:      '1566460694004764772',
        playerRole:    '1566383636281032754',
    },
    {
        id:            'duck',
        name:          'Duck',
        presidentRole: '1566461127221575840',
        viceRole:      '1566461082288001185',
        playerRole:    '1564655611059249254',
    },
    {
        id:            'mrd',
        name:          'MRD',
        presidentRole: '1566475973623414956',
        viceRole:      '1566476003684130918',
        playerRole:    '1560435771012288562',
    },
    {
        id:            'zoktayfc',
        name:          'Zoktay FC',
        presidentRole: '1566476340432076820',
        viceRole:      '1566476354894041259',
        playerRole:    '1561049091042058392',
    },
    {
        id:            'berbuda',
        name:          'Berbuda FC',
        presidentRole: '1566476181245792427',
        viceRole:      '1566476196026261535',
        playerRole:    '1563200303732363294',
    },
];

// Rol ID'sinden takımı bul
function getTeamByRole(roleId) {
    return TEAMS.find(t =>
        t.presidentRole === roleId ||
        t.viceRole      === roleId ||
        t.playerRole    === roleId
    ) || null;
}

// Üyenin takımını (yönetici sıfatıyla) bul
// Başkan veya BY rolüne sahipse o takımı döndürür
function getManagerTeam(member) {
    for (const team of TEAMS) {
        if (
            member.roles.cache.has(team.presidentRole) ||
            member.roles.cache.has(team.viceRole)
        ) {
            return team;
        }
    }
    return null;
}

// Üyenin oyuncu olarak bulunduğu takımı bul (playerRole üzerinden)
function getPlayerTeam(member) {
    return TEAMS.find(t => member.roles.cache.has(t.playerRole)) || null;
}

// Takım ID'sinden takımı bul
function getTeamById(id) {
    return TEAMS.find(t => t.id === id) || null;
}

module.exports = {
    TRANSFER_LOG_CHANNEL,
    KADRO_LIMITI,
    UYE_ROLU,
    TEAMS,
    getTeamByRole,
    getManagerTeam,
    getPlayerTeam,
    getTeamById,
};
