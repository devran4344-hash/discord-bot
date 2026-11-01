'use strict';
// RRT-3 Ajan — rrt-bot/.env'den kendi bilgilerini okur
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', 'rrt-bot', '.env') });

process.env.DISCORD_TOKEN = process.env.AGENT3_TOKEN;
process.env.CLIENT_ID     = process.env.AGENT3_CLIENT_ID;
process.env.AGENT_MODE    = 'true';
process.env.AGENT_ID      = '3';
process.env.AGENT_NAME    = 'RRT-3';
process.env.AGENT_PORT    = process.env.AGENT3_PORT || '3103';
process.env.AGENT_SECRET  = process.env.AGENT3_SECRET;
process.env.BOT_STATUS    = '🎵 RRT-3 | Müzik';

process.chdir(path.join(__dirname, '..'));
require('../index.js');
