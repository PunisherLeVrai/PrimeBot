// src/core/integrityMonitor.js
// Vérifications non destructives. Les anomalies seules sont rapportées.
const { PermissionFlagsBits } = require("discord.js");
const { exportAllConfig } = require("./guildConfig");
const { exportAllPseudos } = require("./pseudoStore");

async function inspectGuild(guild, config) {
  const problems = [];
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!me) return ["Impossible de récupérer le membre du bot."];
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) problems.push("Permission Gérer les rôles manquante");
  if (!me.permissions.has(PermissionFlagsBits.ReadMessageHistory)) problems.push("Permission Lire l'historique manquante");
  const teams = config.disponibilites || [];
  for (const team of teams) {
    const prefix = `[${team.nom || team.id}]`;
    for (const [label, id] of [["disponibilités", team.disposChannelId], ["rapports", team.reportChannelId]]) {
      const channel = id ? await guild.channels.fetch(id).catch(() => null) : null;
      if (!channel?.isTextBased?.()) problems.push(`${prefix} Salon ${label} introuvable`);
      else if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ViewChannel)) problems.push(`${prefix} Salon ${label} inaccessible`);
    }
    const channelId = team.checkDispoChannelId || team.disposChannelId;
    const channel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;
    if (channel?.isTextBased?.()) {
      for (const [day, id] of (team.dispoMessageIds || []).entries()) {
        if (!id) continue;
        if (!await channel.messages.fetch(id).catch(() => null)) problems.push(`${prefix} Message du jour ${day + 1} introuvable`);
      }
    }
    for (const id of [...(team.playerRoleIds || []), ...(team.automations?.avertissement?.roleIds || [])].filter(Boolean)) {
      const role = await guild.roles.fetch(id).catch(() => null);
      if (!role) problems.push(`${prefix} Rôle ${id} introuvable`);
      else if ((team.automations?.avertissement?.roleIds || []).includes(id) && !role.editable) problems.push(`${prefix} Avertissement ${role.name} non modifiable`);
    }
  }
  return [...new Set(problems)];
}

function orphanedGuildIds(client) {
  const known = new Set(client.guilds.cache.map(guild => guild.id));
  const stored = new Set([
    ...Object.keys(exportAllConfig().guilds || {}),
    ...Object.keys(exportAllPseudos().guilds || {}),
  ]);
  return [...stored].filter(id => !known.has(id));
}

module.exports = { inspectGuild, orphanedGuildIds };
