// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    KAYITSIZ VER KOMUTU                             ║
// ║  !kayitsiz @üye [sebep]                                            ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { errorEmbed, sendLog, discordTimestamp } = require('../../utils/helpers');
const { kayitsizEkle, kayitGetir } = require('../../utils/database');

function isKayitYetkili(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const yetkili = config.kayit?.yetkiliRoller || [];
  return yetkili.some(r => member.roles.cache.has(r));
}

module.exports = {
  name:     'kayitsiz',
  aliases:  ['unregister', 'unreg'],
  category: 'admin',
  usage:    '!kayitsiz @üye [sebep]',
  cooldown: 3000,
  description: 'Üyenin kayıt rollerini alır, kayıtsız rolü verir.',

  data: new SlashCommandBuilder()
    .setName('kayitsiz')
    .setDescription('Üyenin kayıt rollerini alır, kayıtsız rolü verir.')
    .addUserOption(o => o.setName('üye').setDescription('Üye').setRequired(true))
    .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)),

  async executeSlash(interaction, client) {
    if (!isKayitYetkili(interaction.member))
      return interaction.reply({ embeds: [errorEmbed('Kayıt yetkilisi rolüne ihtiyacın var.')], flags: 64 });
    const hedef = await interaction.guild.members.fetch(interaction.options.getUser('üye').id).catch(() => null);
    if (!hedef) return interaction.reply({ embeds: [errorEmbed('Üye bulunamadı.')], flags: 64 });
    const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    const cfg   = config.kayit;
    // Member rolleri kaldır
    for (const rolId of cfg.memberRoller) {
      const rol = interaction.guild.roles.cache.get(rolId);
      if (rol && hedef.roles.cache.has(rolId)) await hedef.roles.remove(rol).catch(() => null);
    }
    // Kayıtsız rolü ver
    if (cfg.kayitsizRolId) {
      const kr = interaction.guild.roles.cache.get(cfg.kayitsizRolId);
      if (kr && !hedef.roles.cache.has(cfg.kayitsizRolId)) await hedef.roles.add(kr).catch(() => null);
    }
    await kayitsizEkle(interaction.guild.id, hedef.id, { neden: sebep, verenId: interaction.member.id });
    await interaction.reply({ content: `🚫 **${hedef.user.tag}** kayıtsız yapıldı. Sebep: ${sebep}` });
  },

  async execute(message, args, client) {
    if (!isKayitYetkili(message.member)) {
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için **kayıt yetkilisi** olman gerekiyor.')] });
    }

    if (!config.kayit?.enabled) {
      return message.reply({ embeds: [errorEmbed('Kayıt sistemi şu an devre dışı.')] });
    }

    const hedef = message.mentions.members?.first();
    if (!hedef) {
      return message.reply({ embeds: [errorEmbed('**Kullanım:** `!kayitsiz @üye [sebep]`')] });
    }

    if (hedef.user.bot) {
      return message.reply({ embeds: [errorEmbed('Botlara kayıtsız verilemez.')] });
    }

    const sebep = args.slice(1).join(' ').trim() || 'Sebep belirtilmedi';
    const cfg   = config.kayit;
    const guild = message.guild;

    // Mevcut kayıt bilgisi
    const mevcutKayit = await kayitGetir(guild.id, hedef.id);

    // Member rollerini kaldır
    const kaldirilanRoller = [];
    for (const rolId of cfg.memberRoller) {
      const rol = guild.roles.cache.get(rolId);
      if (rol && hedef.roles.cache.has(rolId)) {
        await hedef.roles.remove(rol, `Kayıtsız: ${sebep}`).catch(() => null);
        kaldirilanRoller.push(rolId);
      }
    }

    // Kayıtsız rolünü ver
    let kayitsizRolVerildi = false;
    if (cfg.kayitsizRolId) {
      const kayitsizRol = guild.roles.cache.get(cfg.kayitsizRolId);
      if (kayitsizRol && !hedef.roles.cache.has(cfg.kayitsizRolId)) {
        await hedef.roles.add(kayitsizRol, `Kayıtsız: ${sebep}`).catch(() => null);
        kayitsizRolVerildi = true;
      }
    }

    // Firestore güncelle
    await kayitsizEkle(guild.id, hedef.id, {
      neden:   sebep,
      verenId: message.member.id,
    });

    // ── Onay embed ───────────────────────────────────────────────
    const onayEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setAuthor({
        name:    `🚫 Kayıtsız Verildi — ${hedef.user.username}`,
        iconURL: hedef.user.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Üye',              value: `<@${hedef.id}>\n\`${hedef.user.tag}\``,                 inline: true },
        { name: '🛡️ İşlemi Yapan',     value: `<@${message.member.id}>\n\`${message.author.tag}\``,   inline: true },
        { name: '📝 Sebep',            value: `\`${sebep}\``,                                          inline: true },
        { name: '🏷️ Kaldırılan Roller', value: kaldirilanRoller.length ? kaldirilanRoller.map(r => `<@&${r}>`).join(' ') : '—', inline: true },
        { name: '🚫 Kayıtsız Rolü',    value: kayitsizRolVerildi ? `<@&${cfg.kayitsizRolId}> ✅ Verildi` : (cfg.kayitsizRolId ? '⚠️ Zaten vardı' : '—'), inline: true },
        { name: '📋 Önceki Kayıt',     value: mevcutKayit ? `\`${mevcutKayit.isim || '—'}\` (${discordTimestamp(new Date(mevcutKayit.kayitAt), 'R')})` : '❌ Kayıt bulunamadı', inline: true },
      )
      .setFooter({ text: `ID: ${hedef.id}` })
      .setTimestamp();

    await message.reply({ embeds: [onayEmbed] });

    // ── Log ──────────────────────────────────────────────────────
    await sendLog(guild, 'modLog', new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🚫 Kayıtsız Verildi')
      .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Üye',          value: `<@${hedef.id}> \`(${hedef.user.tag})\``,           inline: true },
        { name: '🛡️ Yapan',        value: `<@${message.member.id}> \`(${message.author.tag})\``, inline: true },
        { name: '📝 Sebep',        value: sebep,                                               inline: true },
        { name: '📋 Önceki İsim',  value: mevcutKayit?.isim ? `\`${mevcutKayit.isim}\`` : '—', inline: true },
        { name: '📅 Tarih',        value: discordTimestamp(new Date(), 'F'),                   inline: true },
      )
      .setFooter({ text: `Üye ID: ${hedef.id}` })
      .setTimestamp());

    // ── Kayıt kanalına bildirim ───────────────────────────────────
    if (cfg.logKanalId) {
      const logKanal = guild.channels.cache.get(cfg.logKanalId);
      if (logKanal) {
        await logKanal.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(
              `🚫 <@${hedef.id}> **kayıtsız** yapıldı.\n` +
              `> Yapan: <@${message.member.id}> • Sebep: \`${sebep}\``,
            )
            .setTimestamp()],
        }).catch(() => null);
      }
    }
  },
};
