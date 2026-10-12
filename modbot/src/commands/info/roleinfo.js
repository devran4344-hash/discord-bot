const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { errorEmbed, discordTimestamp, getDangerousPermissions, getAllPermissions } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  name: 'roleinfo',
  aliases: ['rolbilgi','ri'],
  description: 'Rol bilgisi ve izinlerini gösterir.',
  usage: '!roleinfo <@rol | ID | isim>',
  category: 'info',
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Rol hakkında detaylı bilgi gösterir.')
    .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)),

  async executeSlash(interaction, client) {
    const role = interaction.options.getRole('rol');
    const dangerous = getDangerousPermissions ? getDangerousPermissions(role.permissions) : [];
    const embed = new EmbedBuilder()
      .setColor(role.color || config.colors.primary)
      .setTitle(`🎭 ${role.name}`)
      .addFields(
        { name: '🆔 ID',        value: `\`${role.id}\``,                                         inline: true },
        { name: '👥 Üye',       value: `\`${role.members.size}\``,                               inline: true },
        { name: '📅 Oluşturma', value: discordTimestamp(role.createdAt, 'R'),                    inline: true },
        { name: '🎨 Renk',      value: `\`${role.hexColor}\``,                                   inline: true },
        { name: '📌 Hoist',     value: role.hoist ? 'Evet' : 'Hayır',                            inline: true },
        { name: '🔔 Mention',   value: role.mentionable ? 'Evet' : 'Hayır',                      inline: true },
        ...(dangerous.length ? [{ name: '⚠️ Tehlikeli İzinler', value: dangerous.join(', '), inline: false }] : []),
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Bir rol belirtmelisin.')] });
    let role = message.mentions.roles.first();
    if (!role) {
      const q = args.join(' ').toLowerCase().replace(/[<@&>]/g, '');
      role = message.guild.roles.cache.get(q) ||
             message.guild.roles.cache.find(r => r.name.toLowerCase() === q || r.name.toLowerCase().includes(q));
    }
    if (!role) return message.reply({ embeds: [errorEmbed('Rol bulunamadı.')] });

    const memberCount = message.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;
    const dangerous   = getDangerousPermissions(role.permissions);
    const { has }     = getAllPermissions(role.permissions);

    const embed = new EmbedBuilder()
      .setColor(role.color || config.colors.primary)
      .setAuthor({ name: `${role.name} — Rol Bilgisi`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .addFields(
        {
          name: '📋 Genel',
          value: [
            `> 🏷️ **İsim:** ${role}`,
            `> 🆔 **ID:** \`${role.id}\``,
            `> 🎨 **Renk:** \`${role.hexColor}\``,
            `> 📊 **Pozisyon:** \`${role.position}\``,
            `> 👥 **Sahip:** \`${memberCount}\` üye`,
            `> 📅 **Oluşturuldu:** ${discordTimestamp(role.createdAt, 'D')}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚙️ Özellikler',
          value: [
            `> 👁️ **Ayrı Göster:** ${role.hoist ? '✅' : '❌'}`,
            `> 📣 **Etiketlenebilir:** ${role.mentionable ? '✅' : '❌'}`,
            `> 🤖 **Yönetilen:** ${role.managed ? '✅' : '❌'}`,
            `> 🌐 **Evrensel:** ${role.id === message.guild.id ? '✅' : '❌'}`,
          ].join('\n'),
          inline: true,
        },
        ...(dangerous.length > 0 ? [{
          name: '🚨 TEHLİKELİ İZİNLER',
          value: `\`\`\`${dangerous.map(p => `• ${p}`).join('\n')}\`\`\``,
          inline: false,
        }] : []),
        ...(has.length > 0 ? [{
          name: `✅ İzinler (${has.length})`,
          value: has.slice(0, 20).join('\n') + (has.length > 20 ? `\n*... ve ${has.length - 20} tane daha*` : ''),
          inline: false,
        }] : [{ name: 'ℹ️ İzinler', value: 'Bu rolün hiç izni yok.', inline: false }]),
      )
      .setFooter({ text: `Rol ID: ${role.id}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
