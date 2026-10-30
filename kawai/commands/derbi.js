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
        try { config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')); } catch (err) { return interaction.editReply('Config bulunamadı!'); }

        const t1 = interaction.options.getString('takim1').toUpperCase();
        const l1 = interaction.options.getAttachment('logo1');
        const t2 = interaction.options.getString('takim2').toUpperCase();
        const l2 = interaction.options.getAttachment('logo2');
        const tarih = interaction.options.getString('tarih').toUpperCase();
        const saat = interaction.options.getString('saat');

        try {
            const bg = await loadImage(config.derbi_url);
            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            const logo1Img = await loadImage(l1.url);
            const logo2Img = await loadImage(l2.url);
            
            // Logoları büyüttük
            const logoBoyut = canvas.width * 0.22; 
            ctx.drawImage(logo1Img, canvas.width * 0.14, canvas.height * 0.06, logoBoyut, logoBoyut);
            ctx.drawImage(logo2Img, canvas.width * 0.64, canvas.height * 0.06, logoBoyut, logoBoyut);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 1. TAKIM İSİMLERİ (Aşağı çektik, boyutu biraz küçülttük)
            ctx.font = `${canvas.width * 0.08}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.strokeText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.38);
            ctx.fillText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.38);

            // 2. DERBİSİ YAZISI (Tam siyah fırçanın altına oturttuk)
            ctx.font = `${canvas.width * 0.13}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFD700';
            ctx.lineWidth = 10;
            ctx.strokeText('DERBİSİ', canvas.width / 2, canvas.height * 0.49);
            ctx.fillText('DERBİSİ', canvas.width / 2, canvas.height * 0.49);

            // 3. TARİH VE SAAT (Boyutunu küçülttük, tam alt şeridin ortasına)
            ctx.font = `${canvas.width * 0.055}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            // Tarih ve saati biraz daha ortaya çektik
            ctx.strokeText(`${tarih}  |  ${saat}`, canvas.width / 2, canvas.height * 0.88);
            ctx.fillText(`${tarih}  |  ${saat}`, canvas.width / 2, canvas.height * 0.88);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'derbi.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı.');
        }
    }
};
