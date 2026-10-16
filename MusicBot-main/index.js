'use strict';

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    ActivityType,
} = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const fs          = require('fs');
const fsPromises  = require('fs').promises;
const path        = require('path');
const chalk       = require('chalk');

const config              = require('./config');
const PlayerStateManager  = require('./src/PlayerStateManager');
const MusicPlayer         = require('./src/MusicPlayer');
const MusicEmbedManager   = require('./src/MusicEmbedManager');

require('./src/commandLoader'); // Deploy slash commands on startup

// ─── Startup banner ───────────────────────────────────────────────────────────

function printBanner(tag, shardId, guilds) {
    const line = '─'.repeat(52);
    console.log('');
    console.log(chalk.cyan(`  ╔${line}╗`));
    console.log(chalk.cyan(`  ║`) + chalk.bold.white('         🎵  MUSIC BOT  —  ONLINE                   ') + chalk.cyan('║'));
    console.log(chalk.cyan(`  ╠${line}╣`));
    console.log(chalk.cyan(`  ║`) + chalk.white(`  User   : ${tag.padEnd(40)}`) + chalk.cyan('║'));
    console.log(chalk.cyan(`  ║`) + chalk.white(`  Shard  : ${String(shardId).padEnd(40)}`) + chalk.cyan('║'));
    console.log(chalk.cyan(`  ║`) + chalk.white(`  Guilds : ${String(guilds).padEnd(40)}`) + chalk.cyan('║'));
    console.log(chalk.cyan(`  ║`) + chalk.white(`  Node   : ${process.version.padEnd(40)}`) + chalk.cyan('║'));
    console.log(chalk.cyan(`  ╚${line}╝`));
    console.log('');
}

// ─── Voice / Player diagnostics ───────────────────────────────────────────────

function attachPlayerDiagnostics(player, guildId) {
    if (!player || player.__diagAttached) return;
    player.__diagAttached = true;

    const tag = `[G${guildId}]`;

    // Player state / error
    if (typeof player.on === 'function') {
        player.on('stateChange', (o, n) => {
            console.log(chalk.cyan(`  🎵 ${tag} Player: ${o?.status} → ${n?.status}`));
        });
        player.on('error', (e) => {
            console.error(chalk.red(`  ❌ ${tag} Player error:`), e);
        });
    }

    // Voice connection — geç oluşturulduğu için bekleyerek bağlan
    let attempts = 0;
    const iv = setInterval(() => {
        attempts++;
        let conn = null;
        try { conn = getVoiceConnection(guildId); } catch { /* ignore */ }

        if (conn) {
            clearInterval(iv);
            console.log(chalk.magenta(`  🔊 ${tag} Voice current state: ${conn.state?.status}`));

            conn.on('stateChange', (o, n) => {
                console.log(chalk.magenta(`  🔊 ${tag} Voice: ${o?.status} → ${n?.status}`));
                if (n?.status === 'ready')        console.log(chalk.green(`  ✅ ${tag} Voice READY`));
                if (n?.status === 'disconnected') console.error(chalk.red(`  ❌ ${tag} Voice DISCONNECTED`));
            });
            conn.on('error', (e) => {
                console.error(chalk.red(`  ❌ ${tag} Voice error:`), e);
            });

            // Eğer zaten ready ise direkt işaretle
            if (conn.state?.status === 'ready') {
                console.log(chalk.green(`  ✅ ${tag} Voice zaten READY`));
            }
        }
        if (attempts >= 30) clearInterval(iv); // 30 sn sonra vazgeç
    }, 1000);
}

// ─── Audio cache cleanup ──────────────────────────────────────────────────────

async function cleanupAudioCache() {
    const cacheDir = path.join(__dirname, 'audio_cache');
    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
            return;
        }
        const files      = await fsPromises.readdir(cacheDir);
        const protected_ = PlayerStateManager.getProtectedCacheFiles?.() ?? new Set();
        let deleted = 0, kept = 0;
        for (const file of files) {
            const abs = path.resolve(path.join(cacheDir, file));
            if (protected_.has(abs)) { kept++; continue; }
            try { await fsPromises.unlink(abs); deleted++; } catch { /* ignore */ }
        }
        console.log(chalk.gray(`  🗑  Cache cleanup: ${deleted} removed, ${kept} protected`));
    } catch (err) {
        console.error(chalk.red('  ❌  Cache cleanup failed:'), err.message);
    }
}

// ─── Session restore ──────────────────────────────────────────────────────────

async function restoreSavedPlayers(client) {
    const saved   = PlayerStateManager.getAllStates();
    const entries = Object.entries(saved || {});
    if (!entries.length) return;

    console.log(chalk.cyan(`  🔄  Restoring ${entries.length} saved session(s)…`));

    for (const [guildId, state] of entries) {
        try {
            let guild = client.guilds.cache.get(guildId);
            if (!guild) {
                for (let i = 0; i < 3; i++) {
                    await new Promise(r => setTimeout(r, 1000));
                    guild = await client.guilds.fetch(guildId).catch(() => null);
                    if (guild) break;
                }
            }
            if (!guild) {
                console.log(chalk.yellow(`  ⚠  Guild ${guildId} not found — removing state`));
                await PlayerStateManager.removeState(guildId);
                continue;
            }

            const { voiceChannelId, textChannelId } = state;
            if (!voiceChannelId || !textChannelId) { await PlayerStateManager.removeState(guildId); continue; }

            const voiceChannel = guild.channels.cache.get(voiceChannelId)
                || await guild.channels.fetch(voiceChannelId).catch(() => null);
            const textChannel  = guild.channels.cache.get(textChannelId)
                || await guild.channels.fetch(textChannelId).catch(() => null);

            if (!voiceChannel?.isVoiceBased?.() || !textChannel?.isTextBased?.()) {
                console.log(chalk.yellow(`  ⚠  Invalid channels in ${guild.name} — removing state`));
                await PlayerStateManager.removeState(guildId);
                continue;
            }

            const player = new MusicPlayer(guild, textChannel, voiceChannel);
            client.players.set(guildId, player); // diagnostics patch otomatik çalışacak

            await player.restoreFromState(state);
            console.log(chalk.green(`  ✅  Restored: ${chalk.bold(guild.name)}`));

        } catch (err) {
            console.error(chalk.red(`  ❌  Restore failed for ${guildId}:`), err.message);
            client.players.delete(guildId);
            await PlayerStateManager.removeState(guildId);
        }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

setTimeout(() => {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
        ],
    });

    client.commands = new Collection();
    client.players  = new Collection();

    // ── Players Collection'a diagnostics otomatik bağla (monkey-patch) ───────
    const _origPlayersSet = client.players.set.bind(client.players);
    client.players.set = function (guildId, player) {
        const result = _origPlayersSet(guildId, player);
        try { attachPlayerDiagnostics(player, guildId); } catch (e) {
            console.error(chalk.red('  ❌  attachPlayerDiagnostics error:'), e?.message);
        }
        return result;
    };

    // Music embed manager — shared globally for MusicPlayer access
    client.musicEmbedManager = new MusicEmbedManager(client);
    if (!global.clients) global.clients = {};
    global.clients.musicEmbedManager = client.musicEmbedManager;

    // ── Load commands ─────────────────────────────────────────────────────────
    const loadCommands = () => {
        const dir = path.join(__dirname, 'commands');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
            const cmd = require(path.join(dir, file));
            if (cmd.data && cmd.execute) {
                client.commands.set(cmd.data.name, cmd);
                console.log(chalk.green(`  ✓  Command loaded: ${chalk.bold(cmd.data.name)}`));
            } else {
                console.log(chalk.yellow(`  ⚠  Skipping ${file} — missing data/execute`));
            }
        }
    };

    // ── Load events ───────────────────────────────────────────────────────────
    const loadEvents = () => {
        const dir = path.join(__dirname, 'events');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
            const evt = require(path.join(dir, file));
            if (evt.once) {
                client.once(evt.name,  (...a) => evt.execute(...a));
            } else {
                client.on(evt.name, (...a) => evt.execute(...a));
            }
            console.log(chalk.green(`  ✓  Event loaded:   ${chalk.bold(evt.name)}`));
        }
    };

    // ── Ready ─────────────────────────────────────────────────────────────────
    client.once(Events.ClientReady, async () => {
        const shardId = client.shard?.ids?.[0] ?? 0;
        printBanner(client.user.tag, shardId, client.guilds.cache.size);

        // Log total guilds across all shards once they are all ready
        if (client.shard) {
            setTimeout(async () => {
                try {
                    const counts = await client.shard.fetchClientValues('guilds.cache.size');
                    const total  = counts.reduce((a, b) => a + b, 0);
                    console.log(chalk.magenta(`  🌐  Total guilds across all shards: ${total}`));
                } catch { /* shards still spawning */ }
            }, 12_000);
        }

        // Rotating status
        const statuses = [
            { name: config.bot.status,           type: ActivityType.Listening },
            { name: '/help — all commands',       type: ActivityType.Playing   },
            { name: 'YouTube • Spotify • SC',     type: ActivityType.Watching  },
        ];
        let si = 0;
        client.user.setActivity(statuses[0]);
        setInterval(() => {
            si = (si + 1) % statuses.length;
            client.user.setActivity(statuses[si]);
        }, 30_000);

        // Session restore (non-sharded only — sharded is triggered by shard manager)
        if (!client.shard) {
            console.log(chalk.cyan('  ⏳  Waiting for guild cache…'));
            await new Promise(r => setTimeout(r, 5_000));
            await client.restoreSessions();
        }
    });

    // restoreSessions — also called by shard manager via broadcastEval
    client.restoreSessions = async function () {
        const sid = client.shard?.ids?.[0] ?? 'N/A';
        console.log(chalk.cyan(`  [Shard ${sid}] 🔄  Starting session restore…`));
        await restoreSavedPlayers(client);
        await cleanupAudioCache();
        console.log(chalk.green(`  [Shard ${sid}] ✅  Session restore complete`));
    };

    // ── Slash command dispatcher ──────────────────────────────────────────────
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(chalk.red(`  ❌  Error in /${interaction.commandName}:`), err);
            const msg = '❌ An error occurred while running that command.';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
            }
        }
    });

    // ── Voice state handler ───────────────────────────────────────────────────
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const guild  = oldState.guild;
        const player = client.players.get(guild.id);
        if (!player) return;

        const botId      = guild.members.me?.id ?? client.user.id;
        const involvesBot = oldState.id === botId || newState.id === botId;

        // ── Bot itself moved / disconnected ──
        if (involvesBot) {
            const { channelId: oldCh } = oldState;
            const { channelId: newCh } = newState;

            // Forcibly disconnected
            if (oldCh && !newCh) {
                player.pendingEndReason = 'forced-disconnect';
                player.queue            = [];
                player.currentTrack     = null;
                await client.musicEmbedManager?.handlePlaybackEnd(player).catch(() => {});
                player.cleanup();
                client.players.delete(guild.id);
                return;
            }

            // Moved to a different channel
            if (newCh && oldCh !== newCh && newState.channel) {
                await player.moveToChannel?.(newState.channel);
                player.clearInactivityTimer?.(false);
                await client.musicEmbedManager?.updateNowPlayingEmbed(player).catch(() => {});
            }

            // Mute / deafen
            const wasMuted = oldState.serverMute || oldState.serverDeaf || oldState.suppress;
            const isMuted  = newState.serverMute || newState.serverDeaf || newState.suppress;
            if (!wasMuted && isMuted)  { player.pauseFor?.('mute');  await client.musicEmbedManager?.updateNowPlayingEmbed(player).catch(() => {}); }
            if (wasMuted  && !isMuted) { player.resumeFor?.('mute'); await client.musicEmbedManager?.updateNowPlayingEmbed(player).catch(() => {}); }
        }

        // ── Listener count in bot's channel ──
        const vcId = player.voiceChannel?.id;
        if (!vcId) return;
        if (oldState.channelId !== vcId && newState.channelId !== vcId) return;

        const channel   = guild.channels.cache.get(vcId);
        if (!channel) { player.cleanup(); client.players.delete(guild.id); return; }

        const listeners = channel.members.filter(m => !m.user.bot).size;
        if (listeners === 0) {
            player.startInactivityTimer?.();
            await client.musicEmbedManager?.updateNowPlayingEmbed(player).catch(() => {});
        } else {
            const wasPaused = player.pauseReasons?.has('alone');
            player.clearInactivityTimer?.(true);
            if (wasPaused) await client.musicEmbedManager?.updateNowPlayingEmbed(player).catch(() => {});
        }
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
        console.log(chalk.yellow(`\n  ⚠  ${signal} received — saving state and shutting down…`));
        const saves = [];
        for (const [gid, player] of client.players) {
            if (typeof player.persistState === 'function') {
                saves.push(player.persistState('shutdown', true).catch(() => {}));
            }
        }
        await Promise.all(saves);
        await new Promise(r => setTimeout(r, 1_000));
        client.players.forEach((p, gid) => {
            try { getVoiceConnection(gid)?.destroy(); } catch { /* ignore */ }
        });
        client.destroy();
        process.exit(0);
    };

    process.once('SIGINT',  () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

    if (process.platform === 'win32') {
        try {
            const rl = require('readline');
            if (process.stdin.isTTY) {
                rl.createInterface({ input: process.stdin, output: process.stdout })
                  .on('SIGINT', () => gracefulShutdown('SIGINT'));
            }
        } catch { /* non-TTY environments */ }
    }

    // ── Error handling ────────────────────────────────────────────────────────
    process.on('unhandledRejection', (reason) => {
        if (!reason) return;
        const code = reason?.code;
        if (code === 10062 || code === 40060) return; // stale interaction — safe to ignore
        if (code === 50013) { console.error(chalk.red('  ❌  Missing Discord permissions')); return; }
        if (reason?.message?.includes('IP discovery')) {
            client.players.forEach(p => p.cleanup?.());
            client.players.clear();
            return;
        }
        console.error(chalk.red('  ❌  Unhandled rejection:'), reason);
    });

    process.on('uncaughtException', (err) => {
        if (err.code === 10062 || err.code === 40060) return;
        if (/terminated|ECONNRESET|ETIMEDOUT/.test(err.message || '')) {
            console.log(chalk.yellow('  ⚠  Network error — continuing…'));
            return;
        }
        console.error(chalk.red('  ❌  Uncaught exception:'), err);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // ── Boot ──────────────────────────────────────────────────────────────────
    const init = async () => {
        console.log(chalk.blue('\n  🤖  Starting Discord Music Bot…\n'));
        loadCommands();
        loadEvents();
        await client.login(config.discord.token);
    };

    init().catch(err => {
        console.error(chalk.red('  ❌  Failed to start:'), err);
        process.exit(1);
    });

    module.exports = client;
}, 5_000);
