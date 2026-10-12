const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { findMember, errorEmbed, isModerator } = require('../../utils/helpers');
const { removeWarning, getWarnings } = require('../../utils/database');
const config = require('../../config');

module.exports = {
  name: 'delwarn',
  aliases: ['uyarısil', 'removewarn', 'warnkaldır'],
  description: 'Kullanıcının belirli bir uyarısını siler.',
  usage: '!delwarn <@üye | ID> <uyarı-ID>',
  category: 'moderation',
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('Kullanıcının belirli bir uyarısını siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('üye').setDescription('Üye').setRequired(true))
    .addStringOption(o => o.setName('id').setDescription('Uyarı ID\'si (!warnings ile öğren)').setRequired(true)),

  async executeSlash(interaction, client) {
    if (!isModerator(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Moderatör gerekli.')], flags: 64 });
    const user    = interaction.options.getUser('üye');
    const warnId  = interaction.options.getString('id');
    const updated = await removeWarning(interaction.guild.id, user.id, warnId);
    await interaction.reply({ content: `✅ Uyarı silindi. <@${user.id}> kalan uyarı: **${updated.length}**`, flags: 64 });
  },

  async execute(message, args, client) {
    if (!isModerator(message.member))
      return message.reply({ embeds: [errorEmbed('Bu komutu kullanmak için moderatör olman gerekiyor.')] });
    if (!args[0] || !args[1])
      return message.reply({ embeds: [errorEmbed('Kullanıcı ve uyarı ID\'si belirtmelisin.')] });

    const target = await findMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Kullanıcı bulunamadı.')] });

    const warnId   = args[1];
    const before   = await getWarnings(message.guild.id, target.id);
    const exists   = before.find(w => w.id === warnId);

    if (!exists)
      return message.reply({ embeds: [errorEmbed(`\`${warnId}\` ID'li uyarı bulunamadı.\nDoğru ID için \`!warnings @${target.user.username}\` kullan.`)] });

    const updated = await removeWarning(message.guild.id, target.id, warnId);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({ name: '🧹 Uyarı Silindi', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı',     value: `<@${target.id}> \`(${target.id})\``, inline: true },
        { name: '🆔 Silinen Uyarı', value: `\`${warnId}\``,                       inline: true },
        { name: '📋 Silinen Sebep', value: exists.reason,                         inline: false },
        { name: '🔢 Kalan Uyarı',   value: `\`${updated.length}\``,               inline: true },
        { name: '👮 Yetkili',       value: message.author.tag,                    inline: true },
        { name: '📅 Tarih',         value: discordTimestamp(new Date(), 'R'),     inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendLog(message.guild, 'modLog', new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🧹 Uyarı Silindi')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${target.id}>\n\`${target.id}\``,               inline: true },
        { name: '👮 Yetkili',   value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
        { name: '🆔 Uyarı ID',  value: `\`${warnId}\``,                                   inline: true },
        { name: '📋 Sebep',     value: exists.reason,                                      inline: false },
      )
      .setTimestamp());
  },
};
