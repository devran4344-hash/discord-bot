const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

try { GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Bangers-Regular.ttf'), 'Bangers'); } catch (e) {}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maçsonucu')
        .setDescription('Maç sonucu görseli oluşturur.')
        .addStringOption(o => o.setName('takim1').setDescription('1. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo1').setDescription('1. Takımın Logosu').setRequired(true))
        .addIntegerOption(o => o.setName('skor1').setDescription('1. Takım Skoru').setRequired(true))
        .addStringOption(o => o.setName('takim2').setDescription('2. Takım').setRequired(true))
        .addAttachmentOption(o => o.setName('logo2').setDescription('2. Takımın Logosu').setRequired(true))
        .addIntegerOption(o => o.setName('skor2').setDescription('2. Takım Skoru').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        let config;
        try { config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')); } catch (err) { return interaction.editReply('Config bulunamadı!'); }

        const t1 = interaction.options.getString('takim1').toUpperCase();
        const l1 = interaction.options.getAttachment('logo1');
        const s1 = interaction.options.getInteger('skor1');
        const t2 = interaction.options.getString('takim2').toUpperCase();
        const l2 = interaction.options.getAttachment('logo2');
        const s2 = interaction.options.getInteger('skor2');

        try {
            const bg = await loadImage(config.macsonucu_url);
            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            const logo1Img = await loadImage(l1.url);
            const logo2Img = await loadImage(l2.url);
            
            const logoBoyut = canvas.width * 0.22;
            ctx.drawImage(logo1Img, canvas.width * 0.14, canvas.height * 0.06, logoBoyut, logoBoyut);
            ctx.drawImage(logo2Img, canvas.width * 0.64, canvas.height * 0.06, logoBoyut, logoBoyut);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // MAÇ BİTTİ
            ctx.font = `${canvas.width * 0.08}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.strokeText('MAÇ BİTTİ!', canvas.width / 2, canvas.height * 0.38);
            ctx.fillText('MAÇ BİTTİ!', canvas.width / 2, canvas.height * 0.38);

            // SKOR (Çok büyük olmasını engelledik, tam ortaya oturttuk)
            ctx.font = `${canvas.width * 0.10}px Bangers, sans-serif`;
            ctx.fillStyle = '#FFD700';
            const skorYazi = `${t1} ${s1} - ${s2} ${t2}`;
            ctx.strokeText(skorYazi, canvas.width / 2, canvas.height * 0.50);
            ctx.fillText(skorYazi, canvas.width / 2, canvas.height * 0.50);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mac-sonucu.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı.');
        }
    }
};
