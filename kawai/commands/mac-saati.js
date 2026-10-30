const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

try { GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Bangers-Regular.ttf'), 'Bangers'); } catch (e) {}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maçsaati')
        .setDescription('Maç saati görseli oluşturur.')
        .addStringOption(o => o.setName('takim1').setDescription('1. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo1').setDescription('1. Takımın Logosu').setRequired(true))
        .addStringOption(o => o.setName('takim2').setDescription('2. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo2').setDescription('2. Takımın Logosu').setRequired(true))
        .addStringOption(o => o.setName('tarih').setDescription('Örn: 21 EKİM').setRequired(true))
        .addStringOption(o => o.setName('saat').setDescription('Örn: 21:00').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        
        // CONFIG KONTROLÜ (Hata vermemesi için içeri aldık)
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
            const arkaPlanUrl = config.macsaati_url;
            if (!arkaPlanUrl || arkaPlanUrl.includes('BURAYA')) return interaction.editReply('Config.json dosyasındaki macsaati_url linkini güncelle!');

            const bg = await loadImage(arkaPlanUrl);
            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            const logo1Img = await loadImage(l1.url);
            const logo2Img = await loadImage(l2.url);
            
            const logoBoyut = 240; 
            ctx.drawImage(logo1Img, 150, 110, logoBoyut, logoBoyut);
            ctx.drawImage(logo2Img, canvas.width - 150 - logoBoyut, 110, logoBoyut, logoBoyut);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.font = '110px Bangers, sans-serif'; 
            ctx.fillStyle = '#FFFFFF'; 
            ctx.strokeStyle = '#000000'; 
            ctx.lineWidth = 8;
            
            const ortaYazi = `${t1}  -  ${t2}`;
            ctx.strokeText(ortaYazi, canvas.width / 2, 570);
            ctx.fillText(ortaYazi, canvas.width / 2, 570);

            ctx.font = '80px Bangers, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.lineWidth = 6;

            ctx.strokeText(tarih, 450, 1150);
            ctx.fillText(tarih, 450, 1150);
            ctx.strokeText(saat, 900, 1150);
            ctx.fillText(saat, 900, 1150);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mac-saati.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı. Config linkini kontrol et.');
        }
    }
};
