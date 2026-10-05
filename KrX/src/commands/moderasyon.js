const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db   = require('../database');
const lg   = require('../logger');
const ceza = require('../ceza');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderasyon')
    .setDescription('👮 Moderasyon araçları')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('uyar').setDescription('Kullanıcıyı uyar')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(true).setMaxLength(300)))
    .addSubcommand(s => s.setName('uyarilar').setDescription('Kullanıcı uyarı geçmişi')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)))
    .addSubcommand(s => s.setName('uyarisil').setDescription('Uyarı sil')
      .addIntegerOption(o => o.setName('id').setDescription('Uyarı ID').setRequired(true)))
    .addSubcommand(s => s.setName('mute').setDescription('Kullanıcıyı sustur')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
      .addIntegerOption(o => o.setName('dakika').setDescription('Süre — Dakika').setMinValue(1).setMaxValue(40320))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(300)))
    .addSubcommand(s => s.setName('unmute').setDescription('Susturmayı kaldır')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(300)))
    .addSubcommand(s => s.setName('kick').setDescription('Kullanıcıyı at')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(300)))
    .addSubcommand(s => s.setName('ban').setDescription('Kullanıcıyı yasakla')
      .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
      .addIntegerOption(o => o.setName('gun').setDescription('Süre (0=süresiz)').setMinValue(0).setMaxValue(365))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(300)))
    .addSubcommand(s => s.setName('unban').setDescription('Yasağı kaldır')
      .addStringOption(o => o.setName('kullanici_id').setDescription('Kullanıcı ID').setRequired(true))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(300)))
    .addSubcommand(s => s.setName('temizle').setDescription('Kanal mesajlarını temizle')
      .addIntegerOption(o => o.setName('adet').setDescription('Kaç mesaj? (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption(o => o.setName('kullanici').setDescription('Sadece bu kullanıcının mesajları')))
    .addSubcommand(s => s.setName('kilit').setDescription('Kanalı kilitle/aç')
      .addBooleanOption(o => o.setName('kilitli').setDescription('Kilitli mi?').setRequired(true))
      .addStringOption(o => o.setName('sebep').setDescription('Sebep').setMaxLength(200))),

  async execute(i) {
    await i.deferReply({ ephemeral: true });
    const g = i.guild, s = i.options.getSubcommand();

    // ── UYWARI ───────────────────────────────────────────────────────────────
    if (s === 'uyar') {
      const user  = i.options.getUser('kullanici');
      const sebep = i.options.getString('sebep');
      const id    = db.uyariEkle(g.id, user.id, sebep, i.user.id);

      const uyarilar = db.uyariListesi(g.id, user.id);
      await user.send({ embeds: [lg.bilgi(`⚠️ Uyarı — ${g.name}`, `**Sebep:** ${sebep}\n**Toplam Uyarı:** \`${uyarilar.length}\``)] }).catch(() => {});

      const ayar    = db.guildGetir(g.id);
      const modLog  = ayar.mod_log_kanal_id ? g.channels.cache.get(ayar.mod_log_kanal_id) : null;
      await lg.logMod({ logKanal:modLog, guild:g, hedefUser:user, yetkiliUser:i.user, aksiyon:'Uyarı', sebep });

      return i.editReply({ embeds: [lg.ok('Uyarı Gönderildi', `${user} → **${sebep}**\nUyarı ID: \`${id}\` | Toplam: \`${uyarilar.length}\``)] });
    }

    // ── UYARILAR ──────────────────────────────────────────────────────────────
    if (s === 'uyarilar') {
      const user    = i.options.getUser('kullanici');
      const uyarilar = db.uyariListesi(g.id, user.id);
      if (!uyarilar.length) return i.editReply({ embeds: [lg.bilgi('Uyarı Geçmişi', `${user} için uyarı yok.`)] });

      const { EmbedBuilder } = require('discord.js');
      const e = new EmbedBuilder().setColor(0xFF9500)
        .setAuthor({ name: `${user.tag} — Uyarılar`, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setDescription(`Toplam **${uyarilar.length}** uyarı`)
        .setTimestamp().setFooter({ text: `KrX NSFW Guard • ${g.name}` });

      for (const u of uyarilar.slice(-10)) {
        e.addFields({ name:`ID \`${u.id}\` — <t:${Math.floor(u.zaman/1000)}:R>`, value:`📝 ${u.sebep}\n👮 <@${u.yetkili_id}>`, inline:false });
      }
      return i.editReply({ embeds: [e] });
    }

    // ── UYARI SİL ─────────────────────────────────────────────────────────────
    if (s === 'uyarisil') {
      const id = i.options.getInteger('id');
      db.uyariSil(id);
      return i.editReply({ embeds: [lg.ok('Uyarı Silindi', `#${id} numaralı uyarı silindi.`)] });
    }

    if (s === 'mute') {
      const user  = i.options.getUser('kullanici');
      const dk    = i.options.getInteger('dakika') || 60;
      const sebep = i.options.getString('sebep') || 'Moderatör kararı';
      let member;
      try { member = await g.members.fetch(user.id); } catch (_) { return i.editReply({ embeds: [lg.hata('Bulunamadı','Kullanıcı sunucuda değil.')] }); }
      if (member.permissions.has('Administrator')) return i.editReply({ embeds: [lg.hata('Yetersiz Yetki','Admin kullanıcıya mute uygulanamaz.')] });

      try {
        await ceza.aksiyonUygula({ guild:g, member, tip:'mute', sureMs:dk*60000, sureStr:`${dk} dakika`, sebep, yetkili:i.user });
        await user.send({ embeds: [lg.bilgi(`🔇 Mute — ${g.name}`, `**Sebep:** ${sebep}\n**Süre:** ${dk} dakika`)] }).catch(() => {});
        return i.editReply({ embeds: [lg.ok('Mute Uygulandı', `${user} → \`${dk} dakika\`\n📝 ${sebep}`)] });
      } catch (e) {
        return i.editReply({ embeds: [lg.hata('Mute Başarısız', `**Hata:** ${e.message}\n\n**Kontrol et:**\n> Bot rolü hedef kullanıcının rolünden yukarıda mı?\n> Botun \`Üyeleri Yönet\` yetkisi var mı?`)] });
      }
    }

    // ── UNMUTE ────────────────────────────────────────────────────────────────
    if (s === 'unmute') {
      const user  = i.options.getUser('kullanici');
      const sebep = i.options.getString('sebep') || 'Moderatör kararı';
      let member;
      try { member = await g.members.fetch(user.id); } catch (_) { return i.editReply({ embeds: [lg.hata('Bulunamadı','Kullanıcı sunucuda değil.')] }); }
      await ceza.aksiyonUygula({ guild:g, member, tip:'unmute', sureMs:0, sureStr:null, sebep, yetkili:i.user });
      return i.editReply({ embeds: [lg.ok('Mute Kaldırıldı', `${user} susturması kaldırıldı.`)] });
    }

    // ── KICK ─────────────────────────────────────────────────────────────────
    if (s === 'kick') {
      const user  = i.options.getUser('kullanici');
      const sebep = i.options.getString('sebep') || 'Moderatör kararı';
      let member;
      try { member = await g.members.fetch(user.id); } catch (_) { return i.editReply({ embeds: [lg.hata('Bulunamadı','Kullanıcı sunucuda değil.')] }); }
      if (member.permissions.has('Administrator')) return i.editReply({ embeds: [lg.hata('Yetersiz Yetki','Admin atılamaz.')] });
      try {
        await user.send({ embeds: [lg.bilgi(`👢 Kick — ${g.name}`, `**Sebep:** ${sebep}`)] }).catch(() => {});
        await ceza.aksiyonUygula({ guild:g, member, tip:'kick', sureMs:0, sureStr:null, sebep, yetkili:i.user });
        return i.editReply({ embeds: [lg.ok('Kick Uygulandı', `${user} sunucudan atıldı.\n📝 ${sebep}`)] });
      } catch (e) {
        return i.editReply({ embeds: [lg.hata('Kick Başarısız', `**Hata:** ${e.message}\n\n**Kontrol et:**\n> Bot rolü hedef kullanıcının rolünden yukarıda mı?\n> Botun \`Üyeleri At\` yetkisi var mı?`)] });
      }
    }

    // ── BAN ───────────────────────────────────────────────────────────────────
    if (s === 'ban') {
      const user  = i.options.getUser('kullanici');
      const gun   = i.options.getInteger('gun') || 0;
      const sebep = i.options.getString('sebep') || 'Moderatör kararı';
      let member;
      try { member = await g.members.fetch(user.id); } catch (_) { member = { id:user.id, user }; }
      if (member.permissions?.has?.('Administrator')) return i.editReply({ embeds: [lg.hata('Yetersiz Yetki','Admin banlanamaz.')] });
      const sureMs  = gun * 86400000;
      const sureStr = gun > 0 ? `${gun} gün` : 'Süresiz';
      try {
        await user.send({ embeds: [lg.bilgi(`🔨 Ban — ${g.name}`, `**Sebep:** ${sebep}\n**Süre:** ${sureStr}`)] }).catch(() => {});
        await ceza.aksiyonUygula({ guild:g, member, tip:'ban', sureMs, sureStr, sebep, yetkili:i.user });
        return i.editReply({ embeds: [lg.ok('Ban Uygulandı', `${user} yasaklandı (${sureStr}).\n📝 ${sebep}`)] });
      } catch (e) {
        return i.editReply({ embeds: [lg.hata('Ban Başarısız', `**Hata:** ${e.message}\n\n**Kontrol et:**\n> Bot rolü hedef kullanıcının rolünden yukarıda mı?\n> Botun \`Üyeleri Yasakla\` yetkisi var mı?`)] });
      }
    }

    // ── UNBAN ─────────────────────────────────────────────────────────────────
    if (s === 'unban') {
      const uid_  = i.options.getString('kullanici_id');
      const sebep = i.options.getString('sebep') || 'Moderatör kararı';
      try {
        await g.members.unban(uid_, sebep);
        const ayar   = db.guildGetir(g.id);
        const modLog = ayar.mod_log_kanal_id ? g.channels.cache.get(ayar.mod_log_kanal_id) : null;
        await lg.logMod({ logKanal:modLog, guild:g, hedefUser:{ id:uid_, tag:uid_, displayAvatarURL:()=>null }, yetkiliUser:i.user, aksiyon:'Unban', sebep });
        return i.editReply({ embeds: [lg.ok('Unban', `\`${uid_}\` yasağı kaldırıldı.`)] });
      } catch (_) {
        return i.editReply({ embeds: [lg.hata('Hata','Kullanıcı bulunamadı veya banlı değil.')] });
      }
    }

    // ── TEMİZLE ───────────────────────────────────────────────────────────────
    if (s === 'temizle') {
      const adet     = i.options.getInteger('adet');
      const kullanici = i.options.getUser('kullanici');
      let mesajlar = await i.channel.messages.fetch({ limit: kullanici ? 200 : adet });
      if (kullanici) mesajlar = mesajlar.filter(m => m.author.id === kullanici.id).first(adet);
      const silinecek = [...(mesajlar.values ? mesajlar.values() : mesajlar)].filter(m => Date.now() - m.createdTimestamp < 1209600000);
      const silindi   = await i.channel.bulkDelete(silinecek, true).catch(() => null);
      return i.editReply({ embeds: [lg.ok('Temizlendi', `${silindi?.size || 0} mesaj silindi.${kullanici ? ` (${kullanici} mesajları)` : ''}`)] });
    }

    // ── KİLİT ────────────────────────────────────────────────────────────────
    if (s === 'kilit') {
      const kilitli = i.options.getBoolean('kilitli');
      const sebep   = i.options.getString('sebep') || (kilitli ? 'Kanal kilitlendi' : 'Kanal açıldı');
      try {
        await i.channel.permissionOverwrites.edit(g.roles.everyone, { SendMessages: kilitli ? false : null });
        await i.channel.send({ embeds: [lg.bilgi(kilitli ? '🔒 Kanal Kilitlendi' : '🔓 Kanal Açıldı', `**Sebep:** ${sebep}\n**Yetkili:** ${i.user}`)] });
        return i.editReply({ embeds: [lg.ok(kilitli ? 'Kanal Kilitlendi' : 'Kanal Açıldı', sebep)] });
      } catch (_) {
        return i.editReply({ embeds: [lg.hata('Hata','Kanal izinleri değiştirilemedi.')] });
      }
    }
  },
};
