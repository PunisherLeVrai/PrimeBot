// Publication staff uniquement : ne jamais afficher des informations internes
// dans un salon visible par le rôle @everyone.
const { MessageFlags, PermissionsBitField } = require('discord.js');
async function requireStaffChannel(interaction) {
  const channel = interaction.channel;
  const everyone = interaction.guild?.roles?.everyone;
  if (!channel || !everyone || channel.permissionsFor(everyone)?.has(PermissionsBitField.Flags.ViewChannel)) {
    await interaction.reply({ content: 'Cette commande partagée doit être utilisée dans un salon privé réservé au staff.', flags: MessageFlags.Ephemeral });
    return false;
  }
  return true;
}
module.exports = { requireStaffChannel };
