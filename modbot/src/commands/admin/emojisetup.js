// ╔══════════════════════════════════════════════════════════════════════╗
// ║         EMOJİ YÖNETİM PANELİ — Developer Portal Emojileri          ║
// ║  Sayfalı panel, filtre, TXT export, sunucu emoji yönetimi          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  AttachmentBuilder, PermissionFlagsBits,
} = require('discord.js');
const { errorEmbed, discordTimestamp } = require('../../utils/helpers');
const { parseEmoji } = require('../../utils/parseEmoji');
const config = require('../../config');
const e      = require('../../emojiConfig');

const OWNER_ID = process.env.OWNER_ID || '1160564359727173792';
const PAGE_SIZE = 12;

// ── Renk paleti ─────────────────────────────────────────────────────
const COLORS = {
  all:      0x5865F2,
  static:   0x57F287,
  animated: 0xFEE75C,
  server:   0xEB459E,
};

// ── Ana embed ────────────────────────────────────────────────────────
function buildEmbed(emojis, filter, page, authorTag, authorAvatar, source) {
  const list = [...emojis.values()];
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage   = Math.min(Math.max(0, page), totalPages - 1);
  const slice      = list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const staticCount   = [...emojis.values()].filter(em => !em.animated).length;
  const animatedCount = [...emojis.values()].filter(em => em.animated).length;

  const filterLabels = { all: '🌐 Tümü', static: '🖼️ Hareketsiz', animated: '✨ Hareketli (GIF)', server: '🏠 Sunucu Emojileri' };
  const srcLabel     = source === 'server' ? '🏠 Sunucu' : '🤖 Dev Portal';

  const emojiLines = slice.length > 0
    ? slice.map((em, i) => {
        const num    = safePage * PAGE_SIZE + i + 1;
        const usage  = em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`;
        const animBadge = em.animated ? ' `GIF`' : '';
        return `\`${String(num).padStart(2, '0')}.\` ${em} **:${em.name}:**${animBadge}\n> ID: \`${em.id}\` • Kullanım: \`${usage}\``;
      }).join('\n')
    : '*Bu kategoride emoji bulunamadı.*';

  return new EmbedBuilder()
    .setColor(COLORS[filter] || COLORS.all)
    .setAuthor({ name: `${srcLabel} Emoji Yönetim Paneli`, iconURL: authorAvatar })
    .setTitle(`${filterLabels[filter] || '🌐 Tümü'} — Emoji Listesi`)
    .setDescription(emojiLines)
    .addFields(
      { name: '📊 Toplam',         value: `\`${emojis.size}\``,     inline: true },
      { name: '🖼️ Hareketsiz',    value: `\`${staticCount}\``,     inline: true },
      { name: '✨ Hareketli',      value: `\`${animatedCount}\``,   inline: true },
      { name: '🗂️ Kaynak',        value: srcLabel,                  inline: true },
      { name: '🔍 Filtre',         value: filterLabels[filter] || '🌐 Tümü', inline: true },
      { name: '📄 Sayfa',          value: `${safePage + 1} / ${totalPages}`, inline: true },
    )
    .setFooter({ text: `Sahip: ${authorTag} • 24 saat aktif`, iconURL: authorAvatar })
    .setTimestamp();
}

// ── Filtre select menüsü ─────────────────────────────────────────────
function buildFilterSelect(current) {
  const opts = [
    { label: 'Tüm Emojiler',         value: 'all',      desc: 'Her şeyi göster',          emoji: '🌐' },
    { label: 'Hareketsiz Emojiler',  value: 'static',   desc: 'Sadece normal emojiler',   emoji: '🖼️' },
    { label: 'Hareketli (GIF)',      value: 'animated', desc: 'Sadece GIF emojiler',       emoji: '✨' },
    { label: 'Sunucu Emojileri',     value: 'server',   desc: 'Sunucuya ait emojiler',     emoji: '🏠' },
  ];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('emoji_filter')
      .setPlaceholder('🔍 Filtrele...')
      .addOptions(
        opts.map(o =>
          new StringSelectMenuOptionBuilder()
            .setValue(o.value)
            .setLabel(o.label)
            .setDescription(o.desc)
            .setEmoji(o.emoji)
            .setDefault(o.value === current),
        ),
      ),
  );
}

// ── Navigasyon + aksiyon butonları ───────────────────────────────────
function buildButtons(page, totalPages) {
  const disFirst = page === 0;
  const disLast  = page >= totalPages - 1;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ep_first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(disFirst),
    new ButtonBuilder().setCustomId('ep_prev').setLabel('◀ Önceki').setStyle(ButtonStyle.Primary).setDisabled(disFirst),
    new ButtonBuilder().setCustomId('ep_next').setLabel('Sonraki ▶').setStyle(ButtonStyle.Primary).setDisabled(disLast),
    new ButtonBuilder().setCustomId('ep_last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(disLast),
    new ButtonBuilder().setCustomId('ep_export').setLabel('📄 TXT Dökümü').setStyle(ButtonStyle.Success),
  );
}

function buildExtraButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ep_refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ep_copyall').setLabel('📋 Tüm Kodları Kopyala').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ep_close').setLabel('✖ Kapat').setStyle(ButtonStyle.Danger),
  );
}

// ══════════════════════════════════════════════════════════════════════
//  KOMUT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
  name: 'emojisetup',
  aliases: ['emojipanel', 'epanel', 'emojilist'],
  description: 'Developer Portal ve sunucu emojilerini gelişmiş panelde listeler.',
  usage: '!emojisetup',
  category: 'admin',
  cooldown: 10000,

  async execute(message, args, client) {
    // Sadece owner kullanabilir
    if (
      message.author.id !== OWNER_ID &&
      message.author.id !== message.guild.ownerId &&
      !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      return message.reply({
        embeds: [errorEmbed('Bu panel sadece **sunucu yöneticilerine** açıktır.')],
      });
    }

    // Dev Portal emojilerini çek
    let devEmojis = await client.application?.emojis.fetch().catch(() => null);
    if (!devEmojis || devEmojis.size === 0) devEmojis = null;

    // Sunucu emojilerini çek
    const guildEmojis = message.guild.emojis.cache;

    if (!devEmojis && guildEmojis.size === 0) {
      return message.reply({
        embeds: [errorEmbed('Hiç emoji bulunamadı. Developer Portal veya sunucuda emoji yok.')],
      });
    }

    // State
    let filter = 'all';
    let page   = 0;

    // Başlangıçta dev portal varsa onu, yoksa sunucu emojilerini göster
    let source = devEmojis ? 'dev' : 'server';

    function getEmojis() {
      const base = source === 'server' ? guildEmojis : (devEmojis || guildEmojis);
      if (filter === 'static')   return base.filter(em => !em.animated);
      if (filter === 'animated') return base.filter(em => em.animated);
      if (filter === 'server')   return guildEmojis;
      return base;
    }

    function getTotalPages() {
      return Math.max(1, Math.ceil(getEmojis().size / PAGE_SIZE));
    }

    // İlk mesajı gönder
    const panelMsg = await message.reply({
      embeds: [buildEmbed(getEmojis(), filter, page, message.author.tag, message.author.displayAvatarURL({ dynamic: true }), source)],
      components: [buildFilterSelect(filter), buildButtons(page, getTotalPages()), buildExtraButtons()],
    });

    // ── 24 saatlik collector ────────────────────────────────────────
    const collector = panelMsg.createMessageComponentCollector({ time: 86400000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: `${e.error} Bu panel sadece **${message.author.tag}** tarafından kullanılabilir!`,
          flags: 64,
        });
      }

      const id  = interaction.customId;
      const val = interaction.values?.[0];

      // ── Filtre değişikliği ────────────────────────────────────────
      if (id === 'emoji_filter' && val) {
        filter = val;
        page   = 0;
        if (val === 'server') source = 'server';
        else                  source = devEmojis ? 'dev' : 'server';

        return interaction.update({
          embeds:     [buildEmbed(getEmojis(), filter, page, message.author.tag, message.author.displayAvatarURL({ dynamic: true }), source)],
          components: [buildFilterSelect(filter), buildButtons(page, getTotalPages()), buildExtraButtons()],
        });
      }

      // ── Navigasyon ────────────────────────────────────────────────
      if (id === 'ep_first') page = 0;
      if (id === 'ep_prev')  page = Math.max(0, page - 1);
      if (id === 'ep_next')  page = Math.min(getTotalPages() - 1, page + 1);
      if (id === 'ep_last')  page = getTotalPages() - 1;

      if (['ep_first','ep_prev','ep_next','ep_last'].includes(id)) {
        return interaction.update({
          embeds:     [buildEmbed(getEmojis(), filter, page, message.author.tag, message.author.displayAvatarURL({ dynamic: true }), source)],
          components: [buildFilterSelect(filter), buildButtons(page, getTotalPages()), buildExtraButtons()],
        });
      }

      // ── Yenile ────────────────────────────────────────────────────
      if (id === 'ep_refresh') {
        devEmojis = await client.application?.emojis.fetch().catch(() => null);
        return interaction.update({
          embeds:     [buildEmbed(getEmojis(), filter, page, message.author.tag, message.author.displayAvatarURL({ dynamic: true }), source)],
          components: [buildFilterSelect(filter), buildButtons(page, getTotalPages()), buildExtraButtons()],
        });
      }

      // ── TXT Export ────────────────────────────────────────────────
      if (id === 'ep_export') {
        const allEmojis = [...(devEmojis?.values() || []), ...(guildEmojis?.values() || [])];
        const lines = [
          `MODBOT EMOJİ DÖKÜM RAPORU`,
          `Tarih: ${new Date().toLocaleString('tr-TR')}`,
          `Bot: ${client.user.tag}`,
          `Sunucu: ${message.guild.name}`,
          `─`.repeat(60),
          ``,
          `DEV PORTAL EMOJİLER (${devEmojis?.size || 0}):`,
          ...(devEmojis
            ? [...devEmojis.values()].map(em =>
                `  ${em.animated ? '[GIF]' : '[PNG]'} :${em.name}:  |  ID: ${em.id}  |  Kullanım: ${em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`}`,
              )
            : ['  (Emoji bulunamadı)']),
          ``,
          `SUNUCU EMOJİLER (${guildEmojis.size}):`,
          ...[...guildEmojis.values()].map(em =>
            `  ${em.animated ? '[GIF]' : '[PNG]'} :${em.name}:  |  ID: ${em.id}  |  Kullanım: ${em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`}  |  Sunucu: ${em.guild?.name || '?'}`,
          ),
          ``,
          `─`.repeat(60),
          `Toplam: ${allEmojis.length} emoji`,
        ];

        const buf  = Buffer.from(lines.join('\n'), 'utf-8');
        const file = new AttachmentBuilder(buf, { name: `emojiler_${Date.now()}.txt` });

        return interaction.reply({
          content: `📄 **${allEmojis.length}** emoji dökümü hazır!`,
          files: [file],
          flags: 64,
        });
      }

      // ── Tüm Kodları Kopyala (ephemeral) ──────────────────────────
      if (id === 'ep_copyall') {
        const currentEmojis = [...getEmojis().values()];
        const codes = currentEmojis
          .map(em => em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`)
          .join(' ');
        const truncated = codes.length > 1900 ? codes.slice(0, 1900) + '...' : codes;

        return interaction.reply({
          content: `📋 **Mevcut sayfadaki tüm emoji kodları:**\n\`\`\`${currentEmojis.map(em => em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`).join('\n')}\`\`\``.slice(0, 2000),
          flags: 64,
        });
      }

      // ── Kapat ─────────────────────────────────────────────────────
      if (id === 'ep_close') {
        await panelMsg.edit({ components: [] }).catch(() => null);
        return interaction.reply({ content: `${e.success} Panel kapatıldı.`, flags: 64 });
      }
    });
  },
};
