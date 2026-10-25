const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const { getGuildConfig } = require("./guildConfig");
function authorized(interaction) {
  const cfg = getGuildConfig(interaction.guildId);
  const roles = cfg?.staffRoleIds || [];
  return interaction.inGuild() && (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    roles.some(id => interaction.member.roles.cache.has(id)));
}
async function reject(interaction) {
  return interaction.reply({ content: "Accès réservé au staff.", flags: MessageFlags.Ephemeral });
}
function teams(guildId) { return getGuildConfig(guildId)?.disponibilites || []; }
function team(guildId, id) {
  const values = teams(guildId);
  return values.find(item => item.id === id) || values[0] || null;
}
module.exports = { authorized, reject, teams, team };
