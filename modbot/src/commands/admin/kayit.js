// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  KAYIT SİSTEMİ — Tam Kapsamlı                      ║
// ║  !kayit @üye [isim] [tür]                                          ║
// ║  Butonlar: İsim Değiştir, Kayıtsız Ver, Kayıt Bilgisi              ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
//  YARDIMCI: Yetkili mi?
// ══════════════════════════════════════════════════════
function isKayitYetkili(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const yetkili = config.kayit?.yetkiliRoller || [];
  return yetkili.some(r => member.roles.cache.has(r));
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
    .slice(0, 32); // Discord nick limiti
}

// ══════════════════════════════════════════════════════
//  YARDIMCI: Güvenilirlik rengi/etiketi
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
//  YARDIMCI: Kayıt işlemini gerçekleştir
// ══════════════════════════════════════════════════════
async function kayitIsle(member, kayitYapan, isim, tur) {
  const cfg    = config.kayit;
  const guild  = member.guild;
  const sayac  = await kayitSayaci(guild.id);
  const format = buildIsim(isim, sayac);

  // Nickname uygula
  if (isim) {
    await member.setNickname(format, `Kayıt: ${kayitYapan.user.tag}`).catch(() => null);
  }

  // Kayıtsız rolünü kaldır
  if (cfg.kayitsizRolId) {
    const kayitsizRol = guild.roles.cache.get(cfg.kayitsizRolId);
    if (kayitsizRol && member.roles.cache.has(cfg.kayitsizRolId)) {
      await member.roles.remove(kayitsizRol, 'Kayıt tamamlandı').catch(() => null);
    }
  }

  // Member rollerini ver
  const verilenRoller = [];
  for (const rolId of cfg.memberRoller) {
    const rol = guild.roles.cache.get(rolId);
    if (rol && !member.roles.cache.has(rolId)) {
      await member.roles.add(rol, 'Kayıt sistemi').catch(() => null);
      verilenRoller.push(rolId);
    }
  }

  // Tür bazlı ek rol varsa (ileride genişletilebilir)
  const turObj = (cfg.turler || []).find(t => t.id === tur) || cfg.turler?.[0] || { id: 'normal', label: 'Normal', emoji: '✅' };

  // Firestore'a kaydet
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
//  YARDIMCI: Kayıt log embed'i gönder
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

  // Log kanalına butonlu mesaj
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kayit_isim_${member.id}`)
      .setLabel('İsim Değiştir')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`kayit_kayitsiz_${member.id}`)
      .setLabel('Kayıtsız Ver')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`kayit_bilgi_${member.id}`)
      .setLabel('Kayıt Bilgisi')
      .setEmoji('ℹ️')
      .setStyle(ButtonStyle.Primary),
  );

  await logKanal.send({ embeds: [embed], components: [row] }).catch(() => null);
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
    if (!isKayitYetkili(interaction.member))
      return interaction.reply({ embeds: [errorEmbed('Kayıt yetkilisi rolüne ihtiyacın var.')], flags: 64 });
    const hedef = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!hedef) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    if (hedef.user.bot) return interaction.reply({ embeds: [errorEmbed('Botları kayıt edemezsin.')], flags: 64 });
    const isim = interaction.options.getString('isim').trim();
    const tur  = interaction.options.getString('tür') || 'normal';
    await interaction.deferReply();
    let result;
    try { result = await kayitIsle(hedef, interaction.member, isim, tur); }
    catch (err) { return interaction.editReply({ embeds: [errorEmbed(`Hata: \`${err.message}\``)] }); }
    const { turObj, verilenRoller, format, sayac } = result;
    await kayitLogGonder(interaction.guild, hedef, interaction.member, result);
    await interaction.editReply({ content: `✅ **${hedef.user.tag}** kayıt edildi!\n> İsim: \`${format}\` • Tür: ${turObj.emoji} ${turObj.label} • No: \`#${sayac}\`` });
    if (config.kayit?.dmAc) {
      const dmEmbed = new EmbedBuilder().setColor(turObj.renk || config.colors.success)
        .setTitle(`${turObj.emoji} Kaydın Tamamlandı!`)
        .setDescription(`**${interaction.guild.name}** sunucusuna hoş geldin, ${hedef.user.username}!`)
        .setTimestamp();
      await hedef.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  },

  async execute(message, args, client) {
    if (!isKayitYetkili(message.member)) {
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için **kayıt yetkilisi** olman gerekiyor.')] });
    }

    if (!config.kayit?.enabled) {
      return message.reply({ embeds: [errorEmbed('Kayıt sistemi şu an devre dışı.')] });
    }

    // !kayit @üye isim [tür]
    const hedef = message.mentions.members?.first();
    if (!hedef) {
      return message.reply({ embeds: [errorEmbed(`**Kullanım:** \`!kayit @üye <isim> [tür]\`\n\nTürler: ${(config.kayit.turler || []).map(t => `\`${t.id}\``).join(', ')}`)] });
    }

    if (hedef.user.bot) {
      return message.reply({ embeds: [errorEmbed('Botları kayıt edemezsin.')] });
    }

    // İsmi al: mention'dan sonraki tüm argümanlar, son argüman tür olabilir
    const turler = (config.kayit.turler || []).map(t => t.id);
    let isimArgs = args.slice(1); // args[0] = mention
    let tur = 'normal';

    // Son arg tür mü?
    if (isimArgs.length > 1 && turler.includes(isimArgs[isimArgs.length - 1].toLowerCase())) {
      tur = isimArgs.pop().toLowerCase();
    }

    const isim = isimArgs.join(' ').trim();
    if (!isim) {
      return message.reply({ embeds: [errorEmbed(`İsim belirtmedin.\n**Kullanım:** \`!kayit @üye <isim> [tür]\``)] });
    }

    // Zaten kayıtlı mı?
    const mevcutKayit = await kayitGetir(message.guild.id, hedef.id);
    const g = guvenilirlik(hedef);

    // ── Kayıt işlemini gerçekleştir ──────────────────────────────
    let result;
    try {
      result = await kayitIsle(hedef, message.member, isim, tur);
    } catch (err) {
      console.error('[kayit]', err);
      return message.reply({ embeds: [errorEmbed(`Kayıt sırasında hata oluştu: \`${err.message}\``)] });
    }

    const { turObj, verilenRoller, format, sayac } = result;

    // ── Kayıt kanalına bildirim gönder ───────────────────────────
    const cfg = config.kayit;
    if (cfg.kanalId) {
      const kayitKanal = message.guild.channels.cache.get(cfg.kanalId);
      if (kayitKanal) {
        const kanalEmbed = new EmbedBuilder()
          .setColor(turObj.renk || config.colors.success)
          .setAuthor({
            name:    `👋 Yeni Bir Kullanıcı Katıldı, ${hedef.user.username}!`,
            iconURL: message.guild.iconURL({ dynamic: true }),
          })
          .setDescription(
            `**${message.guild.name}** sunucusuna hoş geldin **${format}**!\n` +
            `Seninle birlikte **${message.guild.memberCount}** kişiyiz.`,
          )
          .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: '🪪 Kullanıcı ID',         value: `\`${hedef.id}\``,                            inline: true },
            { name: '📅 Hesap Oluşturma Tarihi', value: discordTimestamp(hedef.user.createdAt, 'D'), inline: true },
            { name: '🔒 Güvenilirlik Durumu',   value: g.label,                                     inline: true },
          )
          .setFooter({ text: `${message.guild.name} Kayıt Sistemi` })
          .setTimestamp();

        const kanalRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`kayit_onay_${hedef.id}`)
            .setLabel('✅ Kayıt Yapıldı')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        );

        await kayitKanal.send({ embeds: [kanalEmbed], components: [kanalRow] }).catch(() => null);
      }
    }

    // ── Log kanalına detaylı kayıt ───────────────────────────────
    await kayitLogGonder(message.guild, hedef, message.member, result);

    // ── Kanala onay mesajı ───────────────────────────────────────
    const onayEmbed = new EmbedBuilder()
      .setColor(turObj.renk || config.colors.success)
      .setAuthor({
        name:    `Kayıt Yapıldı!`,
        iconURL: hedef.user.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kayıt Edilen',  value: `<@${hedef.id}>`,                                    inline: true },
        { name: '🛡️ Kayıt Eden',    value: `<@${message.member.id}>`,                           inline: true },
        { name: '🏷️ Verilen Roller', value: verilenRoller.length ? verilenRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
        { name: '📝 Yeni İsim',      value: format ? `\`${format}\`` : '—',                     inline: true },
        { name: '🎭 Kayıt Türü',     value: `${turObj.emoji} ${turObj.label}`,                  inline: true },
        { name: '🔢 Kayıt Sayısı',   value: `\`#${sayac}\``,                                    inline: true },
      )
      .setFooter({ text: `${message.guild.name} • Normal kayıt sayın: ${sayac}` })
      .setTimestamp();

    const onayRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`kayit_isim_${hedef.id}`)
        .setLabel('İsim Değiştir')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`kayit_kayitsiz_${hedef.id}`)
        .setLabel('Kayıtsız Ver')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`kayit_bilgi_${hedef.id}`)
        .setLabel('Kayıt Bilgisi')
        .setEmoji('ℹ️')
        .setStyle(ButtonStyle.Primary),
    );

    await message.reply({ embeds: [onayEmbed], components: [onayRow] });

    // ── DM ───────────────────────────────────────────────────────
    if (cfg.dmAc) {
      const dmEmbed = new EmbedBuilder()
        .setColor(turObj.renk || config.colors.success)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTitle(`${turObj.emoji} Kaydın Tamamlandı!`)
        .setDescription(
          (cfg.dmMesaj || '**{server}** sunucusuna hoş geldin, {user}! Kaydın başarıyla tamamlandı.')
            .replace('{user}',   hedef.user.username)
            .replace('{server}', message.guild.name)
            .replace('{isim}',   format),
        )
        .addFields(
          { name: '📝 Verilen İsim', value: format ? `\`${format}\`` : '—',                        inline: true },
          { name: '🎭 Kayıt Türü',   value: `${turObj.emoji} ${turObj.label}`,                     inline: true },
          { name: '🏷️ Roller',       value: verilenRoller.length ? verilenRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
        )
        .setFooter({ text: message.guild.name })
        .setTimestamp();
      await hedef.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    // Zaten kayıtlıydı uyarısı
    if (mevcutKayit) {
      const uyariRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`kayit_bilgi_${hedef.id}`)
          .setLabel('Önceki Kayıt Bilgisi')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
      );
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`⚠️ <@${hedef.id}> daha önce kayıt edilmişti. Kayıt yenilendi.`)
          .setTimestamp()],
        components: [uyariRow],
      }).catch(() => null);
    }
  },

  // ══════════════════════════════════════════════════════
  //  BUTON HANDLER — interactionCreate'ten çağrılır
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
          { name: '📅 Kayıt Tarihi',  value: discordTimestamp(new Date(kayit.kayitAt), 'F'),           inline: true },
          { name: '🔢 Kayıt No',      value: `\`#${kayit.kayitSayisi}\``,                             inline: true },
          { name: '🏷️ Verilen Roller', value: kayit.verilen?.length ? kayit.verilen.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
          { name: '🚫 Kayıtsız',      value: kayit.kayitsiz ? `✅ Evet (${discordTimestamp(new Date(kayit.kayitsizAt || 0), 'R')})` : '❌ Hayır', inline: true },
          ...(g ? [{ name: '🔒 Güvenilirlik', value: `${g.label} (${g.gun} gün)`, inline: true }] : []),
        )
        .setFooter({ text: `ID: ${userId}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Modal: kayit_isim_modal_<userId>  — interactionCreate'ten yönlendirilir
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
//  İÇ YARDIMCI: Kayıtsız ver (kayitsiz.js de kullanır)
// ══════════════════════════════════════════════════════
async function _kayitsizVer(interaction, hedef, yetkili) {
  const cfg   = config.kayit;
  const guild = interaction.guild;

  // Member rollerini kaldır
  for (const rolId of cfg.memberRoller) {
    const rol = guild.roles.cache.get(rolId);
    if (rol && hedef.roles.cache.has(rolId)) {
      await hedef.roles.remove(rol, 'Kayıtsız verildi').catch(() => null);
    }
  }

  // Kayıtsız rolünü ver
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

  // Log
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
