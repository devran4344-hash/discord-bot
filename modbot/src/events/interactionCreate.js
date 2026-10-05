// ╔══════════════════════════════════════════════════════════════════════╗
// ║          EVENT: interactionCreate — Tüm Buton & Menü Handler        ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    try {
      // ─── Butonlar ────────────────────────────────────────────
      if (interaction.isButton()) {
        const id = interaction.customId;

        // Reaction Role butonları
      if (id.startsWith('rr_')) {
        if (client._rrHandler) {
          return client._rrHandler(interaction, client).catch(err => {
            console.error('[RR Button Hatası]', err);
            if (!interaction.replied) interaction.reply({ content: '❌ Bir hata oluştu.', flags: 64 }).catch(() => null);
          });
        }
      }

      // Ticket butonları
        if (
          id.startsWith('ticket_') ||
          id.startsWith('rating_')
        ) {
          const ticketCmd = client.commands.get('ticket');
          if (ticketCmd?.handleInteraction) {
            return ticketCmd.handleInteraction(interaction, client).catch(err => {
              console.error('[Ticket Button Hatası]', err);
              if (!interaction.replied && !interaction.deferred) {
                interaction.reply({ content: '❌ Bir hata oluştu.', flags: 64 }).catch(() => null);
              }
            });
          }
        }

        // Warnings pagination
        if (id.startsWith('warn_')) return; // warnings.js kendi collector'ını yönetiyor

        // Help pagination
        if (id.startsWith('help_')) return; // help.js kendi collector'ını yönetiyor
      }

      // ─── Select Menü ─────────────────────────────────────────
      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;

        // Ticket tip seçimi
        if (id === 'ticket_type_select') {
          const ticketCmd = client.commands.get('ticket');
          if (ticketCmd?.handleInteraction) {
            return ticketCmd.handleInteraction(interaction, client).catch(err => {
              console.error('[Ticket Select Hatası]', err);
              if (!interaction.replied && !interaction.deferred) {
                interaction.reply({ content: '❌ Bir hata oluştu.', flags: 64 }).catch(() => null);
              }
            });
          }
        }

        // Help select menüsü — help.js collector'ı yönetiyor
        if (id === 'help_select') return;
      }

    } catch (err) {
      console.error('[interactionCreate Hatası]', err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: '❌ Beklenmedik bir hata oluştu.', flags: 64 }).catch(() => null);
      }
    }
  },
};
