const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

try { GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Bangers-Regular.ttf'), 'Bangers'); } catch (e) {}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kura')
        .setDescription('Kura fikstürü oluşturur.')
        .addStringOption(o => o.setName('m1_t1').setDescription('1. Maç Sol Takım').setRequired(true))
        .addStringOption(o => o.setName('m1_t2').setDescription('1. Maç Sağ Takım').setRequired(true))
        .addStringOption(o => o.setName('m1_saat').setDescription('1. Maç Saati').setRequired(true))
        .addStringOption(o => o.setName('m2_t1').setDescription('2. Maç Sol Takım').setRequired(true))
        .addStringOption(o => o.setName('m2_t2').setDescription('2. Maç Sağ Takım').setRequired(true))
        .addStringOption(o => o.setName('m2_saat').setDescription('2. Maç Saati').setRequired(true))
        .addStringOption(o => o.setName('m3_t1').setDescription('3. Maç Sol Takım').setRequired(true))
        .addStringOption(o => o.setName('m3_t2').setDescription('3. Maç Sağ Takım').setRequired(true))
        .addStringOption(o => o.setName('m3_saat').setDescription('3. Maç Saati').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        let config;
        try {
            config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
        } catch (err) {
            return interaction.editReply('Kral `config.json` dosyası sunucuda bulunamadı! Lütfen dosyayı repoya ekleyip pushla.');
        }
        
        const m1_t1 = interaction.options.getString('m1_t1').toUpperCase();
        const m1_t2 = interaction.options.getString('m1_t2').toUpperCase();
        const m1_saat = interaction.options.getString('m1_saat');
        
        const m2_t1 = interaction.options.getString('m2_t1').toUpperCase();
        const m2_t2 = interaction.options.getString('m2_t2').toUpperCase();
        const m2_saat = interaction.options.getString('m2_saat');
        
        const m3_t1 = interaction.options.getString('m3_t1').toUpperCase();
        const m3_t2 = interaction.options.getString('m3_t2').toUpperCase();
        const m3_saat = interaction.options.getString('m3_saat');

        try {
            const arkaPlanUrl = config.kura_url;
            if (!arkaPlanUrl || arkaPlanUrl.includes('BURAYA')) return interaction.editReply('Config.json dosyasındaki kura_url linkini güncelle!');

            const bg = await loadImage(arkaPlanUrl);
            const canvas = createCanvas(bg.width, bg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;

            const satirlar = [
                { y: canvas.height * 0.40, t1: m1_t1, t2: m1_t2, saat: m1_saat },
                { y: canvas.height * 0.53, t1: m2_t1, t2: m2_t2, saat: m2_saat },
                { y: canvas.height * 0.66, t1: m3_t1, t2: m3_t2, saat: m3_saat }
            ];

            ctx.font = '50px Bangers, sans-serif';
            for (const satir of satirlar) {
                ctx.strokeText(satir.t1, canvas.width * 0.20, satir.y);
                ctx.fillText(satir.t1, canvas.width * 0.20, satir.y);
                
                ctx.strokeText(satir.t2, canvas.width * 0.80, satir.y);
                ctx.fillText(satir.t2, canvas.width * 0.80, satir.y);

                ctx.font = '40px Bangers, sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.strokeText(satir.saat, canvas.width * 0.50, satir.y + 20);
                ctx.fillText(satir.saat, canvas.width * 0.50, satir.y + 20);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '50px Bangers, sans-serif';
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'kura.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Görsel oluşturulamadı. Config linkini kontrol et.');
        }
    }
};
