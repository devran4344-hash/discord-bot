const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, isModerator, discordTimestamp } = require('../../utils/helpers');
const filter = require('../../utils/profanityFilter');
const config = require('../../config');
const e      = require('../../emojiConfig');

// Runtime'da eklenen özel kelimeler

module.exports = {
  name: 'addword',
  aliases: ['kelimeekle', 'yasakkeli̇me', 'yasakekle'],
  description: 'Küfür listesine yeni yasaklı kelime ekler.',
  usage: '!addword <kelime>',
  category: 'admin',
  cooldown: 3000,

  data: new (require('discord.js').SlashCommandBuilder)()
    .setName('addword')
    .setDescription('Küfür filtresine kelime ekler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('kelime').setDescription('Eklenecek kelime').setRequired(true)),

  async executeSlash(interaction, client) {
    if (!isModerator(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Moderatör gerekli.')], flags: 64 });
    const word = interaction.options.getString('kelime').toLowerCase().trim();
    filter.addCustomWord(word);
    await interaction.reply({ content: `✅ \`${word}\` filtreye eklendi.`, flags: 64 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('**Sunucuyu Yönet** iznine ihtiyacın var.')] });

    if (!args[0])
      return message.reply({ embeds: [errorEmbed('Bir kelime belirtmelisin.\n> **Kullanım:** `!addword <kelime>`')] });

    const word   = args.join(' ').toLowerCase().trim();
    const added  = filter.addCustomWord(word);

    if (!added) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${e.warning} \`${word}\` zaten yasaklı kelime listesinde var!`)],
      });
    }

    // config'e de ekle (oturum boyunca kalır)
    if (!config.wordFilter.extraBannedWords) config.wordFilter.extraBannedWords = [];
    if (!config.wordFilter.extraBannedWords.includes(word)) {
      config.wordFilter.extraBannedWords.push(word);
    }

    await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setAuthor({ name: 'Kelime Listesi Güncellendi', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setDescription(`${e.success} \`${word}\` yasaklı kelime listesine eklendi.`)
        .addFields(
          { name: '📝 Eklenen Kelime',  value: `\`${word}\``,                                   inline: true },
          { name: '👮 Yetkili',         value: message.author.tag,                              inline: true },
          { name: '📅 Tarih',           value: discordTimestamp(new Date(), 'R'),               inline: true },
          { name: `${e.warning} Uyarı`, value: '> Bu kelime yalnızca **bot yeniden başlayana** kadar geçerlidir.\n> Kalıcı yapmak için `src/utils/profanityFilter.js` dosyasına ekle.', inline: false },
        )
        .setTimestamp()],
    });
  },
};
