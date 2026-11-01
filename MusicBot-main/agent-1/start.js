'use strict';
// RRT-1 Ajan — rrt-bot/.env'den kendi bilgilerini okur
const path = require('path');

// Ana .env → rrt-bot/.env
require('dotenv').config({ path: path.join(__dirname, '..', 'rrt-bot', '.env') });

// Bu ajanın kendi env değişkenlerini process.env'e yükle
process.env.DISCORD_TOKEN = process.env.AGENT1_TOKEN;
process.env.CLIENT_ID     = process.env.AGENT1_CLIENT_ID;
process.env.AGENT_MODE    = 'true';
process.env.AGENT_ID      = '1';
process.env.AGENT_NAME    = 'RRT-1';
process.env.AGENT_PORT    = process.env.AGENT1_PORT || '3101';
process.env.AGENT_SECRET  = process.env.AGENT1_SECRET;
process.env.BOT_STATUS    = '🎵 RRT-1 | Müzik';

process.chdir(path.join(__dirname, '..'));
require('../index.js');
