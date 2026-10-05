/**
 * KrX NSFW Guard v2 — /ayarla
 * Tam interaktif kontrol paneli.
 * Buton + Modal ile her şeyi buradan yönet.
 */

const {
  SlashCommandBuilder, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

const db = require('../database');

// ══════════════════════════════════════════════════════════
//  EMBED ÜRETİCİLER
// ══════════════════════════════════════════════════════════

function simdi() { return `<t:${Math.floor(Date.now() / 1000)}:R>`; }
function ac(v)   { return v ? '```✅ Açık```'   : '```❌ Kapalı```'; }
function acSatir(v) { return v ? '`✅ Açık`' : '`❌ Kapalı`'; }

// ─── ANA PANEL ────────────────────────────────────────────
function embedAna(guild, a) {
  const cezalar  = db.cezaListele(guild.id);
  const silinen  = db.silinenListesi(guild.id, 999);
  const ihlaller = db.ihlalListesi(guild.id, 999);
  const bugun    = Date.now() - 86400000;

  return new EmbedBuilder()
    .setColor(a.aktif ? 0x5856D6 : 0x636366)
    .setAuthor({
      name: `KrX NSFW Guard v2  •  ${guild.name}`,
      iconURL: guild.iconURL() || undefined,
    })
    .setTitle('🛡️  Ana Kontrol Paneli')
    .setDescription(
      `> Sunucunun güvenlik sistemlerini buradan yönet.\n` +
      `> Kategori butonlarına tıklayarak detaylı ayarlara ulaş.\n` +
      `> Son güncelleme: ${simdi()}`
    )
    .addFields(
      {
        name: '╔═  🤖 Sistem',
        value:
          `> Bot Durumu        ${acSatir(a.aktif)}\n` +
          `> NSFW Koruması     ${acSatir(a.nsfw_aktif)}\n` +
          `> AI Tespiti        ${acSatir(a.ai_aktif)}  ·  Güven: \`%${Math.round((a.min_guven_skoru || 0.75) * 100)}\`\n` +
          `> Tarama Modu       \`${a.mod === 'tum_kanallar' ? '🌐 Tüm Kanallar' : `📌 Seçili (${(a.secili_kanallar || []).length} kanal)`}\``,
        inline: true,
      },
      {
        name: '╔═  🔒 Güvenlik',
        value:
          `> Anti-Spam         ${acSatir(a.spam_aktif)}\n` +
          `> Anti-Raid         ${acSatir(a.raid_aktif)}\n` +
          `> Link Filtresi     ${acSatir(a.link_filtre_aktif)}\n` +
          `> Kelime Filtresi   ${acSatir(a.kelime_filtre_aktif)}`,
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: false },
      {
        name: '╔═  🔞 NSFW Detay',
        value:
          `> Spoiler Bypass    ${acSatir(a.spoiler_kontrol)}\n` +
          `> Davet Filtresi    ${acSatir(a.davet_filtresi)}\n` +
          `> NSFW Log          ${a.log_kanal_id ? `<#${a.log_kanal_id}>` : '`Ayarlanmamış`'}\n` +
          `> Mod Log           ${a.mod_log_kanal_id ? `<#${a.mod_log_kanal_id}>` : '`Ayarlanmamış`'}`,
        inline: true,
      },
      {
        name: '╔═  📊 İstatistik',
        value:
          `> Bugün Silinen     \`${silinen.filter(s => s.zaman > bugun).length}\`\n` +
          `> Toplam Silinen    \`${silinen.length}\`\n` +
          `> Toplam İhlal      \`${ihlaller.reduce((t, k) => t + k.toplam, 0)}\`\n` +
          `> Ceza Adımı        \`${cezalar.length}\``,
        inline: true,
      },
    )
    .setFooter({ text: 'KrX NSFW Guard v2  •  /yardim ile tüm komutlar' })
    .setTimestamp();
}

// ─── NSFW PANELİ ──────────────────────────────────────────
function embedNsfw(guild, a) {
  const cezalar = db.cezaListele(guild.id);
  const tipAd   = { uyari: '⚠️ Uyarı', mute: '🔇 Mute', kick: '👢 Kick', ban: '🔨 Ban' };

  const cezaStr = cezalar.length
    ? cezalar.map(c =>
        `> \`${c.adim_no}.\` ${tipAd[c.tip] || c.tip}` +
        (c.tip !== 'uyari' && c.tip !== 'kick' ? `  *(${db.sureyiBicimle(c.sure_dk, c.sure_saat, c.sure_gun)})*` : '') +
        `\n>  └ ${c.sebep}`
      ).join('\n')
    : '> `Henüz ceza adımı eklenmemiş`\n> Kullan: `/ceza ekle`';

  const muafK = (a.muaf_kanallar || []).map(id => `<#${id}>`).join(' ') || '`Yok`';
  const secK  = (a.secili_kanallar || []).map(id => `<#${id}>`).join(' ') || '`Henüz eklenmemiş`';
  const muafR = (a.muaf_roller || []).map(id => `<@&${id}>`).join(' ') || '`Yok`';

  return new EmbedBuilder()
    .setColor(0xFF2D55)
    .setAuthor({ name: `KrX NSFW Guard v2  •  ${guild.name}`, iconURL: guild.iconURL() || undefined })
    .setTitle('🔞  NSFW Koruma Paneli')
    .setDescription('> NSFW tespiti, ceza sistemi ve kanal ayarları.')
    .addFields(
      {
        name: '╔═  🔍 Tespit Sistemi',
        value:
          `> NSFW Koruması   ${acSatir(a.nsfw_aktif)}\n` +
          `> AI Tespiti      ${acSatir(a.ai_aktif)}\n` +
          `> AI Güven Skoru  \`%${Math.round((a.min_guven_skoru || 0.75) * 100)}\`\n` +
          `> Discord Flag    ${acSatir(a.discord_flag_aktif)}\n` +
          `> Spoiler Bypass  ${acSatir(a.spoiler_kontrol)}`,
        inline: true,
      },
      {
        name: '╔═  📡 Kanal Ayarları',
        value:
          `> Tarama Modu    \`${a.mod === 'tum_kanallar' ? '🌐 Tüm' : '📌 Seçili'}\`\n` +
          `> Seçili Kanallar\n> ${secK}\n` +
          `> Muaf Kanallar\n> ${muafK}\n` +
          `> Muaf Roller\n> ${muafR}`,
        inline: true,
      },
      {
        name: '╔═  ⚖️ Ceza Basamakları',
        value: cezaStr,
        inline: false,
      },
      {
        name: '╔═  📋 Log Kanalları',
        value:
          `> NSFW Log   ${a.log_kanal_id ? `<#${a.log_kanal_id}>` : '`Ayarlanmamış — 📋 Log Ayarla butonuna bas`'}\n` +
          `> Mod Log    ${a.mod_log_kanal_id ? `<#${a.mod_log_kanal_id}>` : '`Ayarlanmamış`'}`,
        inline: false,
      },
    )
    .setFooter({ text: 'KrX NSFW Guard v2  •  NSFW Paneli' })
    .setTimestamp();
}

// ─── GÜVENLİK PANELİ ──────────────────────────────────────
function embedGuvenlik(guild, a) {
  const linkler  = db.linkListesi(guild.id);
  const kelimeler = db.kelimeListesi(guild.id);

  return new EmbedBuilder()
    .setColor(0xFF9F0A)
    .setAuthor({ name: `KrX NSFW Guard v2  •  ${guild.name}`, iconURL: guild.iconURL() || undefined })
    .setTitle('🔒  Güvenlik Sistemleri Paneli')
    .setDescription('> Spam, raid, link ve kelime filtrelerini buradan yönet.')
    .addFields(
      {
        name: '╔═  🚫 Anti-Spam',
        value:
          `> Durum      ${acSatir(a.spam_aktif)}\n` +
          `> Eşik       \`${a.spam_sure} sn'de ${a.spam_limit} mesaj\`\n` +
          `> Aksiyon    \`${a.spam_aksiyon}\`` +
          (a.spam_aksiyon === 'mute' ? `  ·  \`${a.spam_mute_dk} dk\`` : ''),
        inline: true,
      },
      {
        name: '╔═  🚨 Anti-Raid',
        value:
          `> Durum      ${acSatir(a.raid_aktif)}\n` +
          `> Eşik       \`${a.raid_esik_sure} sn'de ${a.raid_esik} kişi\`\n` +
          `> Aksiyon    \`${a.raid_aksiyon}\``,
        inline: true,
      },
      {
        name: '╔═  🔗 Link & Kelime Filtresi',
        value:
          `> Link Filtresi     ${acSatir(a.link_filtre_aktif)}  ·  \`${linkler.length} domain\`\n` +
          `> Kelime Filtresi   ${acSatir(a.kelime_filtre_aktif)}  ·  \`${kelimeler.length} kelime\`\n` +
          `> Davet Filtresi    ${acSatir(a.davet_filtresi)}`,
        inline: false,
      },
      {
        name: '╔═  🔗 Yasak Domainler',
        value: linkler.length ? linkler.map(l => `\`${l.domain}\``).join(' ') : '`Yok — /koruma link ekle ile ekle`',
        inline: true,
      },
      {
        name: '╔═  💬 Yasak Kelimeler',
        value: kelimeler.length
          ? kelimeler.slice(0, 15).map(k => `\`${k.kelime}\``).join(' ') + (kelimeler.length > 15 ? ` +${kelimeler.length - 15}` : '')
          : '`Yok — /koruma kelime ekle ile ekle`',
        inline: true,
      },
    )
    .setFooter({ text: 'KrX NSFW Guard v2  •  Güvenlik Paneli' })
    .setTimestamp();
}

// ══════════════════════════════════════════════════════════
//  BUTON SATIRLARI
// ══════════════════════════════════════════════════════════

function butonlarAna(a) {
  return [
    // Navigasyon
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('p:nsfw').setLabel('🔞 NSFW Paneli').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('p:guvenlik').setLabel('🔒 Güvenlik').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('p:yenile').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
    ),
    // Hızlı toggle'lar
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('t:aktif')
        .setLabel(a.aktif ? '⛔ Sistemi Kapat' : '✅ Sistemi Aç')
        .setStyle(a.aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:nsfw_aktif')
        .setLabel(a.nsfw_aktif ? '🔞 NSFW Kapat' : '🔞 NSFW Aç')
        .setStyle(a.nsfw_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:ai_aktif')
        .setLabel(a.ai_aktif ? '🤖 AI Kapat' : '🤖 AI Aç')
        .setStyle(a.ai_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  ];
}

function butonlarNsfw(a) {
  return [
    // Navigasyon
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('p:ana').setLabel('🏠 Ana Panel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p:guvenlik').setLabel('🔒 Güvenlik').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('p:yenile').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
    ),
    // Toggle'lar
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('t:nsfw_aktif')
        .setLabel(a.nsfw_aktif ? '🔞 NSFW Kapat' : '🔞 NSFW Aç')
        .setStyle(a.nsfw_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:ai_aktif')
        .setLabel(a.ai_aktif ? '🤖 AI Kapat' : '🤖 AI Aç')
        .setStyle(a.ai_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:spoiler_kontrol')
        .setLabel(a.spoiler_kontrol ? '🕵️ Spoiler Kapat' : '🕵️ Spoiler Aç')
        .setStyle(a.spoiler_kontrol ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:davet_filtresi')
        .setLabel(a.davet_filtresi ? '💌 Davet Kapat' : '💌 Davet Aç')
        .setStyle(a.davet_filtresi ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
    // Ayar modalları
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('m:guvenskoru').setLabel('📊 Güven Skoru').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('m:log_kanal').setLabel('📋 Log Kanalı').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('m:modlog_kanal').setLabel('📋 Mod Log').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('t:tarama_mod')
        .setLabel(a.mod === 'tum_kanallar' ? '📌 Seçili Moda Geç' : '🌐 Tüm Kanallara Geç')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function butonlarGuvenlik(a) {
  return [
    // Navigasyon
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('p:ana').setLabel('🏠 Ana Panel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p:nsfw').setLabel('🔞 NSFW').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('p:yenile').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
    ),
    // Toggle'lar
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('t:spam_aktif')
        .setLabel(a.spam_aktif ? '🚫 Spam Kapat' : '🚫 Spam Aç')
        .setStyle(a.spam_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:raid_aktif')
        .setLabel(a.raid_aktif ? '🚨 Raid Kapat' : '🚨 Raid Aç')
        .setStyle(a.raid_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:link_filtre_aktif')
        .setLabel(a.link_filtre_aktif ? '🔗 Link Kapat' : '🔗 Link Aç')
        .setStyle(a.link_filtre_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('t:kelime_filtre_aktif')
        .setLabel(a.kelime_filtre_aktif ? '💬 Kelime Kapat' : '💬 Kelime Aç')
        .setStyle(a.kelime_filtre_aktif ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
    // Spam ayar modalı
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('m:spam').setLabel('⚙️ Spam Ayarla').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('m:raid').setLabel('⚙️ Raid Ayarla').setStyle(ButtonStyle.Primary),
    ),
  ];
}

// ══════════════════════════════════════════════════════════
//  PANEL GÖNDER
// ══════════════════════════════════════════════════════════
async function panelGonder(interaction, tip, guild, a, ilk = false) {
  const embed  = tip === 'nsfw'     ? embedNsfw(guild, a)
               : tip === 'guvenlik' ? embedGuvenlik(guild, a)
               : embedAna(guild, a);
  const butonlar = tip === 'nsfw'     ? butonlarNsfw(a)
                 : tip === 'guvenlik' ? butonlarGuvenlik(a)
                 : butonlarAna(a);
  const veri = { embeds: [embed], components: butonlar, ephemeral: true };
  if (ilk) await interaction.editReply(veri);
  else     await interaction.update(veri);
}

// ══════════════════════════════════════════════════════════
//  MODAL TANIMLARI
// ══════════════════════════════════════════════════════════
function modalGuvenskoru(a) {
  return new ModalBuilder()
    .setCustomId('modal:guvenskoru')
    .setTitle('📊 AI Güven Skoru')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('deger')
        .setLabel('Güven Skoru (0.1 – 1.0)')
        .setPlaceholder(`Mevcut: ${a.min_guven_skoru || 0.75}  |  Düşük = daha agresif tespit`)
        .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(4)
    ));
}

function modalLogKanal(a, tip) {
  return new ModalBuilder()
    .setCustomId(`modal:${tip}`)
    .setTitle(tip === 'log_kanal' ? '📋 NSFW Log Kanalı' : '📋 Moderasyon Log Kanalı')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('kanal_id')
        .setLabel('Kanal ID\'sini gir')
        .setPlaceholder(
          tip === 'log_kanal'
            ? `Mevcut: ${a.log_kanal_id || 'Ayarlanmamış'}`
            : `Mevcut: ${a.mod_log_kanal_id || 'Ayarlanmamış'}`
        )
        .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20)
    ));
}

function modalSpam(a) {
  return new ModalBuilder()
    .setCustomId('modal:spam')
    .setTitle('🚫 Anti-Spam Ayarları')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('limit')
          .setLabel('Kaç mesaj spam sayılır?').setPlaceholder(`Mevcut: ${a.spam_limit}`)
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('sure')
          .setLabel('Zaman penceresi (saniye)').setPlaceholder(`Mevcut: ${a.spam_sure}`)
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('mute_dk')
          .setLabel('Mute süresi (dakika, 0 = devre dışı)').setPlaceholder(`Mevcut: ${a.spam_mute_dk}`)
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(4)
      ),
    );
}

function modalRaid(a) {
  return new ModalBuilder()
    .setCustomId('modal:raid')
    .setTitle('🚨 Anti-Raid Ayarları')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('esik')
          .setLabel('Kaç kişi katılırsa raid?').setPlaceholder(`Mevcut: ${a.raid_esik}`)
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('sure')
          .setLabel('Zaman penceresi (saniye)').setPlaceholder(`Mevcut: ${a.raid_esik_sure}`)
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2)
      ),
    );
}

// ══════════════════════════════════════════════════════════
//  KOMUT TANIMI
// ══════════════════════════════════════════════════════════
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayarla')
    .setDescription('⚙️ KrX NSFW Guard kontrol panelini aç')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // ─── Slash execute ──────────────────────────────────────
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const a = db.guildGetir(interaction.guild.id);
    await panelGonder(interaction, 'ana', interaction.guild, a, true);
  },

  // ─── Buton handler ──────────────────────────────────────
  async handleButton(interaction) {
    const guild = interaction.guild;
    let a = db.guildGetir(guild.id);
    const id = interaction.customId;

    // ── Panel geçişleri ──────────────────────────────────
    if (id === 'p:ana')      return panelGonder(interaction, 'ana',      guild, a);
    if (id === 'p:nsfw')     return panelGonder(interaction, 'nsfw',     guild, a);
    if (id === 'p:guvenlik') return panelGonder(interaction, 'guvenlik', guild, a);
    if (id === 'p:yenile') {
      const baslik = interaction.message?.embeds?.[0]?.title || '';
      const tip    = baslik.includes('NSFW') ? 'nsfw' : baslik.includes('Güvenlik') ? 'guvenlik' : 'ana';
      return panelGonder(interaction, tip, guild, db.guildGetir(guild.id));
    }

    // ── Toggle'lar (t:alan_adı) ──────────────────────────
    if (id.startsWith('t:')) {
      const alan = id.slice(2);

      if (alan === 'tarama_mod') {
        const yeni = a.mod === 'tum_kanallar' ? 'secili_kanallar' : 'tum_kanallar';
        db.guildAyarla(guild.id, { mod: yeni });
        a = db.guildGetir(guild.id);
        return panelGonder(interaction, 'nsfw', guild, a);
      }

      // Boolean toggle
      const mevcut = a[alan];
      if (typeof mevcut === 'boolean' || mevcut === 0 || mevcut === 1) {
        db.guildAyarla(guild.id, { [alan]: !mevcut });
        a = db.guildGetir(guild.id);
        // Hangi panelden geldi?
        const baslik = interaction.message?.embeds?.[0]?.title || '';
        const tip    = baslik.includes('NSFW') ? 'nsfw' : baslik.includes('Güvenlik') ? 'guvenlik' : 'ana';
        return panelGonder(interaction, tip, guild, a);
      }
    }

    // ── Modal aç (m:modal_adi) ───────────────────────────
    if (id === 'm:guvenskoru')  return interaction.showModal(modalGuvenskoru(a));
    if (id === 'm:log_kanal')   return interaction.showModal(modalLogKanal(a, 'log_kanal'));
    if (id === 'm:modlog_kanal')return interaction.showModal(modalLogKanal(a, 'modlog_kanal'));
    if (id === 'm:spam')        return interaction.showModal(modalSpam(a));
    if (id === 'm:raid')        return interaction.showModal(modalRaid(a));
  },

  // ─── Modal handler ──────────────────────────────────────
  async handleModal(interaction) {
    const guild = interaction.guild;
    const id    = interaction.customId;

    // Güven skoru
    if (id === 'modal:guvenskoru') {
      await interaction.deferUpdate();
      const skor = parseFloat(interaction.fields.getTextInputValue('deger'));
      if (isNaN(skor) || skor < 0.1 || skor > 1.0) {
        return interaction.followUp({ ephemeral: true, content: '❌ Geçersiz değer. 0.1 ile 1.0 arasında gir (örn: `0.75`)' });
      }
      db.guildAyarla(guild.id, { min_guven_skoru: skor });
      return panelGonder(interaction, 'nsfw', guild, db.guildGetir(guild.id));
    }

    // Log kanalı
    if (id === 'modal:log_kanal' || id === 'modal:modlog_kanal') {
      await interaction.deferUpdate();
      const kanalId = interaction.fields.getTextInputValue('kanal_id').trim();
      const kanal   = guild.channels.cache.get(kanalId);
      if (!kanal) {
        return interaction.followUp({ ephemeral: true, content: `❌ Kanal bulunamadı: \`${kanalId}\`\nSağ tıkla → ID Kopyala.` });
      }
      if (id === 'modal:log_kanal') {
        db.guildAyarla(guild.id, { log_kanal_id: kanalId });
        await kanal.send({
          embeds: [new EmbedBuilder().setColor(0x34C759).setTitle('✅ NSFW Log Kanalı Ayarlandı')
            .setDescription(`NSFW ihlal logları bu kanala iletilecek.\nAyarlayan: ${interaction.user}`)
            .setTimestamp()],
        }).catch(() => {});
      } else {
        db.guildAyarla(guild.id, { mod_log_kanal_id: kanalId });
        await kanal.send({
          embeds: [new EmbedBuilder().setColor(0x34C759).setTitle('✅ Moderasyon Log Kanalı Ayarlandı')
            .setDescription(`Moderasyon logları bu kanala iletilecek.\nAyarlayan: ${interaction.user}`)
            .setTimestamp()],
        }).catch(() => {});
      }
      return panelGonder(interaction, 'nsfw', guild, db.guildGetir(guild.id));
    }

    // Spam ayarları
    if (id === 'modal:spam') {
      await interaction.deferUpdate();
      const limit  = parseInt(interaction.fields.getTextInputValue('limit'));
      const sure   = parseInt(interaction.fields.getTextInputValue('sure'));
      const muteDk = parseInt(interaction.fields.getTextInputValue('mute_dk'));
      if (isNaN(limit) || isNaN(sure) || isNaN(muteDk)) {
        return interaction.followUp({ ephemeral: true, content: '❌ Geçersiz değer. Sadece sayı gir.' });
      }
      db.guildAyarla(guild.id, { spam_limit: limit, spam_sure: sure, spam_mute_dk: muteDk, spam_aksiyon: muteDk > 0 ? 'mute' : 'sil' });
      return panelGonder(interaction, 'guvenlik', guild, db.guildGetir(guild.id));
    }

    // Raid ayarları
    if (id === 'modal:raid') {
      await interaction.deferUpdate();
      const esik = parseInt(interaction.fields.getTextInputValue('esik'));
      const sure = parseInt(interaction.fields.getTextInputValue('sure'));
      if (isNaN(esik) || isNaN(sure)) {
        return interaction.followUp({ ephemeral: true, content: '❌ Geçersiz değer. Sadece sayı gir.' });
      }
      db.guildAyarla(guild.id, { raid_esik: esik, raid_esik_sure: sure });
      return panelGonder(interaction, 'guvenlik', guild, db.guildGetir(guild.id));
    }
  },
};
