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
            
            // --- LOGOLARI BÜYÜTÜP KALKANLARIN İÇİNE OTURTMA ---
            // Boyutu resmin genişliğine göre dinamik ayarlıyoruz
            const logoBoyut = canvas.width * 0.22; 
            
            // Sol Kalkan (Biraz daha içeri ve aşağı)
            ctx.drawImage(logo1Img, canvas.width * 0.14, canvas.height * 0.06, logoBoyut, logoBoyut);
            // Sağ Kalkan (Biraz daha içeri ve aşağı)
            ctx.drawImage(logo2Img, canvas.width * 0.64, canvas.height * 0.06, logoBoyut, logoBoyut);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // --- YAZILARI BÜYÜT VE TAM MERKEZE OTURT ---
            
            // Takım İsimleri (Biraz daha yukarı, tam siyah alanın üstüne)
            ctx.font = `${canvas.width * 0.09}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.strokeText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.34);
            ctx.fillText(`${t1} - ${t2}`, canvas.width / 2, canvas.height * 0.34);

            // DERBİSİ Yazısı (Tam siyah alanın ortasına, sarı renkli)
            ctx.font = `${canvas.width * 0.14}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFD700'; // Sarı
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 10;
            ctx.strokeText('DERBİSİ', canvas.width / 2, canvas.height * 0.48);
            ctx.fillText('DERBİSİ', canvas.width / 2, canvas.height * 0.48);

            // --- TARİH VE SAAT (Alt şeridin tam ortasına) ---
            ctx.font = `${canvas.width * 0.065}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            // İkonların sağına denk gelecek şekilde ortaya hizalıyoruz
            ctx.strokeText(`${tarih}  |  ${saat}`, canvas.width / 2, canvas.height * 0.87);
            ctx.fillText(`${tarih}  |  ${saat}`, canvas.width / 2, canvas.height * 0.87);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'derbi.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı. Config linkini kontrol et.');
        }
    }
};
