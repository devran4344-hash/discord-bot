// src/translate/autoinit.js
const { Events } = require('discord.js');
const handler = require('../../events/messageTranslate');

module.exports = function registerTranslate(client) {
  client.on(Events.MessageCreate, (message) => {
    handler.execute(message).catch((e) => console.error('[translate] handler error:', e));
  });
  console.log('[translate] EN <-> TR ceviri sistemi aktif.');
};