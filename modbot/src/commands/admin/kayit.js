// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  KAYIT SİSTEMİ — Tam Kapsamlı + GÜVENLİK            ║
// ║  !kayit @üye [isim] [tür]                                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const config  = require('../../config');
const { errorEmbed, successEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const {
  kayitEkle, kayitGetir, kayitGuncelle, kayitSil,
  kayitsizEkle, kayitSayaci, kayitSayacGetir,
} = require('../../utils/database');

// ══════════════════════════════════════════════════════
//  YETKİ KONTROLÜ — SIKILAŞTIRILMIŞ
// ══════════════════════════════════════════════════════
function isKayitYetkili(member) {
  if (!member) {
    console.log('[kayit-debug] member NULL');
    return false;
  }

  // 1. Sunucu sahibi mi?
  const isOwner = member.guild?.ownerId === member.id;

  // 2. Administrator izni var mı?
  let isAdmin = false;
  try {
    isAdmin = member.permissions?.has(PermissionFlagsBits.Administrator) === true;
  } catch (e) {
    console.log('[kayit-debug] permissions hatası:', e.message);
  }

  // 3. Config'deki yetkili rollerden birine sahip mi?
  const yetkili = config.kayit?.yetkiliRoller || [];
  const userRoles = member.roles?.cache ? Array.from(member.roles.cache.keys()) : [];
  const matching = Array.isArray(yetkili) ? yetkili.filter(r => userRoles.includes(r)) : [];

  // 4. EN AZ BİR ŞARTI SAĞLAMALI
  const result = isOwner || isAdmin || matching.length > 0;

  console.log('[kayit-debug] ────────────────────────');
  console.log('[kayit-debug] user:', member.user?.tag);
  console.log('[kayit-debug] owner:', isOwner, '| admin:', isAdmin, '| matching:', matching);
  console.log('[kayit-debug] SONUC:', result ? 'İZİN ✅' : 'RED ❌');
  console.log('[kayit-debug] ────────────────────────');

  return result;
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: İsim formatını uygula
// ══════════════════════════════════════════════════════
function buildIsim(hammIsim, sayac) {
  const format = config.kayit?.isimFormati || '{isim}';
  return format
    .replace('{isim}', hammIsim)
    .replace('{sayı}', sayac)
    .replace('{sayi}', sayac)
    .slice(0, 32);
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: Güvenilirlik
// ══════════════════════════════════════════════════════
function guvenilirlik(member) {
  const yas = Date.now() - member.user.createdTimestamp;
  const gun = Math.floor(yas / 86400000);
  if (gun < 7)  return { label: '⚠️ Çok Yeni',   renk: 0xE74C3C, gun };
  if (gun < 30) return { label: '⚠️ Yeni Hesap', renk: 0xF39C12, gun };
  if (gun < 180)return { label: '✅ Normal',      renk: 0x3498DB, gun };
  return             { label: '✅ Güvenilir',    renk: 0x2ECC71, gun };
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: Kayıt işlemi
// ══════════════════════════════════════════════════════
async function kayitIsle(member, kayitYapan, isim, tur) {
  const cfg    = config.kayit;
  const guild  = member.guild;
  const sayac  = await kayitSayaci(guild.id);
  const format = buildIsim(isim, sayac);

  if (isim) {
    await member.setNickname(format, `Kayıt: ${kayitYapan.user.tag}`).catch(() => null);
  }

  if (cfg.kayitsizRolId) {
    const kayitsizRol = guild.roles.cache.get(cfg.kayitsizRolId);
    if (kayitsizRol && member.roles.cache.has(cfg.kayitsizRolId)) {
      await member.roles.remove(kayitsizRol, 'Kayıt tamamlandı').catch(() => null);
    }
  }

  const verilenRoller = [];
  for (const rolId of cfg.memberRoller) {
    const rol = guild.roles.cache.get(rolId);
    if (rol && !member.roles.cache.has(rolId)) {
      await member.roles.add(rol, 'Kayıt sistemi').catch(() => null);
      verilenRoller.push(rolId);
    }
  }

  const turObj = (cfg.turler || []).find(t => t.id === tur) || cfg.turler?.[0] || { id: 'normal', label: 'Normal', emoji: '✅' };

  const kayit = await kayitEkle(guild.id, member.id, {
    isim:        format,
    tur:         turObj.id,
    kaydedenId:  kayitYapan.id,
    kaydedenTag: kayitYapan.user.tag,
    verilen:     verilenRoller,
    kayitSayisi: sayac,
  });

  return { kayit, turObj, verilenRoller, format, sayac };
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: Log gönder
// ══════════════════════════════════════════════════════
async function kayitLogGonder(guild, member, kayitYapan, { turObj, verilenRoller, format, sayac }) {
  const cfg = config.kayit;
  if (!cfg.logKanalId) return;
  const logKanal = guild.channels.cache.get(cfg.logKanalId);
  if (!logKanal) return;

  const g = guvenilirlik(member);

  const embed = new EmbedBuilder()
    .setColor(turObj.renk || config.colors.success)
    .setAuthor({
      name:    `${turObj.emoji} Kayıt Yapıldı — ${member.user.username}`,
      iconURL: member.user.displayAvatarURL({ dynamic: true }),
    })
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 Kayıt Edilen',   value: `<@${member.id}>\n\`${member.user.tag}\``,   inline: true },
      { name: '🛡️ Kayıt Eden',     value: `<@${kayitYapan.id}>\n\`${kayitYapan.user.tag}\``, inline: true },
      { name: '🏷️ Verilen Roller',  value: verilenRoller.length ? verilenRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
      { name: '📝 Yeni İsim',       value: format ? `\`${format}\`` : '—',             inline: true },
      { name: '🎭 Kayıt Türü',      value: `${turObj.emoji} ${turObj.label}`,          inline: true },
      { name: '🔢 Kayıt No',        value: `\`#${sayac}\``,                            inline: true },
      { name: '🔒 Güvenilirlik',    value: `${g.label} (${g.gun} gün)`,               inline: true },
      { name: '📅 Hesap Tarihi',    value: discordTimestamp(member.user.createdAt, 'D'), inline: true },
      { name: '📌 Katılış',         value: discordTimestamp(member.joinedAt || new Date(), 'R'), inline: true },
    )
    .setFooter({ text: `Kayıt #${sayac} • ${guild.name}` })
    .setTimestamp();

  await logKanal.send({ embeds: [embed] }).catch(() => null);
}

// ══════════════════════════════════════════════════════
//  KOMUT
// ══════════════════════════════════════════════════════
module.exports = {
  name:     'kayit',
  aliases:  ['register', 'kay'],
  category: 'admin',
  usage:    '!kayit @üye <isim> [tür]',
  cooldown: 3000,
  description: 'Üyeyi kayıt eder, rol verir ve log kanalına bildirir.',

  data: new SlashCommandBuilder()
    .setName('kayit')
    .setDescription('Üyeyi kayıt eder, rol verir.')
    .addUserOption(o => o.setName('üye').setDescription('Kayıt edilecek üye').setRequired(true))
    .addStringOption(o => o.setName('isim').setDescription('Üyenin ismi').setRequired(true))
    .addStringOption(o => o.setName('tür').setDescription('Kayıt türü').setRequired(false)
      .addChoices(
        { name: 'Normal', value: 'normal' },
        { name: 'VIP',    value: 'vip'    },
        { name: 'Bot',    value: 'bot'    },
        { name: 'Özel',   value: 'ozel'  },
      )),

  async executeSlash(interaction, client) {
    // ═══ GÜVENLİK 1: Yetki kontrolü ═══
    if (!isKayitYetkili(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('❌ Kayıt yetkilisi değilsin!')],
        flags: 64,
      });
    }

    // ═══ GÜVENLİK 2: Kayıt sistemi açık mı? ═══
    if (!config.kayit?.enabled) {
      return interaction.reply({
        embeds: [errorEmbed('Kayıt sistemi şu an devre dışı.')],
        flags: 64,
      });
    }

    // ═══ GÜVENLİK 3: Self-register engeli ═══
    const hedefUser = interaction.options.getUser('üye');
    if (hedefUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('❌ Kendini kayıt edemezsin! Başka bir yetkiliye başvur.')],
        flags: 64,
      });
    }

    const hedef = await interaction.guild.members.fetch(hedefUser.id).catch(() => null);
    if (!hedef) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (hedef.user.bot) return interaction.reply({ embeds: [errorEmbed('Botları kayıt edemezsin.')], flags: 64 });

    const isim = interaction.options.getString('isim').trim();
    const tur  = interaction.options.getString('tür') || 'normal';

    if (!isim) {
      return interaction.reply({ embeds: [errorEmbed('İsim boş olamaz.')], flags: 64 });
    }

    await interaction.deferReply();

    let result;
    try {
      result = await kayitIsle(hedef, interaction.member, isim, tur);
    } catch (err) {
      console.error('[kayit] Hata:', err);
      return interaction.editReply({ embeds: [errorEmbed(`Hata: \`${err.message}\``)] });
    }

    const { turObj, format, sayac } = result;

    await kayitLogGonder(interaction.guild, hedef, interaction.member, result);

    await interaction.editReply({
      content: `✅ **${hedef.user.tag}** kayıt edildi!\n> İsim: \`${format}\` • Tür: ${turObj.emoji} ${turObj.label} • No: \`#${sayac}\``,
    });

    if (config.kayit?.dmAc) {
      const dmEmbed = new EmbedBuilder()
        .setColor(turObj.renk || config.colors.success)
        .setTitle(`${turObj.emoji} Kaydın Tamamlandı!`)
        .setDescription(`**${interaction.guild.name}** sunucusuna hoş geldin, ${hedef.user.username}!`)
        .setTimestamp();
      await hedef.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  },

  async execute(message, args, client) {
    // ═══ GÜVENLİK 1: Yetki ═══
    if (!isKayitYetkili(message.member)) {
      return message.reply({ embeds: [errorEmbed('❌ Bu komutu kullanmak için **kayıt yetkilisi** olman gerekiyor.')] });
    }

    // ═══ GÜVENLİK 2: Sistem açık mı? ═══
    if (!config.kayit?.enabled) {
      return message.reply({ embeds: [errorEmbed('Kayıt sistemi şu an devre dışı.')] });
    }

    const hedef = message.mentions.members?.first();
    if (!hedef) {
      return message.reply({ embeds: [errorEmbed(`**Kullanım:** \`!kayit @üye <isim> [tür]\``)] });
    }

    // ═══ GÜVENLİK 3: Self-register engeli ═══
    if (hedef.id === message.author.id) {
      return message.reply({ embeds: [errorEmbed('❌ Kendini kayıt edemezsin!')] });
    }

    if (hedef.user.bot) {
      return message.reply({ embeds: [errorEmbed('Botları kayıt edemezsin.')] });
    }

    const turler = (config.kayit.turler || []).map(t => t.id);
    let isimArgs = args.slice(1);
    let tur = 'normal';

    if (isimArgs.length > 1 && turler.includes(isimArgs[isimArgs.length - 1].toLowerCase())) {
      tur = isimArgs.pop().toLowerCase();
    }

    const isim = isimArgs.join(' ').trim();
    if (!isim) {
      return message.reply({ embeds: [errorEmbed(`İsim belirtmedin.\n**Kullanım:** \`!kayit @üye <isim> [tür]\``)] });
    }

    const mevcutKayit = await kayitGetir(message.guild.id, hedef.id);

    let result;
    try {
      result = await kayitIsle(hedef, message.member, isim, tur);
    } catch (err) {
      console.error('[kayit]', err);
      return message.reply({ embeds: [errorEmbed(`Kayıt hatası: \`${err.message}\``)] });
    }

    const { turObj, verilenRoller, format, sayac } = result;

    await kayitLogGonder(message.guild, hedef, message.member, result);

    const onayEmbed = new EmbedBuilder()
      .setColor(turObj.renk || config.colors.success)
      .setAuthor({ name: 'Kayıt Yapıldı!', iconURL: hedef.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kayıt Edilen',   value: `<@${hedef.id}>`,                                    inline: true },
        { name: '🛡️ Kayıt Eden',     value: `<@${message.member.id}>`,                           inline: true },
        { name: '🏷️ Verilen Roller', value: verilenRoller.length ? verilenRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
        { name: '📝 Yeni İsim',       value: format ? `\`${format}\`` : '—',                     inline: true },
        { name: '🎭 Kayıt Türü',      value: `${turObj.emoji} ${turObj.label}`,                  inline: true },
        { name: '🔢 Kayıt No',        value: `\`#${sayac}\``,                                    inline: true },
      )
      .setFooter({ text: `${message.guild.name}` })
      .setTimestamp();

    await message.reply({ embeds: [onayEmbed] });

    if (config.kayit?.dmAc) {
      const dmEmbed = new EmbedBuilder()
        .setColor(turObj.renk || config.colors.success)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTitle(`${turObj.emoji} Kaydın Tamamlandı!`)
        .setDescription(`**${message.guild.name}** sunucusuna hoş geldin, ${hedef.user.username}!`)
        .setTimestamp();
      await hedef.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    if (mevcutKayit) {
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`⚠️ <@${hedef.id}> daha önce kayıt edilmişti. Kayıt yenilendi.`)
          .setTimestamp()],
      }).catch(() => null);
    }
  },

  // ══════════════════════════════════════════════════════
  //  BUTON / MODAL HANDLER
  // ══════════════════════════════════════════════════════
  async handleInteraction(interaction, client) {
    const id = interaction.customId;

    // kayit_isim_<userId>
    if (id.startsWith('kayit_isim_')) {
      if (!isKayitYetkili(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Bu işlem için yetkin yok.')], flags: 64 });
      }
      const userId = id.replace('kayit_isim_', '');
      const modal = new ModalBuilder()
        .setCustomId(`kayit_isim_modal_${userId}`)
        .setTitle('İsim Değiştir');
      const input = new TextInputBuilder()
        .setCustomId('yeni_isim')
        .setLabel('Yeni İsim')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(true)
        .setPlaceholder('Üyenin yeni ismini gir...');
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // kayit_kayitsiz_<userId>
    if (id.startsWith('kayit_kayitsiz_')) {
      if (!isKayitYetkili(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Bu işlem için yetkin yok.')], flags: 64 });
      }
      const userId = id.replace('kayit_kayitsiz_', '');
      const hedef = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!hedef) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });

      await _kayitsizVer(interaction, hedef, interaction.member);
      return;
    }

    // kayit_bilgi_<userId>
    if (id.startsWith('kayit_bilgi_')) {
      const userId = id.replace('kayit_bilgi_', '');
      const kayit  = await kayitGetir(interaction.guild.id, userId);
      const hedef  = await interaction.guild.members.fetch(userId).catch(() => null);
      const g      = hedef ? guvenilirlik(hedef) : null;

      if (!kayit) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`⚠️ <@${userId}> için kayıt kaydı bulunamadı.`)],
          flags: 64,
        });
      }

      const cfg    = config.kayit;
      const turObj = (cfg.turler || []).find(t => t.id === kayit.tur) || { emoji: '✅', label: 'Normal', renk: config.colors.success };

      const embed = new EmbedBuilder()
        .setColor(turObj.renk || config.colors.info)
        .setTitle(`📋 Kayıt Bilgisi — ${hedef?.user.username || userId}`)
        .setThumbnail(hedef?.user.displayAvatarURL({ dynamic: true, size: 256 }) || null)
        .addFields(
          { name: '👤 Üye',           value: `<@${userId}>`,                                          inline: true },
          { name: '📝 Kayıtlı İsim',  value: kayit.isim ? `\`${kayit.isim}\`` : '—',                 inline: true },
          { name: '🎭 Kayıt Türü',    value: `${turObj.emoji} ${turObj.label}`,                       inline: true },
          { name: '🛡️ Kayıt Eden',    value: `<@${kayit.kaydedenId}> \`(${kayit.kaydedenTag})\``,    inline: true },
          { name: '🔢 Kayıt No',      value: `\`#${kayit.kayitSayisi}\``,                             inline: true },
          ...(g ? [{ name: '🔒 Güvenilirlik', value: `${g.label} (${g.gun} gün)`, inline: true }] : []),
        )
        .setFooter({ text: `ID: ${userId}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Modal: kayit_isim_modal_<userId>
    if (typeof interaction.isModalSubmit === 'function' && interaction.isModalSubmit() && id.startsWith('kayit_isim_modal_')) {
      if (!isKayitYetkili(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Bu işlem için yetkin yok.')], flags: 64 });
      }
      const userId  = id.replace('kayit_isim_modal_', '');
      const yeniIsim = interaction.fields.getTextInputValue('yeni_isim').trim();
      const hedef    = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!hedef) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });

      const sayac  = await kayitSayacGetir(interaction.guild.id);
      const format = buildIsim(yeniIsim, sayac);
      await hedef.setNickname(format, `İsim değişikliği: ${interaction.user.tag}`).catch(() => null);
      await kayitGuncelle(interaction.guild.id, userId, { isim: format });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✏️ <@${userId}> adlı üyenin ismi **\`${format}\`** olarak değiştirildi.`)
          .setTimestamp()],
        flags: 64,
      });
    }
  },
};

// ══════════════════════════════════════════════════════
//  İÇ YARDIMCI: Kayıtsız ver
// ══════════════════════════════════════════════════════
async function _kayitsizVer(interaction, hedef, yetkili) {
  const cfg   = config.kayit;
  const guild = interaction.guild;

  for (const rolId of cfg.memberRoller) {
    const rol = guild.roles.cache.get(rolId);
    if (rol && hedef.roles.cache.has(rolId)) {
      await hedef.roles.remove(rol, 'Kayıtsız verildi').catch(() => null);
    }
  }

  if (cfg.kayitsizRolId) {
    const kayitsizRol = guild.roles.cache.get(cfg.kayitsizRolId);
    if (kayitsizRol && !hedef.roles.cache.has(cfg.kayitsizRolId)) {
      await hedef.roles.add(kayitsizRol, 'Kayıtsız verildi').catch(() => null);
    }
  }

  await kayitsizEkle(guild.id, hedef.id, {
    neden:   'Buton ile kayıtsız verildi',
    verenId: yetkili.id,
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setDescription(`🚫 <@${hedef.id}> adlı üyeye **kayıtsız** rolü verildi.`)
    .addFields(
      { name: '👤 Üye',    value: `<@${hedef.id}>`,    inline: true },
      { name: '🛡️ Veren',  value: `<@${yetkili.id}>`,  inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });

  await sendLog(guild, 'modLog', new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('🚫 Kayıtsız Verildi')
    .addFields(
      { name: '👤 Üye',   value: `<@${hedef.id}> \`${hedef.user.tag}\``,     inline: true },
      { name: '🛡️ Veren', value: `<@${yetkili.id}> \`${yetkili.user.tag}\``, inline: true },
    )
    .setTimestamp());
}

module.exports._kayitsizVer = _kayitsizVer;
