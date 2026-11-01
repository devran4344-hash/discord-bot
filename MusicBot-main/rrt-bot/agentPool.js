'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  AGENT POOL — RRT botunun ajan yöneticisi                                  ║
// ║  Her ajana kendi özel secret'ıyla bağlanır (AGENT1_SECRET, AGENT2_SECRET…) ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const http  = require('http');
const chalk = require('chalk');

// ── Ajan tanımları — her biri kendi portunu ve secret'ını taşır ───────────────
const AGENTS = [
    {
        id:     1,
        name:   'RRT-1',
        port:   parseInt(process.env.AGENT1_PORT)   || 3101,
        secret: process.env.AGENT1_SECRET           || '',
    },
    {
        id:     2,
        name:   'RRT-2',
        port:   parseInt(process.env.AGENT2_PORT)   || 3102,
        secret: process.env.AGENT2_SECRET           || '',
    },
    {
        id:     3,
        name:   'RRT-3',
        port:   parseInt(process.env.AGENT3_PORT)   || 3103,
        secret: process.env.AGENT3_SECRET           || '',
    },
];

// ── Önbellek ──────────────────────────────────────────────────────────────────
const statusCache = new Map(); // agentId → { status, fetchedAt }
const CACHE_TTL   = 3000;     // ms

// ── HTTP yardımcısı ───────────────────────────────────────────────────────────
function httpRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try   { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Her ajan kendi secret'ını header'a koyar
function makeOptions(agent, method, path, bodyLength = 0) {
    const opts = {
        hostname: '127.0.0.1',
        port:     agent.port,
        method,
        path,
        headers: {
            'Content-Type':   'application/json',
            'x-agent-id':     String(agent.id),
            'x-agent-secret': agent.secret,
        },
    };
    if (bodyLength > 0) opts.headers['Content-Length'] = bodyLength;
    return opts;
}

// ── Tek ajanın durumunu al ────────────────────────────────────────────────────
async function fetchAgentStatus(agent) {
    if (!agent.secret) return null; // secret tanımlı değilse dışla

    const cached = statusCache.get(agent.id);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.status;

    try {
        const res = await httpRequest(makeOptions(agent, 'GET', '/status'));
        if (res.status === 200 && res.body?.online) {
            statusCache.set(agent.id, { status: res.body, fetchedAt: Date.now() });
            return res.body;
        }
    } catch { /* offline */ }

    return null;
}

// ── Tüm ajanların durumunu al ─────────────────────────────────────────────────
async function getAllStatuses() {
    const results = await Promise.allSettled(AGENTS.map(a => fetchAgentStatus(a)));
    return AGENTS.map((agent, i) => ({
        ...agent,
        online: results[i].status === 'fulfilled' && results[i].value !== null,
        status: results[i].value || null,
    }));
}

// ── Belirli bir guild için aktif ajanı bul ────────────────────────────────────
async function findAgentForGuild(guildId) {
    const statuses = await getAllStatuses();
    for (const agent of statuses) {
        if (!agent.online) continue;
        if ((agent.status?.sessions || []).some(s => s.guildId === guildId)) return agent;
    }
    return null;
}

// ── En uygun boş ajanı seç ────────────────────────────────────────────────────
// Öncelik: o guild için zaten aktif → tamamen boş → en az meşgul
async function pickBestAgent(guildId) {
    const statuses = await getAllStatuses();
    const online   = statuses.filter(a => a.online);
    if (!online.length) return null;

    // 1) Bu guild için zaten aktif ajan
    for (const agent of online) {
        if ((agent.status?.sessions || []).some(s => s.guildId === guildId)) return agent;
    }

    // 2) Tamamen boş ajan
    const idle = online.filter(a => (a.status?.activeSessions || 0) === 0);
    if (idle.length) return idle[0];

    // 3) En az meşgul ajan
    return [...online].sort((a, b) =>
        (a.status?.activeSessions || 0) - (b.status?.activeSessions || 0)
    )[0];
}

// ── Ajana /play isteği gönder ─────────────────────────────────────────────────
async function requestPlay(agent, payload) {
    const bodyStr = JSON.stringify(payload);
    const res = await httpRequest(
        makeOptions(agent, 'POST', '/play', Buffer.byteLength(bodyStr)),
        payload
    );
    statusCache.delete(agent.id);
    return res;
}

// ── Ajana genel komut gönder (skip, stop, pause, resume) ─────────────────────
async function sendCommand(agentId, command, payload = {}) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} bulunamadı`);

    const bodyStr = JSON.stringify(payload);
    const res = await httpRequest(
        makeOptions(agent, 'POST', `/${command}`, Buffer.byteLength(bodyStr)),
        payload
    );
    statusCache.delete(agent.id);
    return res;
}

// ── Periyodik sağlık monitörü (her 15 sn) ────────────────────────────────────
let healthInterval = null;

function startHealthMonitor(onStatusUpdate) {
    if (healthInterval) return;
    healthInterval = setInterval(async () => {
        const statuses = await getAllStatuses();
        if (onStatusUpdate) onStatusUpdate(statuses);
        const offline = statuses.filter(s => !s.online).map(s => s.name);
        if (offline.length) {
            console.log(chalk.yellow(`  ⚠  [Pool] Çevrimdışı: ${offline.join(', ')}`));
        }
    }, 15_000);
}

function stopHealthMonitor() {
    if (healthInterval) { clearInterval(healthInterval); healthInterval = null; }
}

module.exports = {
    AGENTS,
    fetchAgentStatus,
    getAllStatuses,
    findAgentForGuild,
    pickBestAgent,
    requestPlay,
    sendCommand,
    startHealthMonitor,
    stopHealthMonitor,
};
