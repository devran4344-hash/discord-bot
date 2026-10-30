const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

try { GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Bangers-Regular.ttf'), 'Bangers'); } catch (e) {}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('derbi')
        .setDescription('Derbi maçı görseli oluşturur.')
        .addStringOption(o => o.setName('takim1').setDescription('1. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo1').setDescription('1. Takımın Logosu').setRequired(true))
        .addStringOption(o => o.setName('takim2').setDescription('2. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo2').setDescription('2. Takımın Logosu').setRequired(true))
        .addStringOption(o => o.setName('tarih').setDescription('Örn: 21 EKİM').setRequired(true))
        .addStringOption(o => o.setName('saat').setDescription('Örn: 21:00').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        let config;
        try {
            config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
        } catch (err) {
            return interaction.editReply('Kral `config.json` dosyası sunucuda bulunamadı! Lütfen dosyayı repoya ekleyip pushla.');
        }

        const t1 = interaction.options.getString('takim1').toUpperCase();
        const l1 = interaction.options.getAttachment('logo1');
        const t2 = interaction.options.getString('takim2').toUpperCase();
        const l2 = interaction.options.getAttachment('logo2');
        const tarih = interaction.options.getString('tarih').toUpperCase();
        const saat = interaction.options.getString('saat');

        try {
            const arkaPlanUrl = config.derbi_url;
            if (!arkaPlanUrl || arkaPlanUrl.includes('BURAYA')) return interaction.editReply('Config.json dosyasındaki derbi_url linkini güncelle!');

            const bg = await loadImage(arkaPlanUrl);
            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            const logo1Img = await loadImage(l1.url);
            const logo2Img = await loadImage(l2.url);
            ctx.drawImage(logo1Img, canvas.width * 0.15, canvas.height * 0.08, 220, 220);
            ctx.drawImage(logo2Img, canvas.width * 0.65, canvas.height * 0.08, 220, 220);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.font = '140px Bangers, sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 10;
            ctx.strokeText('DERBİSİ', canvas.width / 2, canvas.height * 0.45);
            ctx.fillText('DERBİSİ', canvas.width / 2, canvas.height * 0.45);

            ctx.font = '90px Bangers, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.32);
            ctx.fillText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.32);

            ctx.font = '80px Bangers, sans-serif';
            ctx.strokeText(`${tarih} | ${saat}`, canvas.width / 2, canvas.height * 0.88);
            ctx.fillText(`${tarih} | ${saat}`, canvas.width / 2, canvas.height * 0.88);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'derbi.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı. Config linkini kontrol et.');
        }
    }
};
