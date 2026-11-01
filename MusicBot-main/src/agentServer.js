'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  AGENT SERVER — Her ajan bot bu HTTP sunucusunu çalıştırır               ║
// ║  RRT Bot bu endpoint'leri okuyarak hangi ajanın boş olduğunu anlar        ║
// ║  Port: AGENT_PORT env değişkeniyle belirlenir (3101, 3102, 3103)          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const http   = require('http');
const chalk  = require('chalk');

class AgentServer {
    constructor(client) {
        this.client = client;
        this.port   = parseInt(process.env.AGENT_PORT) || 3101;
        this.server = null;
    }

    // ── Durum hesapla ──────────────────────────────────────────────────────────
    getStatus() {
        const players  = this.client.players;
        const active   = [];

        for (const [guildId, player] of players) {
            if (!player.currentTrack) continue;
            active.push({
                guildId,
                guildName:    player.guild?.name || 'Unknown',
                track:        player.currentTrack?.title || 'Unknown',
                artist:       player.currentTrack?.artist || '',
                voiceChannel: player.voiceChannel?.name || 'Unknown',
                paused:       player.paused || false,
                queueLength:  player.queue?.length || 0,
                volume:       player.volume || 100,
            });
        }

        return {
            agentId:    parseInt(process.env.AGENT_ID) || 1,
            agentName:  process.env.AGENT_NAME || `RRT-${process.env.AGENT_ID || 1}`,
            online:     true,
            busy:       active.length > 0,
            activeSessions: active.length,
            sessions:   active,
            guilds:     this.client.guilds.cache.size,
            uptime:     process.uptime(),
            timestamp:  Date.now(),
        };
    }

    // ── Yetki kontrol — her ajan kendi AGENT_SECRET'ını doğrular ─────────────────
    isAuthorized(req) {
        const mySecret = process.env.AGENT_SECRET || '';
        if (!mySecret) return false; // secret tanımlı değilse hiç kabul etme

        // RRT bot x-agent-secret header'ında bu ajana ait secret'ı gönderir
        const sent = req.headers['x-agent-secret'] || req.headers['authorization'] || '';
        const token = sent.startsWith('Bearer ') ? sent.slice(7) : sent;
        return token === mySecret;
    }

    // ── Body parse ─────────────────────────────────────────────────────────────
    parseBody(req) {
        return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
            req.on('end', () => {
                try { resolve(JSON.parse(data || '{}')); }
                catch { resolve({}); }
            });
            req.on('error', reject);
        });
    }

    // ── JSON yanıt ─────────────────────────────────────────────────────────────
    json(res, status, body) {
        const payload = JSON.stringify(body);
        res.writeHead(status, {
            'Content-Type':  'application/json',
            'Content-Length': Buffer.byteLength(payload),
        });
        res.end(payload);
    }

    // ── Sunucuyu başlat ────────────────────────────────────────────────────────
    start() {
        this.server = http.createServer(async (req, res) => {
            const url    = req.url.split('?')[0];
            const method = req.method.toUpperCase();

            // CORS / OPTIONS
            res.setHeader('Access-Control-Allow-Origin',  '*');
            res.setHeader('Access-Control-Allow-Headers', 'x-rrt-secret, authorization, content-type');
            if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

            // Auth — /health hariç hepsinde gerekli
            if (url !== '/health' && !this.isAuthorized(req)) {
                return this.json(res, 401, { error: 'Unauthorized' });
            }

            try {
                // ── GET /health — bot ayakta mı? ──────────────────────────────
                if (method === 'GET' && url === '/health') {
                    return this.json(res, 200, { ok: true, agentId: parseInt(process.env.AGENT_ID) || 1 });
                }

                // ── GET /status — tam durum ───────────────────────────────────
                if (method === 'GET' && url === '/status') {
                    return this.json(res, 200, this.getStatus());
                }

                // ── POST /play — RRT'den şarkı çalma isteği ──────────────────
                // Body: { guildId, voiceChannelId, textChannelId, query, requestedBy }
                if (method === 'POST' && url === '/play') {
                    const body = await this.parseBody(req);
                    const { guildId, voiceChannelId, textChannelId, query, requestedBy } = body;

                    if (!guildId || !voiceChannelId || !textChannelId || !query) {
                        return this.json(res, 400, { error: 'Missing required fields: guildId, voiceChannelId, textChannelId, query' });
                    }

                    // Guild'i al
                    const guild = this.client.guilds.cache.get(guildId);
                    if (!guild) return this.json(res, 404, { error: `Guild ${guildId} not found` });

                    const voiceChannel = guild.channels.cache.get(voiceChannelId);
                    const textChannel  = guild.channels.cache.get(textChannelId);
                    if (!voiceChannel) return this.json(res, 404, { error: 'Voice channel not found' });
                    if (!textChannel)  return this.json(res, 404, { error: 'Text channel not found' });

                    // MusicPlayer al veya oluştur
                    const MusicPlayer   = require('./MusicPlayer');

                    let player = this.client.players.get(guildId);
                    if (!player) {
                        player = new MusicPlayer(guild, textChannel, voiceChannel);
                        this.client.players.set(guildId, player);
                    } else {
                        player.textChannel = textChannel;
                        if (!player.connection) player.voiceChannel = voiceChannel;
                    }

                    // HTTP'ye hemen OK dön, ses bağlantısı + çalma arka planda
                    this.json(res, 200, {
                        ok:      true,
                        agentId: parseInt(process.env.AGENT_ID) || 1,
                        async:   true,
                        message: 'Processing...',
                    });

                    // Arka planda bağlan ve çal
                    (async () => {
                        try {
                            // Ses kanalına bağlan
                            if (!player.connection) {
                                await player.connect();
                            }

                            // Şarkıyı ekle ve çal
                            const result = await player.addTrack(query, requestedBy || 'RRT');

                            if (!result.success) {
                                console.error(`[AgentServer] addTrack failed: ${result.message}`);
                                textChannel.send(`❌ ${result.message || 'Şarkı eklenemedi.'}`).catch(() => {});
                                return;
                            }

                            // Now-playing embed — EmbedManager yoksa direkt gönder
                            const embedMgr = this.client.musicEmbedManager || global.clients?.musicEmbedManager;
                            if (embedMgr && player.currentTrack) {
                                // Embed manager varsa kullan
                                if (!player.nowPlayingMessage) {
                                    const MusicEmbedManager = require('./MusicEmbedManager');
                                    if (!this.client.musicEmbedManager) {
                                        this.client.musicEmbedManager = new MusicEmbedManager(this.client);
                                        global.clients = global.clients || {};
                                        global.clients.musicEmbedManager = this.client.musicEmbedManager;
                                    }
                                    const embed = await this.client.musicEmbedManager.createNowPlayingEmbed(player, player.currentTrack, guild.id);
                                    const rows  = this.client.musicEmbedManager._buildMainButtons(player);
                                    const msg   = await textChannel.send({ embeds: [embed], components: rows });
                                    player.nowPlayingMessage = msg;
                                } else {
                                    await embedMgr.updateNowPlayingEmbed(player).catch(() => {});
                                }
                            }
                        } catch (err) {
                            console.error('[AgentServer] Async play error:', err.message);
                            textChannel.send(`❌ Çalma hatası: \`${err.message}\``).catch(() => {});
                        }
                    })();
                }

                // ── POST /skip ────────────────────────────────────────────────
                if (method === 'POST' && url === '/skip') {
                    const body   = await this.parseBody(req);
                    const player = this.client.players.get(body.guildId);
                    if (!player) return this.json(res, 404, { error: 'No active player for guild' });
                    await player.skip();
                    return this.json(res, 200, { ok: true });
                }

                // ── POST /stop ────────────────────────────────────────────────
                if (method === 'POST' && url === '/stop') {
                    const body   = await this.parseBody(req);
                    const player = this.client.players.get(body.guildId);
                    if (!player) return this.json(res, 404, { error: 'No active player for guild' });
                    await player.stop();
                    this.client.players.delete(body.guildId);
                    return this.json(res, 200, { ok: true });
                }

                // ── POST /pause ───────────────────────────────────────────────
                if (method === 'POST' && url === '/pause') {
                    const body   = await this.parseBody(req);
                    const player = this.client.players.get(body.guildId);
                    if (!player) return this.json(res, 404, { error: 'No active player for guild' });
                    player.pause();
                    return this.json(res, 200, { ok: true });
                }

                // ── POST /resume ──────────────────────────────────────────────
                if (method === 'POST' && url === '/resume') {
                    const body   = await this.parseBody(req);
                    const player = this.client.players.get(body.guildId);
                    if (!player) return this.json(res, 404, { error: 'No active player for guild' });
                    player.resume();
                    return this.json(res, 200, { ok: true });
                }

                // ── 404 ───────────────────────────────────────────────────────
                this.json(res, 404, { error: `Unknown endpoint: ${method} ${url}` });

            } catch (err) {
                console.error(chalk.red('[AgentServer] Request error:'), err.message);
                this.json(res, 500, { error: 'Internal server error', message: err.message });
            }
        });

        this.server.listen(this.port, '127.0.0.1', () => {
            const id   = process.env.AGENT_ID   || '?';
            const name = process.env.AGENT_NAME || `RRT-${id}`;
            console.log(chalk.green(`  ✅  [AgentServer] ${name} API sunucusu hazır → http://127.0.0.1:${this.port}`));
        });

        this.server.on('error', (err) => {
            console.error(chalk.red(`  ❌  [AgentServer] Port ${this.port} hatası:`), err.message);
        });
    }

    stop() {
        if (this.server) this.server.close();
    }
}

module.exports = AgentServer;
