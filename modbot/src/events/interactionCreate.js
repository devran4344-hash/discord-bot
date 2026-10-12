// ╔══════════════════════════════════════════════════════════════════════╗
// ║          EVENT: interactionCreate — Tüm Buton & Menü Handler        ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    try {
      // ─── Slash Komutlar ───────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;

        // Slash execute varsa onu çağır, yoksa prefix execute'u fake message ile çağır
        if (cmd.executeSlash) {
          return cmd.executeSlash(interaction, client).catch(err => {
            console.error(`[Slash Hata] ${interaction.commandName}:`, err);
            const reply = interaction.replied || interaction.deferred
              ? interaction.followUp.bind(interaction)
              : interaction.reply.bind(interaction);
            reply({ content: '❌ Komut çalışırken bir hata oluştu.', flags: 64 }).catch(() => null);
          });
        }
        return;
      }

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

        // ── Kayıt sistemi butonları ───────────────────────────────
        if (
          id.startsWith('kayit_isim_') ||
          id.startsWith('kayit_kayitsiz_') ||
          id.startsWith('kayit_bilgi_') ||
          id.startsWith('kayit_hizli_')
        ) {
          // Hızlı kayıt butonu — modal aç
          if (id.startsWith('kayit_hizli_')) {
            const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
            const userId = id.replace('kayit_hizli_', '');
            const kayitCmd = client.commands.get('kayit');
            if (!kayitCmd) return;

            // Yetkili kontrolü
            const yetkiliRoller = config.kayit?.yetkiliRoller || [];
            const isYetkili =
              interaction.member.permissions.has(1n) || // Administrator
              yetkiliRoller.some(r => interaction.member.roles.cache.has(r));

            if (!isYetkili) {
              return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Bu işlem için yetkin yok.')], flags: 64 });
            }

            const modal = new ModalBuilder()
              .setCustomId(`kayit_hizli_modal_${userId}`)
              .setTitle('Hızlı Kayıt');

            const isimInput = new TextInputBuilder()
              .setCustomId('kayit_isim')
              .setLabel('Üyenin İsmi')
              .setStyle(TextInputStyle.Short)
              .setMinLength(1)
              .setMaxLength(32)
              .setRequired(true)
              .setPlaceholder('Örn: Ahmet');

            modal.addComponents(new ActionRowBuilder().addComponents(isimInput));
            return interaction.showModal(modal);
          }

          const kayitCmd = client.commands.get('kayit');
          if (kayitCmd?.handleInteraction) {
            return kayitCmd.handleInteraction(interaction, client).catch(err => {
              console.error('[Kayıt Button Hatası]', err);
              if (!interaction.replied && !interaction.deferred) {
                interaction.reply({ content: '❌ Bir hata oluştu.', flags: 64 }).catch(() => null);
              }
            });
          }
        }
      }

      // ─── Modal Submit ─────────────────────────────────────────
      if (interaction.isModalSubmit()) {
        const mid = interaction.customId;

        // Kayıt: isim değiştir modal
        if (mid.startsWith('kayit_isim_modal_')) {
          const kayitCmd = client.commands.get('kayit');
          if (kayitCmd?.handleInteraction) {
            return kayitCmd.handleInteraction(interaction, client).catch(err => {
              console.error('[Kayıt Modal Hatası]', err);
              if (!interaction.replied && !interaction.deferred) {
                interaction.reply({ content: '❌ Bir hata oluştu.', flags: 64 }).catch(() => null);
              }
            });
          }
        }

        // Kayıt: hızlı kayıt modal
        if (mid.startsWith('kayit_hizli_modal_')) {
          const userId  = mid.replace('kayit_hizli_modal_', '');
          const isim    = interaction.fields.getTextInputValue('kayit_isim').trim();
          const hedef   = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!hedef) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Üye bulunamadı.')], flags: 64 });

          const kayitCmd = client.commands.get('kayit');
          if (!kayitCmd) return;

          // kayitIsle fonksiyonunu doğrudan çağır
          const { kayitEkle, kayitSayaci } = require('../utils/database');
          const { discordTimestamp: dt } = require('../utils/helpers');

          // Rol işlemleri
          const cfg = config.kayit;
          const sayac = await kayitSayaci(interaction.guild.id);
          const format = isim.slice(0, 32);
          await hedef.setNickname(format, `Hızlı kayıt: ${interaction.user.tag}`).catch(() => null);

          if (cfg.kayitsizRolId) {
            const kr = interaction.guild.roles.cache.get(cfg.kayitsizRolId);
            if (kr && hedef.roles.cache.has(cfg.kayitsizRolId)) {
              await hedef.roles.remove(kr, 'Kayıt tamamlandı').catch(() => null);
            }
          }
          const verilenRoller = [];
          for (const rolId of cfg.memberRoller) {
            const rol = interaction.guild.roles.cache.get(rolId);
            if (rol && !hedef.roles.cache.has(rolId)) {
              await hedef.roles.add(rol, 'Hızlı kayıt').catch(() => null);
              verilenRoller.push(rolId);
            }
          }

          const turObj = cfg.turler?.[0] || { id: 'normal', label: 'Normal', emoji: '✅', renk: 0x2ECC71 };

          await kayitEkle(interaction.guild.id, hedef.id, {
            isim: format, tur: turObj.id,
            kaydedenId: interaction.member.id, kaydedenTag: interaction.user.tag,
            verilen: verilenRoller, kayitSayisi: sayac,
          });

          const { EmbedBuilder: EB } = require('discord.js');
          await interaction.reply({
            embeds: [new EB()
              .setColor(turObj.renk || config.colors.success)
              .setDescription(`✅ <@${hedef.id}> başarıyla kayıt edildi!\n> İsim: \`${format}\` • Kayıt No: \`#${sayac}\``)
              .setTimestamp()],
            flags: 64,
          });

          // Log kanalına bildir
          if (cfg.logKanalId) {
            const logKanal = interaction.guild.channels.cache.get(cfg.logKanalId);
            if (logKanal) {
              await logKanal.send({ embeds: [new EB()
                .setColor(turObj.renk || config.colors.success)
                .setAuthor({ name: `✅ Hızlı Kayıt — ${hedef.user.username}`, iconURL: hedef.user.displayAvatarURL({ dynamic: true }) })
                .addFields(
                  { name: '👤 Kayıt Edilen', value: `<@${hedef.id}> \`${hedef.user.tag}\``,             inline: true },
                  { name: '🛡️ Kayıt Eden',   value: `<@${interaction.member.id}> \`${interaction.user.tag}\``, inline: true },
                  { name: '📝 İsim',          value: `\`${format}\``,                                    inline: true },
                  { name: '🏷️ Roller',        value: verilenRoller.length ? verilenRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
                  { name: '🔢 Kayıt No',      value: `\`#${sayac}\``,                                    inline: true },
                )
                .setTimestamp()] }).catch(() => null);
            }
          }
        }
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
