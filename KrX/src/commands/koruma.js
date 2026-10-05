const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');
const lg = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('koruma')
    .setDescription('🛡️ Anti-raid, anti-spam, link ve kelime filtresi')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── ANTİ-SPAM ────────────────────────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('spam').setDescription('Anti-spam ayarları')
      .addSubcommand(s => s.setName('ayarla').setDescription('Anti-spam yapılandır')
        .addBooleanOption(o => o.setName('aktif').setDescription('Aktif mi?').setRequired(true))
        .addIntegerOption(o => o.setName('limit').setDescription('Kaç saniyede kaç mesaj spam sayılır?').setMinValue(2).setMaxValue(20))
        .addIntegerOption(o => o.setName('sure').setDescription('Zaman penceresi (saniye)').setMinValue(1).setMaxValue(30))
        .addStringOption(o => o.setName('aksiyon').setDescription('Spam aksiyonu')
          .addChoices({ name:'🗑️ Sadece Sil',value:'sil' },{ name:'🔇 Mute',value:'mute' },{ name:'👢 Kick',value:'kick' }))
        .addIntegerOption(o => o.setName('mute_dk').setDescription('Mute süresi (dakika)').setMinValue(1).setMaxValue(10080)))
      .addSubcommand(s => s.setName('durum').setDescription('Spam ayarlarını göster')))

    // ── ANTİ-RAİD ────────────────────────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('raid').setDescription('Anti-raid ayarları')
      .addSubcommand(s => s.setName('ayarla').setDescription('Anti-raid yapılandır')
        .addBooleanOption(o => o.setName('aktif').setDescription('Aktif mi?').setRequired(true))
        .addIntegerOption(o => o.setName('esik').setDescription('Kaç kişi X saniyede katılırsa raid?').setMinValue(3).setMaxValue(50))
        .addIntegerOption(o => o.setName('sure').setDescription('Saniye penceresi').setMinValue(5).setMaxValue(60))
        .addStringOption(o => o.setName('aksiyon').setDescription('Raid aksiyonu')
          .addChoices({ name:'👢 Kick',value:'kick' },{ name:'🔨 Ban',value:'ban' },{ name:'🔒 Kilitle (Lockdown)',value:'lockdown' })))
      .addSubcommand(s => s.setName('durum').setDescription('Raid ayarlarını göster')))

    // ── LİNK FİLTRESİ ────────────────────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('link').setDescription('Link filtresi')
      .addSubcommand(s => s.setName('ayarla').setDescription('Link filtresini aç/kapat')
        .addBooleanOption(o => o.setName('aktif').setDescription('Aktif mi?').setRequired(true)))
      .addSubcommand(s => s.setName('ekle').setDescription('Yasak domain ekle')
        .addStringOption(o => o.setName('domain').setDescription('Örn: example.com').setRequired(true)))
      .addSubcommand(s => s.setName('sil').setDescription('Domain sil')
        .addStringOption(o => o.setName('domain').setDescription('Domain').setRequired(true)))
      .addSubcommand(s => s.setName('liste').setDescription('Yasak domainler')))

    // ── KELİME FİLTRESİ ──────────────────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('kelime').setDescription('Kelime filtresi')
      .addSubcommand(s => s.setName('ayarla').setDescription('Kelime filtresini aç/kapat')
        .addBooleanOption(o => o.setName('aktif').setDescription('Aktif mi?').setRequired(true)))
      .addSubcommand(s => s.setName('ekle').setDescription('Yasak kelime ekle')
        .addStringOption(o => o.setName('kelime').setDescription('Kelime').setRequired(true)))
      .addSubcommand(s => s.setName('sil').setDescription('Kelime sil')
        .addStringOption(o => o.setName('kelime').setDescription('Kelime').setRequired(true)))
      .addSubcommand(s => s.setName('liste').setDescription('Yasak kelimeler'))),

  async execute(i) {
    await i.deferReply({ ephemeral: true });
    const g   = i.guild;
    const grp = i.options.getSubcommandGroup();
    const s   = i.options.getSubcommand();
    const a   = db.guildGetir(g.id);

    // ── SPAM ─────────────────────────────────────────────────────────────────
    if (grp === 'spam') {
      if (s === 'ayarla') {
        const aktif   = i.options.getBoolean('aktif');
        const limit   = i.options.getInteger('limit')   ?? a.spam_limit;
        const sure    = i.options.getInteger('sure')    ?? a.spam_sure;
        const aksiyon = i.options.getString('aksiyon')  ?? a.spam_aksiyon;
        const muteDk  = i.options.getInteger('mute_dk') ?? a.spam_mute_dk;

        db.guildAyarla(g.id, { spam_aktif:aktif, spam_limit:limit, spam_sure:sure, spam_aksiyon:aksiyon, spam_mute_dk:muteDk });

        return i.editReply({ embeds: [lg.ok(
          `Anti-Spam ${aktif ? 'Aktif' : 'Kapalı'}`,
          aktif
            ? `**${sure} saniyede ${limit}+ mesaj** → \`${aksiyon}\` aksiyonu\n${aksiyon==='mute'?`Mute süresi: \`${muteDk} dakika\``:''}`.trim()
            : 'Anti-spam devre dışı.',
        )] });
      }
      if (s === 'durum') {
        return i.editReply({ embeds: [new EmbedBuilder().setColor(0x5856D6).setTitle('📊 Anti-Spam Durumu')
          .addFields(
            { name:'⚡ Durum',      value:a.spam_aktif?'✅ Aktif':'❌ Kapalı', inline:true },
            { name:'📨 Limit',      value:`\`${a.spam_sure}sn'de ${a.spam_limit} mesaj\``, inline:true },
            { name:'⚖️ Aksiyon',   value:`\`${a.spam_aksiyon}\``, inline:true },
            { name:'⏱️ Mute Süresi',value:`\`${a.spam_mute_dk} dk\``, inline:true },
          ).setTimestamp()] });
      }
    }

    // ── RAID ─────────────────────────────────────────────────────────────────
    if (grp === 'raid') {
      if (s === 'ayarla') {
        const aktif   = i.options.getBoolean('aktif');
        const esik    = i.options.getInteger('esik')  ?? a.raid_esik;
        const sure    = i.options.getInteger('sure')  ?? a.raid_esik_sure;
        const aksiyon = i.options.getString('aksiyon')?? a.raid_aksiyon;

        db.guildAyarla(g.id, { raid_aktif:aktif, raid_esik:esik, raid_esik_sure:sure, raid_aksiyon:aksiyon });

        return i.editReply({ embeds: [lg.ok(
          `Anti-Raid ${aktif ? 'Aktif' : 'Kapalı'}`,
          aktif ? `**${sure} saniyede ${esik}+ katılım** → \`${aksiyon}\` aksiyonu` : 'Anti-raid devre dışı.',
        )] });
      }
      if (s === 'durum') {
        return i.editReply({ embeds: [new EmbedBuilder().setColor(0xAF52DE).setTitle('🚨 Anti-Raid Durumu')
          .addFields(
            { name:'⚡ Durum',    value:a.raid_aktif?'✅ Aktif':'❌ Kapalı', inline:true },
            { name:'👥 Eşik',    value:`\`${a.raid_esik_sure}sn'de ${a.raid_esik} kişi\``, inline:true },
            { name:'⚖️ Aksiyon',value:`\`${a.raid_aksiyon}\``, inline:true },
          ).setTimestamp()] });
      }
    }

    // ── LİNK ─────────────────────────────────────────────────────────────────
    if (grp === 'link') {
      if (s === 'ayarla') {
        db.guildAyarla(g.id, { link_filtre_aktif: i.options.getBoolean('aktif') });
        return i.editReply({ embeds: [lg.ok('Link Filtresi', i.options.getBoolean('aktif') ? 'Yasak domainler silinecek.' : 'Link filtresi kapalı.')] });
      }
      if (s === 'ekle') {
        const d = i.options.getString('domain').toLowerCase().replace(/https?:\/\//,'');
        db.linkEkle(g.id, d);
        return i.editReply({ embeds: [lg.ok('Domain Eklendi', `\`${d}\` yasak listeye eklendi.`)] });
      }
      if (s === 'sil') {
        const d = i.options.getString('domain').toLowerCase();
        db.linkSil(g.id, d);
        return i.editReply({ embeds: [lg.ok('Domain Silindi', `\`${d}\` listeden kaldırıldı.`)] });
      }
      if (s === 'liste') {
        const list = db.linkListesi(g.id);
        return i.editReply({ embeds: [lg.bilgi('Yasak Domainler', list.length ? list.map(l=>`\`${l.domain}\``).join('\n') : '`Liste boş`')] });
      }
    }

    // ── KELİME ────────────────────────────────────────────────────────────────
    if (grp === 'kelime') {
      if (s === 'ayarla') {
        db.guildAyarla(g.id, { kelime_filtre_aktif: i.options.getBoolean('aktif') });
        return i.editReply({ embeds: [lg.ok('Kelime Filtresi', i.options.getBoolean('aktif') ? 'Yasak kelimeler silinecek.' : 'Kelime filtresi kapalı.')] });
      }
      if (s === 'ekle') {
        const k = i.options.getString('kelime').toLowerCase();
        db.kelimeEkle(g.id, k);
        return i.editReply({ embeds: [lg.ok('Kelime Eklendi', `\`${k}\` yasak listeye eklendi.`)] });
      }
      if (s === 'sil') {
        const k = i.options.getString('kelime').toLowerCase();
        db.kelimeSil(g.id, k);
        return i.editReply({ embeds: [lg.ok('Kelime Silindi', `\`${k}\` listeden kaldırıldı.`)] });
      }
      if (s === 'liste') {
        const list = db.kelimeListesi(g.id);
        return i.editReply({ embeds: [lg.bilgi('Yasak Kelimeler', list.length ? list.map(k=>`\`${k.kelime}\``).join(', ') : '`Liste boş`')] });
      }
    }
  },
};
