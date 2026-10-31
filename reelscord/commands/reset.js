const { SlashCommandBuilder } = require('discord.js');
const { resetAlgorithm } = require('../services/algorithmService');
module.exports = {
  data: new SlashCommandBuilder().setName('reset').setDescription('Algoritmayi sifirla'),
  async execute(i){ await resetAlgorithm(i.user.id); await i.reply({content:'Algoritman sifirlandi.',ephemeral:true}); }
};