'use strict';
// RRT-2 Ajan — rrt-bot/.env'den kendi bilgilerini okur
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', 'rrt-bot', '.env') });

process.env.DISCORD_TOKEN = process.env.AGENT2_TOKEN;
process.env.CLIENT_ID     = process.env.AGENT2_CLIENT_ID;
process.env.AGENT_MODE    = 'true';
process.env.AGENT_ID      = '2';
process.env.AGENT_NAME    = 'RRT-2';
process.env.AGENT_PORT    = process.env.AGENT2_PORT || '3102';
process.env.AGENT_SECRET  = process.env.AGENT2_SECRET;
process.env.BOT_STATUS    = '🎵 RRT-2 | Müzik';

process.chdir(path.join(__dirname, '..'));
require('../index.js');
