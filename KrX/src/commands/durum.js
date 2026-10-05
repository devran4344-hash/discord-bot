const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('durum')
    .setDescription('📊 KrX NSFW Guard sistem durumu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(i) {
    await i.deferReply({ ephemeral: true });
    const g = i.guild, a = db.guildGetir(g.id);
    const cezalar  = db.cezaListele(g.id);
    const ihlaller = db.ihlalListesi(g.id, 999);
    const silinen  = db.silinenListesi(g.id, 999);

    const toplamIhlal = ihlaller.reduce((t, k) => t + k.toplam, 0);
    const bugun = Date.now() - 86400000;
    const bugunSilinen = silinen.filter(s => s.zaman > bugun).length;
    const bugunIhlal  = ihlaller.filter(k => k.son_ihlal > bugun).length;

    const up   = process.uptime();
    const uptimeStr = `${Math.floor(up/3600)}s ${Math.floor((up%3600)/60)}dk ${Math.floor(up%60)}sn`;

    const e = new EmbedBuilder()
      .setColor(a.aktif ? 0x34C759 : 0xFF3B30)
      .setTitle('🛡️ KrX NSFW Guard v2 — Sistem Durumu')
      .setThumbnail(i.client.user.displayAvatarURL())
      .addFields(
        { name:'⚡ Sistem',          value: a.aktif ? '✅ Aktif' : '❌ Kapalı',                      inline:true },
        { name:'🤖 AI Tespiti',      value: a.ai_aktif ? '✅ Açık' : '❌ Kapalı',                   inline:true },
        { name:'📡 Tarama Modu',     value: a.mod === 'tum_kanallar' ? '🌐 Tüm' : `📌 Seçili(${a.secili_kanallar.length})`, inline:true },
        { name:'📋 Log Kanalı',      value: a.log_kanal_id ? `<#${a.log_kanal_id}>` : '`Yok`',       inline:true },
        { name:'📋 Mod Log',         value: a.mod_log_kanal_id ? `<#${a.mod_log_kanal_id}>` : '`Yok`',inline:true },
        { name:'🕵️ Spoiler Bypass',  value: a.spoiler_kontrol ? '✅' : '❌',                         inline:true },
        { name:'💌 Davet Filtresi',  value: a.davet_filtresi ? '✅' : '❌',                           inline:true },
        { name:'🚫 Spam Koruması',   value: a.spam_aktif ? '✅' : '❌',                               inline:true },
        { name:'🚨 Raid Koruması',   value: a.raid_aktif ? '✅' : '❌',                               inline:true },
        { name:'🔗 Link Filtresi',   value: a.link_filtre_aktif ? '✅' : '❌',                        inline:true },
        { name:'💬 Kelime Filtresi', value: a.kelime_filtre_aktif ? '✅' : '❌',                      inline:true },
        { name:'📊 AI Güven Skoru',  value: `\`%${Math.round((a.min_guven_skoru||0.75)*100)}\``,     inline:true },
        { name:'⚖️ Ceza Adımları',   value: `\`${cezalar.length}\``,                                 inline:true },
        { name:'📦 Toplam Silinen',  value: `\`${silinen.length}\``,                                 inline:true },
        { name:'📅 Bugün Silinen',   value: `\`${bugunSilinen}\``,                                   inline:true },
        { name:'⚡ Toplam İhlal',    value: `\`${toplamIhlal}\``,                                    inline:true },
        { name:'📅 Bugün İhlal',     value: `\`${bugunIhlal}\``,                                     inline:true },
        { name:'🌐 Sunucu Sayısı',   value: `\`${i.client.guilds.cache.size}\``,                     inline:true },
        { name:'🏓 Ping',            value: `\`${i.client.ws.ping}ms\``,                             inline:true },
        { name:'⏱️ Uptime',          value: `\`${uptimeStr}\``,                                      inline:true },
      )
      .setTimestamp()
      .setFooter({ text: `KrX NSFW Guard v2 • ${g.name}` });

    return i.editReply({ embeds: [e] });
  },
};
