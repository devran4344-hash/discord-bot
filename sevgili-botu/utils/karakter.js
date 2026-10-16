// Karakter Olusturma Sihirbazi Yardimcilari
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');

function yasSorusuRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kar_yas_18').setLabel('18-22').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kar_yas_23').setLabel('23-26').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kar_yas_27').setLabel('27-30').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kar_yas_31').setLabel('31+').setStyle(ButtonStyle.Primary)
    );
}

function kisilikRow() {
    const options = config.karakterSecenekleri.kisilikler.map(k =>
        new StringSelectMenuOptionBuilder()
            .setLabel(k.isim)
            .setDescription(k.aciklama)
            .setValue(k.id)
            .setEmoji('🎭')
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('kar_kisilik')
            .setPlaceholder('Bir kisilik sec...')
            .addOptions(options)
    );
}

function gorunumRow() {
    const options = config.karakterSecenekleri.gorunumler.map(g =>
        new StringSelectMenuOptionBuilder()
            .setLabel(g.isim)
            .setValue(g.id)
            .setEmoji(g.emoji)
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('kar_gorunum')
            .setPlaceholder('Gorunumu sec...')
            .addOptions(options)
    );
}

function hitapRow() {
    const options = config.karakterSecenekleri.hitapSekilleri.map(h =>
        new StringSelectMenuOptionBuilder()
            .setLabel(h.charAt(0).toUpperCase() + h.slice(1))
            .setValue(h)
            .setEmoji('💕')
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('kar_hitap')
            .setPlaceholder('Sana nasil hitap etsin?')
            .addOptions(options)
    );
}

function hobiRow(secilenler = []) {
    const options = config.karakterSecenekleri.hobiler.map(h =>
        new StringSelectMenuOptionBuilder()
            .setLabel(h.isim)
            .setValue(h.id)
            .setEmoji(h.emoji)
            .setDefault(secilenler.includes(h.id))
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('kar_hobi')
            .setPlaceholder('Hobileri sec (max 5)')
            .setMinValues(2)
            .setMaxValues(5)
            .addOptions(options)
    );
}

function isimModal() {
    const modal = new ModalBuilder()
        .setCustomId('kar_isim_modal')
        .setTitle('Karakter Ismi');

    const isimInput = new TextInputBuilder()
        .setCustomId('isim_input')
        .setLabel('Karakterinin adi ne olsun?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ornek: Luna, Aiko, Elif, Zeynep...')
        .setRequired(true)
        .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder().addComponents(isimInput));
    return modal;
}

function onayRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kar_onayla').setLabel('Onayla').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('kar_iptal').setLabel('Iptal').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );
}

module.exports = {
    yasSorusuRow,
    kisilikRow,
    gorunumRow,
    hitapRow,
    hobiRow,
    isimModal,
    onayRow
};
