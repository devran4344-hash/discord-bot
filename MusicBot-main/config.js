// Load environment variables from .env file (local dev)
require('dotenv').config();

module.exports = {
    // ─── Discord ────────────────────────────────────────────────────────────────
    discord: {
        token:    process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId:  process.env.GUILD_ID || null, // null = global commands
    },

    // ─── Spotify ────────────────────────────────────────────────────────────────
    spotify: {
        clientId:     process.env.SPOTIFY_CLIENT_ID     || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    },

    // ─── Genius (Lyrics) ────────────────────────────────────────────────────────
    genius: {
        clientId:     process.env.GENIUS_CLIENT_ID     || '',
        clientSecret: process.env.GENIUS_CLIENT_SECRET || '',
    },

    // ─── Bot Settings ───────────────────────────────────────────────────────────
    bot: {
        defaultVolume:   parseInt(process.env.DEFAULT_VOLUME)   || 80,
        maxQueueSize:    parseInt(process.env.MAX_QUEUE_SIZE)    || 200,
        maxPlaylistSize: parseInt(process.env.MAX_PLAYLIST_SIZE) || 100,

        status:        process.env.BOT_STATUS        || '🎵 Music | /play',
        supportServer: process.env.SUPPORT_SERVER    || 'https://discord.gg/example',
        website:       process.env.WEBSITE           || 'https://example.com',
        invite: `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,

        // ── Embed colour palette ──
        // Each platform gets its own brand colour; fallback used for generic embeds
        colors: {
            default:    process.env.EMBED_COLOR         || '#5865F2', // Discord Blurple
            youtube:    process.env.COLOR_YOUTUBE       || '#FF0000', // YouTube Red
            spotify:    process.env.COLOR_SPOTIFY       || '#1DB954', // Spotify Green
            soundcloud: process.env.COLOR_SOUNDCLOUD    || '#FF5500', // SoundCloud Orange
            direct:     process.env.COLOR_DIRECT        || '#5865F2', // Blurple
            success:    process.env.COLOR_SUCCESS       || '#57F287', // Discord Green
            error:      process.env.COLOR_ERROR         || '#ED4245', // Discord Red
            warning:    process.env.COLOR_WARNING       || '#FEE75C', // Discord Yellow
            info:       process.env.COLOR_INFO          || '#5865F2', // Blurple
            queue:      process.env.COLOR_QUEUE         || '#EB459E', // Pink
        },
    },

    // ─── Audio ──────────────────────────────────────────────────────────────────
    audio: {
        quality: 'highestaudio',
        format:  'opus',
        bitrate: parseInt(process.env.AUDIO_BITRATE) || 128,
        filters: {
            bassboost: 'bass=g=20',
            nightcore: 'aresample=48000,asetrate=48000*1.25',
            vaporwave: 'aresample=48000,asetrate=48000*0.8',
            _8d:       'apulsator=hz=0.09',
            // Slowed + Reverb
            slowed:    'aresample=48000,asetrate=48000*0.85',
        },
    },

    // ─── yt-dlp Options ─────────────────────────────────────────────────────────
    ytdl: {
        requestOptions: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
        },
        format:  'bestaudio/best',
        filter:  'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,

        // Cookie / auth options — set via GitHub Actions secrets or .env
        cookiesFromBrowser: process.env.COOKIES_FROM_BROWSER || null, // 'chrome' | 'firefox' | 'edge'
        cookiesFile:        process.env.COOKIES_FILE         || null, // path to cookies.txt
        poToken:            process.env.YOUTUBE_PO_TOKEN     || null, // YouTube PO Token
    },

    // ─── Sharding ───────────────────────────────────────────────────────────────
    sharding: {
        // 'auto' lets Discord.js calculate the optimal number of shards.
        // For bots in <1000 guilds this is always 1.
        totalShards: process.env.TOTAL_SHARDS || 'auto',
        shardList:   process.env.SHARD_LIST   || 'auto',
        mode:        process.env.SHARD_MODE   || 'process',

        // Auto-respawn crashed shards
        respawn: process.env.SHARD_RESPAWN !== 'false',

        // Delay between spawning shards (ms) — Discord recommends ≥5000
        spawnDelay:   parseInt(process.env.SHARD_SPAWN_DELAY)   || 5500,
        spawnTimeout: parseInt(process.env.SHARD_SPAWN_TIMEOUT) || 30000,
    },
};
