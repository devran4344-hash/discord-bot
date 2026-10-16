const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const dateUtil = require('../../utils/date');
const { error, baseEmbed, dateOzeti } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('date')
        .setDescription('Sevgilinle date yap')
        .addSubcommand(sub => sub.setName('baslat').setDescription('Yeni date baslat'))
        .addSubcommand(sub => sub.setName('devam').setDescription('Aktif date e devam et'))
        .addSubcommand(sub => sub.setName('bitir').setDescription('Date i bitir'))
        .addSubcommand(sub => sub.setName('mekanlar').setDescription('Tum mekanlari goster')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'baslat') return baslat(interaction, client);
        if (sub === 'devam') return devam(interaction, client);
        if (sub === 'bitir') return bitir(interaction, client);
        if (sub === 'mekanlar') return mekanlar(interaction);
    }
};

async function baslat(interaction, client) {
    const userId = interaction.user.id;
    const user = await db.getUser(userId);
    if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });
    if (user.aktifDate) return interaction.reply({ embeds: [error('Zaten bir date tesin! `/date devam` yaz.')], ephemeral: true });

    const seviye = user.iliski.seviye || 1;

    // Acik mekanlari listele
    const acikMekanlar = config.mekanlar.filter(m => m.minSeviye <= seviye);
    if (acikMekanlar.length === 0) return interaction.reply({ embeds: [error('Henuz acik mekan yok.')], ephemeral: true });

    const options = acikMekanlar.map(m =>
        new StringSelectMenuOptionBuilder()
            .setLabel(`${m.isim} - ${m.fiyat === 0 ? 'Ucretsiz' : m.fiyat + ' 💎'}`)
            .setValue(m.id)
            .setEmoji(m.emoji)
            .setDescription(`${m.sevgiBonus} sevgi puani bonus`)
    );

    const embed = baseEmbed(config.colors.date)
        .setTitle(`💕 ${user.karakter.isim} ile Nereye Gitmek Istersin?`)
        .setDescription(`Cuzdanin: **${user.cuzdan} 💎**\nSeviye: **${seviye}**\n\nMekan sec:`);

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('date_mekan').setPlaceholder('Mekan sec...').addOptions(options)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const cevap = await msg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!cevap) return msg.edit({ components: [] }).catch(() => {});
    await cevap.deferUpdate();

    const mekanId = cevap.values[0];
    const mekan = dateUtil.mekanBul(mekanId);

    if (user.cuzdan < mekan.fiyat) {
        return msg.edit({ embeds: [error(`Yeterli kalbin yok! **${mekan.isim}** icin **${mekan.fiyat} 💎** gerekli.`)], components: [] });
    }

    // Para cik
    await db.addPara(userId, -mekan.fiyat);

    // Date baslat
    const sahne = await dateUtil.dateBaslat(user, mekan);
    await db.setDate(userId, { mekanId, adim: 1, baglam: sahne, baslangic: Date.now() });

    const dateEmbed = baseEmbed(config.colors.date)
        .setAuthor({ name: `${user.karakter.isim} ile ${mekan.emoji} ${mekan.isim} Date` })
        .setDescription(sahne)
        .setFooter({ text: 'Devam etmek icin /date devam yaz veya bana yaz' });

    await msg.edit({ embeds: [dateEmbed], components: [] });
}

async function devam(interaction, client) {
    const userId = interaction.user.id;
    const user = await db.getUser(userId);
    if (!user || !user.aktifDate) return interaction.reply({ embeds: [error('Aktif date yok! `/date baslat` yaz.')], ephemeral: true });

    const mekan = dateUtil.mekanBul(user.aktifDate.mekanId);
    const devamSahne = await dateUtil.dateDevam(user, 'Kullanici devam etti');

    await db.setDate(userId, {
        ...user.aktifDate,
        adim: user.aktifDate.adim + 1,
        baglam: devamSahne
    });

    const embed = baseEmbed(config.colors.date)
        .setAuthor({ name: `${mekan.emoji} ${mekan.isim} | Adim ${user.aktifDate.adim + 1}` })
        .setDescription(devamSahne);

    return interaction.reply({ embeds: [embed] });
}

async function bitir(interaction, client) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const user = await db.getUser(userId);
    if (!user || !user.aktifDate) return interaction.editReply({ embeds: [error('Aktif date yok!')] });

    const ozet = await dateUtil.dateBitir(user);
    if (!ozet) return interaction.editReply({ embeds: [error('Date ozeti olusturulamadi.')] });

    // Sevgi puani ekle
    await db.addSevgi(userId, ozet.kazanilanSevgi);
    await db.istatistikArttir(userId, 'date');
    await db.ekleAni(userId, `${ozet.mekan.isim} Date`, ozet.ozelAn);
    await db.addPara(userId, config.gunluk.dateOdulu);
    await db.clearDate(userId);

    const embed = dateOzeti(ozet.mekan, ozet.kazanilanSevgi, ozet.ozelAn, ozet.harcama);
    return interaction.editReply({ embeds: [embed] });
}

async function mekanlar(interaction) {
    const user = await db.getUser(interaction.user.id);
    const seviye = user?.iliski?.seviye || 1;

    let liste = '';
    for (const m of config.mekanlar) {
        const acik = m.minSeviye <= seviye;
        liste += `${acik ? '✅' : '🔒'} ${m.emoji} **${m.isim}** - ${m.fiyat === 0 ? 'Ucretsiz' : m.fiyat + ' 💎'} (Seviye ${m.minSeviye}+)\n`;
    }

    const embed = baseEmbed(config.colors.date)
        .setTitle('🗺️ Mekanlar')
        .setDescription(liste)
        .setFooter({ text: `Senin seviyen: ${seviye}` });

    return interaction.reply({ embeds: [embed] });
}
