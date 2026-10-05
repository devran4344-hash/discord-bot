const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db       = require('../database');
const lg       = require('../logger');
const detector = require('../detector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nsfw')
    .setDescription('📡 NSFW kanal yönetimi ve test')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(g=>g.setName('kanal').setDescription('Taranacak kanallar (Seçili mod için)')
      .addSubcommand(s=>s.setName('ekle').setDescription('Kanala ekle')
        .addChannelOption(o=>o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText)))
      .addSubcommand(s=>s.setName('kaldir').setDescription('Kanalı çıkar')
        .addChannelOption(o=>o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText)))
      .addSubcommand(s=>s.setName('liste').setDescription('Taranacak kanallar')))
    .addSubcommandGroup(g=>g.setName('muaf').setDescription('Muaf kanallar (hiç taranmaz)')
      .addSubcommand(s=>s.setName('ekle').setDescription('Muaf ekle')
        .addChannelOption(o=>o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText)))
      .addSubcommand(s=>s.setName('kaldir').setDescription('Muaflık kaldır')
        .addChannelOption(o=>o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText))))
    .addSubcommand(s=>s.setName('test').setDescription('Kanalı test tara (sadece sana görünür)')
      .addChannelOption(o=>o.setName('kanal').setDescription('Kanal').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s=>s.setName('istatistik').setDescription('Silinen içerik istatistikleri')),

  async execute(i) {
    await i.deferReply({ephemeral:true});
    const g=i.guild, a=db.guildGetir(g.id);
    const grup=i.options.getSubcommandGroup(false), s=i.options.getSubcommand();

    if (grup==='kanal') {
      if (s==='ekle') {
        const k=i.options.getChannel('kanal');
        db.guildAyarla(g.id,{secili_kanallar:[...new Set([...(a.secili_kanallar||[]),k.id])]});
        return i.editReply({embeds:[lg.ok('Kanal Eklendi',`${k} tarama listesine eklendi.\n⚠️ **Seçili Kanallar** modunda geçerlidir.`)]});
      }
      if (s==='kaldir') {
        const k=i.options.getChannel('kanal');
        db.guildAyarla(g.id,{secili_kanallar:(a.secili_kanallar||[]).filter(id=>id!==k.id)});
        return i.editReply({embeds:[lg.ok('Kanal Kaldırıldı',`${k} tarama listesinden çıkarıldı.`)]});
      }
      if (s==='liste') {
        const list=(a.secili_kanallar||[]);
        return i.editReply({embeds:[lg.bilgi('Taranacak Kanallar', list.length?list.map(id=>`<#${id}>`).join('\n'):'`Henüz kanal eklenmemiş`')]});
      }
    }

    if (grup==='muaf') {
      if (s==='ekle') {
        const k=i.options.getChannel('kanal');
        db.guildAyarla(g.id,{muaf_kanallar:[...new Set([...(a.muaf_kanallar||[]),k.id])]});
        return i.editReply({embeds:[lg.ok('Muaf Kanal Eklendi',`${k} artık **taranmayacak**.`)]});
      }
      if (s==='kaldir') {
        const k=i.options.getChannel('kanal');
        db.guildAyarla(g.id,{muaf_kanallar:(a.muaf_kanallar||[]).filter(id=>id!==k.id)});
        return i.editReply({embeds:[lg.ok('Muaflık Kaldırıldı',`${k} artık taranacak.`)]});
      }
    }

    if (s==='test') {
      const k=i.options.getChannel('kanal');
      await i.editReply({embeds:[lg.bilgi('Test Taraması','Kanal taranıyor...')]});
      const msgs=await k.messages.fetch({limit:20}).catch(()=>null);
      if (!msgs) return i.followUp({ephemeral:true,content:'❌ Mesajlar alınamadı.'});

      let taranan=0,bulunan=0;
      for (const [,m] of msgs) {
        if (m.author.bot||(!m.attachments.size&&!m.embeds.length)) continue;
        taranan++;
        const r=await detector.mesajiTara(m,{...a,aktif:true,nsfw_aktif:true});
        if (r) bulunan++;
      }
      return i.followUp({ephemeral:true,embeds:[new EmbedBuilder().setColor(bulunan>0?0xFF2D55:0x34C759)
        .setTitle('🔍 Test Taraması Tamamlandı')
        .addFields(
          {name:'📨 Taranan',value:`\`${taranan}\``,inline:true},
          {name:'🚨 Tespit',value:`\`${bulunan}\``,inline:true},
          {name:'📢 Kanal',value:`${k}`,inline:true},
        )
        .setDescription(bulunan>0?'⚠️ Test modunda — gerçek taramada bu içerikler silinirdi.':'✅ NSFW bulunamadı.')
        .setTimestamp()]});
    }

    if (s==='istatistik') {
      const list=db.silinenListesi(g.id,100);
      const bugun=Date.now()-86400000;
      const bugunS=list.filter(s=>s.zaman>bugun).length;
      const tipSay={};
      for (const s of list) tipSay[s.tespit_tipi]=(tipSay[s.tespit_tipi]||0)+1;
      const e=new EmbedBuilder().setColor(0xFF2D55).setTitle('📊 NSFW İstatistikleri')
        .addFields(
          {name:'📅 Bugün Silinen',value:`\`${bugunS}\``,inline:true},
          {name:'📦 Toplam Silinen',value:`\`${list.length}\``,inline:true},
          {name:'🤖 AI Tespit',value:`\`${tipSay['ai_sightengine']||0}\``,inline:true},
          {name:'🏷️ Discord Flag',value:`\`${tipSay['discord_flag']||0}\``,inline:true},
          {name:'📁 Dosya Adı',value:`\`${tipSay['dosya_adi']||0}\``,inline:true},
          {name:'🔬 Lokal Analiz',value:`\`${tipSay['lokal_analiz']||0}\``,inline:true},
        ).setTimestamp().setFooter({text:`KrX NSFW Guard • ${g.name}`});
      return i.editReply({embeds:[e]});
    }
  }
};
