// ╔══════════════════════════════════════════════════════════════════════╗
// ║              SİSTEM: Reaction Role (Emoji → Rol)                    ║
// ║  !rr setup, !rr add, !rr remove, !rr list                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const e      = require('../emojiConfig');
const fs     = require('fs');
const path   = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function readRR() {
  const file = path.join(DATA_DIR, 'reaction_roles.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeRR(data) {
  fs.writeFileSync(path.join(DATA_DIR, 'reaction_roles.json'), JSON.stringify(data, null, 2));
}

// Kayıtlı reaction role: { [guildId]: { [messageId]: { [emoji]: roleId } } }

module.exports = {
  name: 'rr',
  aliases: ['reactionrole', 'rolrol', 'rol-rol'],
  description: 'Reaction Role sistemi. Emoji tıklayınca rol ver.',
  usage: '!rr <setup|ekle|kaldır|liste>',
  category: 'admin',
  cooldown: 5000,

  async execute(message, args, client) {
    const { PermissionFlagsBits } = require('discord.js');
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} **Rolleri Yönet** iznine ihtiyacın var.`)] });
    }

    const sub = args[0]?.toLowerCase();

    // ── !rr setup ── Panel oluştur
    if (sub === 'setup' || sub === 'kur' || sub === 'panel') {
      const title   = args.slice(1).join(' ') || 'Rol Seç';
      const panelEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎭 ${title}`)
        .setDescription('Aşağıdaki butonlara tıklayarak rol alabilir veya bırakabilirsin.\nAynı butona tekrar tıklayarak rolü bırakabilirsin.')
        .setFooter({ text: `${message.guild.name} • Reaction Role Sistemi` })
        .setTimestamp();

      const sentMsg = await message.channel.send({ embeds: [panelEmbed] });

      // Mesajı kaydet
      const data = readRR();
      if (!data[message.guild.id]) data[message.guild.id] = {};
      data[message.guild.id][sentMsg.id] = {};
      writeRR(data);

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${e.success} Panel oluşturuldu! Şimdi \`!rr ekle ${sentMsg.id} <emoji> <@rol>\` ile roller ekle.`)
        .addFields({ name: '📌 Panel ID', value: `\`${sentMsg.id}\``, inline: true })] });
      return;
    }

    // ── !rr ekle <messageId> <emoji> <@rol> ──
    if (sub === 'ekle' || sub === 'add') {
      const msgId  = args[1];
      const emoji  = args[2];
      const roleId = args[3]?.replace(/[<@&>]/g, '');

      if (!msgId || !emoji || !roleId)
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Kullanım: \`!rr ekle <mesaj-ID> <emoji> <@rol>\``)] });

      const role = message.guild.roles.cache.get(roleId);
      if (!role)
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Rol bulunamadı.`)] });

      const data = readRR();
      if (!data[message.guild.id]?.[msgId])
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Bu ID'de kayıtlı bir Reaction Role paneli yok.\n> Önce \`!rr setup\` ile panel oluştur.`)] });

      // Mesajı al
      let panelMsg;
      try {
        panelMsg = await message.channel.messages.fetch(msgId);
      } catch {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Mesaj bulunamadı. Aynı kanalda olman gerekiyor.`)] });
      }

      data[message.guild.id][msgId][emoji] = role.id;
      writeRR(data);

      // Buton ekle
      const existingRows  = panelMsg.components.map(r => ActionRowBuilder.from(r));
      const allButtons    = existingRows.flatMap(r => r.components);
      const newButton     = new ButtonBuilder()
        .setCustomId(`rr_${msgId}_${role.id}`)
        .setLabel(role.name)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary);

      allButtons.push(newButton);

      // Discord: maks 5 buton per row, maks 5 row
      const rows = [];
      for (let i = 0; i < allButtons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(allButtons.slice(i, i + 5)));
      }

      // Embed güncelle
      const oldEmbed = EmbedBuilder.from(panelMsg.embeds[0]);
      const fields   = oldEmbed.data.fields || [];
      fields.push({ name: `${emoji} ${role.name}`, value: `> <@&${role.id}>`, inline: true });
      oldEmbed.setFields(fields);

      await panelMsg.edit({ embeds: [oldEmbed], components: rows.slice(0, 5) });

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${e.success} **${emoji} → ${role.name}** bağlantısı eklendi!`)] });
      return;
    }

    // ── !rr kaldır <messageId> <emoji> ──
    if (sub === 'kaldır' || sub === 'remove' || sub === 'sil') {
      const msgId = args[1];
      const emoji = args[2];

      if (!msgId || !emoji)
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Kullanım: \`!rr kaldır <mesaj-ID> <emoji>\``)] });

      const data = readRR();
      if (!data[message.guild.id]?.[msgId]?.[emoji])
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`${e.error} Bu emoji bu panelde kayıtlı değil.`)] });

      const removedRoleId = data[message.guild.id][msgId][emoji];
      delete data[message.guild.id][msgId][emoji];
      writeRR(data);

      await message.reply({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${e.success} **${emoji}** bağlantısı kaldırıldı.`)] });
      return;
    }

    // ── !rr liste ──
    if (sub === 'liste' || sub === 'list') {
      const data    = readRR();
      const panels  = data[message.guild.id] || {};
      const entries = Object.entries(panels);

      if (entries.length === 0)
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription(`${e.info} Henüz bir Reaction Role paneli yok.`)] });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎭 Reaction Role Panelleri')
        .setTimestamp();

      entries.forEach(([msgId, roles]) => {
        const roleEntries = Object.entries(roles).map(([em, roleId]) => {
          const role = message.guild.roles.cache.get(roleId);
          return `> ${em} → ${role ? `<@&${roleId}>` : `\`${roleId}\` (silinmiş)`}`;
        });
        embed.addFields({
          name: `📌 Panel \`${msgId}\``,
          value: roleEntries.length ? roleEntries.join('\n') : 'Henüz rol eklenmemiş',
          inline: false,
        });
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Yardım
    await message.reply({ embeds: [new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎭 Reaction Role Sistemi')
      .addFields(
        { name: '📋 Komutlar', value: [
          '> `!rr setup <başlık>` — Panel oluştur',
          '> `!rr ekle <mesaj-ID> <emoji> <@rol>` — Rol ekle',
          '> `!rr kaldır <mesaj-ID> <emoji>` — Rol kaldır',
          '> `!rr liste` — Tüm panelleri göster',
        ].join('\n'), inline: false },
        { name: '💡 Örnek', value: [
          '> `!rr setup Oyun Rolleri`',
          '> `!rr ekle 123456789 🎮 @Oyuncu`',
          '> `!rr ekle 123456789 🎵 @Müzik`',
        ].join('\n'), inline: false },
      )
      .setTimestamp()] });
  },

  // Buton handler (interactionCreate'ten çağrılır)
  handleButton: async (interaction, client) => {
    if (!interaction.customId.startsWith('rr_')) return;

    const parts  = interaction.customId.split('_');
    const roleId = parts[2]; // rr_msgId_roleId

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: `${e.error} Rol bulunamadı (silinmiş olabilir).`, flags: 64 });

    const member = interaction.member;

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId).catch(() => null);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${e.roleRemove || '❌'} **${role.name}** rolü kaldırıldı.`)],
        flags: 64,
      });
    } else {
      await member.roles.add(roleId).catch(() => null);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${e.roleAdd || '✅'} **${role.name}** rolü verildi!`)],
        flags: 64,
      });
    }
  },
};
