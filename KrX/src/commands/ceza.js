const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');
const lg = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ceza')
    .setDescription('⚖️ NSFW ceza basamaklarını yönet')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s=>s.setName('ekle').setDescription('Ceza basamağı ekle')
      .addIntegerOption(o=>o.setName('adim').setDescription('Kaçıncı ihlalde?').setRequired(true).setMinValue(1).setMaxValue(20))
      .addStringOption(o=>o.setName('tip').setDescription('Ceza türü').setRequired(true)
        .addChoices({name:'⚠️ Uyarı (sadece DM)',value:'uyari'},{name:'🔇 Mute',value:'mute'},{name:'👢 Kick',value:'kick'},{name:'🔨 Ban',value:'ban'}))
      .addIntegerOption(o=>o.setName('dakika').setDescription('Süre — Dakika').setMinValue(0).setMaxValue(59))
      .addIntegerOption(o=>o.setName('saat').setDescription('Süre — Saat').setMinValue(0).setMaxValue(23))
      .addIntegerOption(o=>o.setName('gun').setDescription('Süre — Gün').setMinValue(0).setMaxValue(28))
      .addStringOption(o=>o.setName('sebep').setDescription('Sebep (DM\'e gönderilir)').setMaxLength(200)))
    .addSubcommand(s=>s.setName('duzenle').setDescription('Mevcut basamağı düzenle')
      .addIntegerOption(o=>o.setName('adim').setDescription('Adım numarası').setRequired(true).setMinValue(1).setMaxValue(20))
      .addStringOption(o=>o.setName('tip').setDescription('Yeni tip').addChoices({name:'⚠️ Uyarı',value:'uyari'},{name:'🔇 Mute',value:'mute'},{name:'👢 Kick',value:'kick'},{name:'🔨 Ban',value:'ban'}))
      .addIntegerOption(o=>o.setName('dakika').setDescription('Yeni dakika').setMinValue(0).setMaxValue(59))
      .addIntegerOption(o=>o.setName('saat').setDescription('Yeni saat').setMinValue(0).setMaxValue(23))
      .addIntegerOption(o=>o.setName('gun').setDescription('Yeni gün').setMinValue(0).setMaxValue(28))
      .addStringOption(o=>o.setName('sebep').setDescription('Yeni sebep').setMaxLength(200)))
    .addSubcommand(s=>s.setName('kaldir').setDescription('Ceza basamağını kaldır')
      .addIntegerOption(o=>o.setName('adim').setDescription('Adım numarası').setRequired(true).setMinValue(1).setMaxValue(20)))
    .addSubcommand(s=>s.setName('liste').setDescription('Tüm ceza basamaklarını listele'))
    .addSubcommand(s=>s.setName('hepsini_sil').setDescription('⚠️ Tüm ceza basamaklarını sil')),

  async execute(i) {
    await i.deferReply({ ephemeral:true });
    const g=i.guild, s=i.options.getSubcommand();

    if (s==='ekle'||s==='duzenle') {
      const adim  = i.options.getInteger('adim');
      const mevcut = db.cezaGetir(g.id, adim);
      if (s==='duzenle' && !mevcut) return i.editReply({embeds:[lg.hata('Bulunamadı',`\`${adim}. adım\` yok. Önce ekle.`)]});

      const tip   = i.options.getString('tip')    || mevcut?.tip;
      const dk    = i.options.getInteger('dakika') ?? mevcut?.sure_dk  ?? 0;
      const saat  = i.options.getInteger('saat')   ?? mevcut?.sure_saat ?? 0;
      const gun   = i.options.getInteger('gun')    ?? mevcut?.sure_gun  ?? 0;
      const sebep = i.options.getString('sebep')   || mevcut?.sebep || 'NSFW İhlali';

      db.cezaEkle(g.id, adim, tip, dk, saat, gun, sebep);

      const tipAd={uyari:'⚠️ Uyarı',mute:'🔇 Mute',kick:'👢 Kick',ban:'🔨 Ban'};
      const sureStr = db.sureyiBicimle(dk,saat,gun);
      return i.editReply({embeds:[lg.ok(
        `Ceza ${s==='ekle'?'Eklendi':'Düzenlendi'} — ${adim}. İhlal`,
        [`**Adım:** \`${adim}. ihlal\``,`**Ceza:** ${tipAd[tip]}`,
          tip!=='uyari'&&tip!=='kick'?`**Süre:** \`${sureStr}\``:null,
          `**Sebep:** ${sebep}`].filter(Boolean).join('\n')
      )]});
    }

    if (s==='kaldir') {
      const adim=i.options.getInteger('adim');
      if (!db.cezaGetir(g.id,adim)) return i.editReply({embeds:[lg.hata('Bulunamadı',`\`${adim}. adım\` zaten yok.`)]});
      db.cezaSil(g.id,adim);
      return i.editReply({embeds:[lg.ok('Ceza Kaldırıldı',`\`${adim}. ihlal\` ceza adımı kaldırıldı.`)]});
    }

    if (s==='liste') {
      const list=db.cezaListele(g.id);
      if (!list.length) return i.editReply({embeds:[lg.hata('Boş','/ceza ekle ile basamak ekle.')]});
      const tipAd={uyari:'⚠️ Uyarı',mute:'🔇 Mute',kick:'👢 Kick',ban:'🔨 Ban'};
      const e=new EmbedBuilder().setColor(0x5856D6).setTitle('⚖️ Ceza Basamakları')
        .setDescription('NSFW ihlali tespit edilince aşağıdaki sırayla ceza uygulanır.')
        .setFooter({text:`KrX NSFW Guard • ${g.name}`}).setTimestamp();
      for (const c of list) {
        const sureStr = c.tip!=='uyari'&&c.tip!=='kick' ? ` — \`${db.sureyiBicimle(c.sure_dk,c.sure_saat,c.sure_gun)}\`` : '';
        e.addFields({name:`${c.adim_no}. İhlal → ${tipAd[c.tip]||c.tip}${sureStr}`, value:`📝 ${c.sebep}`, inline:false});
      }
      return i.editReply({embeds:[e]});
    }

    if (s==='hepsini_sil') {
      db.cezaListele(g.id).forEach(c=>db.cezaSil(g.id,c.adim_no));
      return i.editReply({embeds:[lg.ok('Tümü Silindi','Tüm ceza basamakları kaldırıldı.')]});
    }
  }
};
