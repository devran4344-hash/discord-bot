const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'banner',
  aliases: ['profil-banner', 'arkaplan'],
  description: 'Kullanıcının profil bannerını gösterir.',
  usage: '!banner [@üye | ID]',
  category: 'info',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Kullanıcının profil bannerını gösterir.')
    .addUserOption(o => o.setName('üye').setDescription('Üye').setRequired(false)),

  async executeSlash(interaction, client) {
    const user     = interaction.options.getUser('üye') || interaction.user;
    const fetched  = await client.users.fetch(user.id, { force: true }).catch(() => null);
    const bannerUrl = fetched?.bannerURL({ dynamic: true, size: 4096 });
    if (!bannerUrl) return interaction.reply({ embeds: [errorEmbed('Bu kullanıcının bannerı yok.')], flags: 64 });
    const embed = new EmbedBuilder().setColor(config.colors.primary).setAuthor({ name: user.tag }).setImage(bannerUrl).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    const target = args[0] ? await findMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });
    const user = await client.users.fetch(target.id, { force: true }).catch(() => null);
    if (!user) return message.reply({ embeds: [errorEmbed('Kullanıcı bilgisi alınamadı.')] });

    const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });

    if (!bannerURL) {
      // Banner yoksa accent color göster
      const accentColor = user.accentColor;
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(accentColor || config.colors.primary)
          .setAuthor({ name: `${user.tag} — Banner`, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setDescription(`**${user.username}** kullanıcısının profil bannerı yok.`)
          .addFields(
            { name: '🎨 Profil Rengi', value: accentColor ? `\`#${accentColor.toString(16).toUpperCase().padStart(6, '0')}\`` : '`Yok`', inline: true },
          )
          .setFooter({ text: `ID: ${user.id}` })
          .setTimestamp()],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(user.accentColor || config.colors.primary)
      .setAuthor({ name: `${user.tag} — Profil Bannerı`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`[Banner Linkini Aç](${bannerURL})`)
      .setImage(bannerURL)
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
