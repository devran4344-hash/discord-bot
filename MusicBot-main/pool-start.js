'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  POOL START — 4 botu birden başlatır ve yönetir                             ║
// ║  Kullanım: node pool-start.js                                               ║
// ║  Sırası:   RRT-1 → RRT-2 → RRT-3 → RRT (yönlendirici)                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { spawn } = require('child_process');
const path      = require('path');
const chalk     = require('chalk');

const ROOT = __dirname;

// ── Bot tanımları ─────────────────────────────────────────────────────────────
const BOTS = [
    {
        id:     'RRT-1',
        script: path.join(ROOT, 'agent-1', 'start.js'),
        color:  chalk.cyan,
        delay:  0,          // ms — başlatma sırası
    },
    {
        id:     'RRT-2',
        script: path.join(ROOT, 'agent-2', 'start.js'),
        color:  chalk.magenta,
        delay:  3000,
    },
    {
        id:     'RRT-3',
        script: path.join(ROOT, 'agent-3', 'start.js'),
        color:  chalk.yellow,
        delay:  6000,
    },
    {
        id:     'RRT',
        script: path.join(ROOT, 'rrt-bot', 'index.js'),
        color:  chalk.green,
        delay:  10000,       // ajanlar hazır olduktan sonra başlasın
    },
];

// ── Yeniden başlatma ayarları ─────────────────────────────────────────────────
const MAX_RESTARTS  = 10;   // bu kadar çöküşten sonra bırak
const RESTART_DELAY = 5000; // ms

// ── Her bot için process yöneticisi ──────────────────────────────────────────
class BotProcess {
    constructor(def) {
        this.id       = def.id;
        this.script   = def.script;
        this.color    = def.color;
        this.delay    = def.delay;
        this.proc     = null;
        this.restarts = 0;
        this.stopping = false;
    }

    log(msg) {
        const time = new Date().toTimeString().slice(0, 8);
        console.log(this.color(`[${time}] [${this.id}] `) + msg);
    }

    start() {
        if (this.stopping) return;

        this.proc = spawn(process.execPath, [this.script], {
            cwd:   ROOT,
            stdio: 'pipe',
            env:   process.env,
        });

        this.log(`✅ Başlatıldı (PID: ${this.proc.pid})`);

        // stdout / stderr yönlendir
        this.proc.stdout.on('data', data => {
            data.toString().split('\n').filter(Boolean).forEach(line =>
                this.log(line)
            );
        });
        this.proc.stderr.on('data', data => {
            data.toString().split('\n').filter(Boolean).forEach(line =>
                this.log(chalk.red('[ERR] ') + line)
            );
        });

        this.proc.on('exit', (code, signal) => {
            if (this.stopping) return;

            this.log(chalk.yellow(`⚠  Çıktı — kod: ${code}, sinyal: ${signal}`));
            this.restarts++;

            if (this.restarts > MAX_RESTARTS) {
                this.log(chalk.red(`❌ ${MAX_RESTARTS} yeniden başlatma limitine ulaşıldı. Manuel kontrol gerekiyor.`));
                return;
            }

            this.log(chalk.yellow(`🔄 ${RESTART_DELAY / 1000}s sonra yeniden başlatılıyor... (${this.restarts}/${MAX_RESTARTS})`));
            setTimeout(() => this.start(), RESTART_DELAY);
        });

        this.proc.on('error', err => {
            this.log(chalk.red(`❌ Process hatası: ${err.message}`));
        });
    }

    stop() {
        this.stopping = true;
        if (this.proc) {
            try { this.proc.kill('SIGTERM'); } catch { /* ignore */ }
        }
    }
}

// ── Tüm botları başlat ────────────────────────────────────────────────────────
const processes = BOTS.map(def => new BotProcess(def));

console.log('');
console.log(chalk.bold.white('  ╔══════════════════════════════════════════╗'));
console.log(chalk.bold.white('  ║') + chalk.bold.cyan('     🎵  RRT POOL BAŞLATILIYOR...          ') + chalk.bold.white('║'));
console.log(chalk.bold.white('  ╚══════════════════════════════════════════╝'));
console.log('');

for (const bot of processes) {
    setTimeout(() => bot.start(), bot.delay);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
    console.log(chalk.yellow(`\n  ⚠  ${signal} — Tüm botlar kapatılıyor...`));
    for (const bot of processes) bot.stop();
    await new Promise(r => setTimeout(r, 2000));
    console.log(chalk.green('  ✅  Pool kapatıldı.'));
    process.exit(0);
}

process.once('SIGINT',  () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

if (process.platform === 'win32') {
    try {
        const rl = require('readline');
        if (process.stdin.isTTY) {
            rl.createInterface({ input: process.stdin, output: process.stdout })
              .on('SIGINT', () => shutdown('SIGINT'));
        }
    } catch { /* non-TTY */ }
}

// ── Periyodik durum özeti (her 60 sn) ────────────────────────────────────────
setInterval(() => {
    const alive = processes.filter(p => p.proc && !p.stopping).map(p => p.id);
    console.log(chalk.gray(`  [Pool] Aktif: ${alive.join(', ') || 'YOK'}`));
}, 60_000);
