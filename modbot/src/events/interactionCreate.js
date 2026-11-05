// ╔══════════════════════════════════════════════════════════════════════╗
// ║  EVENT: interactionCreate — Slash + Buton + Select + Modal handler   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  Events, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  EmbedBuilder, AttachmentBuilder,
} = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction, client) {

    // ══════════════════════════════════════════════════════
    //  1. SLASH KOMUTLARI
    // ══════════════════════════════════════════════════════
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        // executeSlash varsa onu kullan, yoksa execute (elecus tarzı komutlar için)
        if (typeof command.executeSlash === 'function') {
          await command.executeSlash(interaction, client);
        } else if (typeof command.execute === 'function') {
          await command.execute(interaction, client);
        }
      } catch (error) {
        console.error(`[HATA] /${interaction.commandName}:`, error);
        const replyOpts = { content: '❌ Komut çalıştırılırken hata oluştu!', flags: MessageFlags.Ephemeral };
        try {
          if (interaction.replied || interaction.deferred) await interaction.followUp(replyOpts);
          else await interaction.reply(replyOpts);
        } catch (_) {}
      }
      return;
    }

    // ══════════════════════════════════════════════════════
    //  2. BUTONLAR
    // ══════════════════════════════════════════════════════
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ── Giveaway butonları ──────────────────────────────
      if (id.startsWith('gw_')) {
        const giveawayCmd = client.commands.get('giveaway');
        if (giveawayCmd?.handleButton) {
          try { await giveawayCmd.handleButton(interaction, client); }
          catch (e) { console.error('[Giveaway Button] Hata:', e.message); }
        }
        return;
      }

      // ── /ayarlar butonları ──────────────────────────────
      if (id.startsWith('ayar_')) {
        const ayarlarCmd = client.commands.get('ayarlar');
        if (ayarlarCmd?.handleButton) {
          try { await ayarlarCmd.handleButton(interaction, client); }
          catch (e) { console.error('[Ayarlar Button] Hata:', e.message); }
        }
        return;
      }

      // ── /destek owner butonları ─────────────────────────
      if (id.startsWith('destek_')) {
        const destekCmd = client.commands.get('destek');
        if (destekCmd?.handleOwnerButton) {
          try { await destekCmd.handleOwnerButton(interaction, client); }
          catch (e) { console.error('[Destek Button] Hata:', e.message); }
        }
        return;
      }

      // ── Kayıt formu butonu (kullanıcı kendi kaydolur) ──
      if (id === 'kayit_buton') {
        const modal = new ModalBuilder()
          .setCustomId('kayit_modal')
          .setTitle('Sunucu Kayıt Formu');
        const isimInput = new TextInputBuilder()
          .setCustomId('kayit_isim').setLabel('İsminiz Nedir?')
          .setStyle(TextInputStyle.Short).setPlaceholder('Örn: Umut').setRequired(true);
        const yasInput = new TextInputBuilder()
          .setCustomId('kayit_yas').setLabel('Yaşınız Kaç?')
          .setStyle(TextInputStyle.Short).setPlaceholder('Örn: 20').setRequired(true);
        modal.addComponents(
          new ActionRowBuilder().addComponents(isimInput),
          new ActionRowBuilder().addComponents(yasInput),
        );
        await interaction.showModal(modal);
        return;
      }

      // ── Reaction Role butonları (rr_msgId_roleId) ──
      if (id.startsWith('rr_')) {
        if (client._rrHandler) {
          try { await client._rrHandler(interaction, client); }
          catch (e) { console.error('[RR Button] Hata:', e.message); }
        }
        return;
      }

      // ── Ticket butonları ──
      if (id.startsWith('ticket_') || id.startsWith('rating_')) {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd?.handleInteraction) {
          try { await ticketCmd.handleInteraction(interaction, client); }
          catch (e) { console.error('[Ticket Button] Hata:', e.message); }
        }
        return;
      }

      // ── Kayıt sistemi butonları (kayit_isim_, kayit_kayitsiz_, kayit_bilgi_) ──
      if (id.startsWith('kayit_')) {
        const kayitCmd = client.commands.get('kayit');
        if (kayitCmd?.handleInteraction) {
          try { await kayitCmd.handleInteraction(interaction, client); }
          catch (e) { console.error('[Kayit Button] Hata:', e.message); }
        }
        return;
      }

      return;
    }

    // ══════════════════════════════════════════════════════
    //  3. SELECT MENÜLERİ
    // ══════════════════════════════════════════════════════
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;

      // ── Ayarlar select menüleri ─────────────────────────
      if (id.startsWith('ayar_')) {
        const ayarlarCmd = client.commands.get('ayarlar');
        if (ayarlarCmd?.handleSelect) {
          try { await ayarlarCmd.handleSelect(interaction, client); }
          catch (e) { console.error('[Ayarlar Select] Hata:', e.message); }
        }
        return;
      }

      // ── Onboarding select menüleri ──────────────────────
      if (id.startsWith('onboard_')) {
        // guildCreate event içindeki collector hallediyor
        return;
      }

      // ── Ticket türü seçimi ──
      if (id === 'ticket_type_select') {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd?.handleInteraction) {
          try { await ticketCmd.handleInteraction(interaction, client); }
          catch (e) { console.error('[Ticket Select] Hata:', e.message); }
        }
        return;
      }

      return;
    }

    // ══════════════════════════════════════════════════════
    //  4. MODAL SUBMIT
    // ══════════════════════════════════════════════════════
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      // ── Ayarlar modal'ları ──────────────────────────────
      if (id.startsWith('ayar_modal_')) {
        const ayarlarCmd = client.commands.get('ayarlar');
        if (ayarlarCmd?.handleModal) {
          try { await ayarlarCmd.handleModal(interaction, client); }
          catch (e) { console.error('[Ayarlar Modal] Hata:', e.message); }
        }
        return;
      }

      // ── Destek owner yanıt modal'ı ──────────────────────
      if (id.startsWith('destek_yanit_modal_')) {
        const destekCmd = client.commands.get('destek');
        if (destekCmd?.handleOwnerModal) {
          try { await destekCmd.handleOwnerModal(interaction, client); }
          catch (e) { console.error('[Destek Modal] Hata:', e.message); }
        }
        return;
      }

      // ── Kayıt sistemi isim modal'ı ──
      if (id.startsWith('kayit_isim_modal_')) {
        const kayitCmd = client.commands.get('kayit');
        if (kayitCmd?.handleInteraction) {
          try { await kayitCmd.handleInteraction(interaction, client); }
          catch (e) { console.error('[Kayit Modal] Hata:', e.message); }
        }
        return;
      }

      // ── Kullanıcı kayıt formu modal'ı ──
      if (id === 'kayit_modal') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const isim = interaction.fields.getTextInputValue('kayit_isim');
        const yas  = interaction.fields.getTextInputValue('kayit_yas');
        const member = interaction.member;

        try {
          const kayitliRolId   = config.kayit?.memberRoller?.[0] || '';
          const welcomeChannelId = config.channels?.welcomeChannel || '';

          await member.setNickname(`${isim} | ${yas}`).catch(() => {});
          if (kayitliRolId) await member.roles.add(kayitliRolId).catch(() => {});

          await interaction.editReply({ content: `✅ Başarıyla kayıt oldun! İsmin **${isim} | ${yas}** olarak güncellendi.` });

          const welcomeChannel = welcomeChannelId ? interaction.guild.channels.cache.get(welcomeChannelId) : null;
          if (welcomeChannel) {
            try {
              const avatarURL    = member.user.displayAvatarURL({ extension: 'png', size: 1024 });
              const backgroundURL = config.welcome?.bannerUrl || '';
              const params = new URLSearchParams({
                avatar: avatarURL, arkaplan: backgroundURL,
                yazi1: 'Hoşgeldin', yazi2: isim, yazi3: 'Sunucumuza katıldı',
                baslikhex: 'ffffff', usernamehex: '5865f2', footerhex: 'a1a1ab',
              });
              const apiURL    = `https://elecus.dev/api/v1/hgbb?${params.toString()}`;
              const response  = await fetch(apiURL);
              if (response.ok) {
                const buffer    = Buffer.from(await response.arrayBuffer());
                const attachment = new AttachmentBuilder(buffer, { name: 'welcome-banner.png' });
                await welcomeChannel.send({ files: [attachment] });
              }
            } catch (apiError) {
              console.error('Banner API hatası:', apiError.message);
            }
          }
        } catch (error) {
          console.error(error);
          await interaction.editReply({ content: '❌ Kayıt olurken bir hata oluştu. Lütfen yetkililere bildir.' });
        }
        return;
      }

      return;
    }
  },
};
