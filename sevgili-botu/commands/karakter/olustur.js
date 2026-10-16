const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karakter')
        .setDescription('Karakterini olustur')
        .addSubcommand(sub =>
            sub.setName('olustur').setDescription('Yeni karakter olustur'))
        .addSubcommand(sub =>
            sub.setName('goruntule').setDescription('Karakterini goruntule'))
        .addSubcommand(sub =>
            sub.setName('duzenle').setDescription('Karakterini duzenle'))
        .addSubcommand(sub =>
            sub.setName('sifirla').setDescription('Karakterini sifirla')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'olustur') return olustur(interaction, client);
        if (sub === 'goruntule') return goruntule(interaction, client);
        if (sub === 'duzenle') return duzenle(interaction, client);
        if (sub === 'sifirla') return sifirla(interaction, client);
    }
};

async function olustur(interaction, client) {
    const userId = interaction.user.id;
    let user = await db.getUser(userId) || await db.createUser(userId, interaction.user.username);

    if (user.karakter) {
        return interaction.reply({
            content: '🌸 Zaten bir karakterin var! Once `/karakter sifirla` yaz.',
            ephemeral: true
        });
    }

    // Adim 1: Isim (Modal)
    const modal = new ModalBuilder().setCustomId('kar_isim').setTitle('Karakter Ismi');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('isim')
                .setLabel('Karakterinin adi')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(20)
                .setPlaceholder('Luna, Aiko, Elif, Zeynep...')
        )
    );

    await interaction.showModal(modal);

    // Modal cevabini bekle
    const isimCevap = await interaction.awaitModalSubmit({
        time: 60000,
        filter: i => i.customId === 'kar_isim' && i.user.id === userId
    }).catch(() => null);

    if (!isimCevap) return;
    const isim = isimCevap.fields.getTextInputValue('isim');

    // Adim 2: Yas
    const yasEmbed = baseEmbed(config.colors.main)
        .setTitle('🌸 Karakter Olusturma (1/5)')
        .setDescription(`**Isim:** ${isim}\n\n${isim} kac yasinda olsun?`);

    const yasRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('yas_18').setLabel('18-22').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yas_23').setLabel('23-26').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yas_27').setLabel('27-30').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yas_31').setLabel('31+').setStyle(ButtonStyle.Primary)
    );

    const yasMsg = await isimCevap.reply({ embeds: [yasEmbed], components: [yasRow], fetchReply: true });

    const yasCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!yasCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await yasCevap.deferUpdate();
    const yas = yasCevap.customId.split('_')[1];

    // Adim 3: Gorunum
    const gorunumOptions = config.karakterSecenekleri.gorunumler.map(g =>
        new StringSelectMenuOptionBuilder().setLabel(g.isim).setValue(g.id).setEmoji(g.emoji)
    );
    const gorunumEmbed = baseEmbed(config.colors.main)
        .setTitle('🌸 Karakter Olusturma (2/5)')
        .setDescription(`${isim}'in gorunumu nasil olsun?`);
    const gorunumRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('gorunum').setPlaceholder('Gorunum sec...').addOptions(gorunumOptions)
    );

    await yasMsg.edit({ embeds: [gorunumEmbed], components: [gorunumRow] });

    const gorunumCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!gorunumCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await gorunumCevap.deferUpdate();
    const gorunumId = gorunumCevap.values[0];
    const gorunumIsim = config.karakterSecenekleri.gorunumler.find(g => g.id === gorunumId).isim;

    // Adim 4: Kisilik
    const kisilikOptions = config.karakterSecenekleri.kisilikler.map(k =>
        new StringSelectMenuOptionBuilder().setLabel(k.isim).setDescription(k.aciklama).setValue(k.id).setEmoji('🎭')
    );
    const kisilikEmbed = baseEmbed(config.colors.main)
        .setTitle('🌸 Karakter Olusturma (3/5)')
        .setDescription(`${isim}'in kisiligi nasil olsun?`);
    const kisilikRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('kisilik').setPlaceholder('Kisilik sec...').addOptions(kisilikOptions)
    );

    await yasMsg.edit({ embeds: [kisilikEmbed], components: [kisilikRow] });

    const kisilikCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!kisilikCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await kisilikCevap.deferUpdate();
    const kisilikId = kisilikCevap.values[0];
    const kisilikIsim = config.karakterSecenekleri.kisilikler.find(k => k.id === kisilikId).isim;

    // Adim 5: Hitap
    const hitapOptions = config.karakterSecenekleri.hitapSekilleri.map(h =>
        new StringSelectMenuOptionBuilder().setLabel(h.charAt(0).toUpperCase() + h.slice(1)).setValue(h).setEmoji('💕')
    );
    const hitapEmbed = baseEmbed(config.colors.main)
        .setTitle('🌸 Karakter Olusturma (4/5)')
        .setDescription(`Sana nasil hitap etsin?`);
    const hitapRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('hitap').setPlaceholder('Hitap sec...').addOptions(hitapOptions)
    );

    await yasMsg.edit({ embeds: [hitapEmbed], components: [hitapRow] });

    const hitapCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!hitapCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await hitapCevap.deferUpdate();
    const hitap = hitapCevap.values[0];

    // Adim 6: Hobiler
    const hobiOptions = config.karakterSecenekleri.hobiler.map(h =>
        new StringSelectMenuOptionBuilder().setLabel(h.isim).setValue(h.id).setEmoji(h.emoji)
    );
    const hobiEmbed = baseEmbed(config.colors.main)
        .setTitle('🌸 Karakter Olusturma (5/5)')
        .setDescription(`${isim}'in hobileri neler? (2-5 arasi sec)`);
    const hobiRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('hobi').setPlaceholder('Hobileri sec...').setMinValues(2).setMaxValues(5).addOptions(hobiOptions)
    );

    await yasMsg.edit({ embeds: [hobiEmbed], components: [hobiRow] });

    const hobiCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!hobiCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await hobiCevap.deferUpdate();
    const hobiler = hobiCevap.values.map(h => config.karakterSecenekleri.hobiler.find(x => x.id === h).isim);

    // Onay
    const ozetEmbed = baseEmbed(config.colors.ask)
        .setTitle('💕 Karakterin Hazir!')
        .addFields(
            { name: '👤 Isim', value: isim, inline: true },
            { name: '🎂 Yas', value: yas, inline: true },
            { name: '👗 Gorunum', value: gorunumIsim, inline: true },
            { name: '🎭 Kisilik', value: kisilikIsim, inline: true },
            { name: '💝 Hitap', value: hitap, inline: true },
            { name: '🎨 Hobiler', value: hobiler.join(', '), inline: false }
        )
        .setFooter({ text: 'Onayliyor musun?' });

    const onayRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('onayla').setLabel('Onayla').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('iptal').setLabel('Iptal').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    await yasMsg.edit({ embeds: [ozetEmbed], components: [onayRow] });

    const onayCevap = await yasMsg.awaitMessageComponent({
        filter: i => i.user.id === userId,
        time: 120000
    }).catch(() => null);

    if (!onayCevap) return yasMsg.edit({ components: [] }).catch(() => {});
    await onayCevap.deferUpdate();

    if (onayCevap.customId === 'iptal') {
        return yasMsg.edit({ embeds: [baseEmbed(config.colors.error).setTitle('❌ Iptal').setDescription('Karakter olusturma iptal edildi.')], components: [] });
    }

    // Kaydet
    await db.updateUser(userId, {
        karakter: {
            isim,
            yas,
            gorunum: gorunumIsim,
            kisilik: kisilikId,
            kisilikIsim,
            hitap,
            hobiler
        }
    });

    await yasMsg.edit({
        embeds: [baseEmbed(config.colors.success).setTitle('🌸 Karakterin Olusturuldu!').setDescription(`${isim} artik seninle! Onunla konusmak icin beni etiketle 💕\n\nDate baslatmak icin: \`/date baslat\``)],
        components: []
    });
}

async function goruntule(interaction) {
    const user = await db.getUser(interaction.user.id);
    if (!user || !user.karakter) {
        return interaction.reply({ content: '🌸 Once karakter olustur! `/karakter olustur`', ephemeral: true });
    }
    const { karakterProfil } = require('../../utils/embeds');
    return interaction.reply({ embeds: [karakterProfil(user.karakter, user.iliski)] });
}

async function duzenle(interaction) {
    return interaction.reply({ content: '🌸 Karakterini duzenlemek icin once `/karakter sifirla` yazip yeniden olustur.', ephemeral: true });
}

async function sifirla(interaction) {
    const user = await db.getUser(interaction.user.id);
    if (!user || !user.karakter) {
        return interaction.reply({ content: '🌸 Zaten karakterin yok.', ephemeral: true });
    }
    await db.updateUser(interaction.user.id, { karakter: null, iliski: { sevgiPuani: 0, seviye: 1, ruhHali: 'mutlu', baslangic: new Date().toISOString(), sonMesaj: Date.now(), kavgaSebebi: null }, gecmis: [], anilar: [], hatiralar: {} });
    return interaction.reply({ content: '🌸 Karakterin sifirlandi! Yeniden `/karakter olustur` yazabilirsin.', ephemeral: true });
}
