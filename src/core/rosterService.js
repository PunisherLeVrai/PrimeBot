// Source de vérité de l'effectif : rôles Discord + configuration existante.
const { getGuildConfig } = require("./guildConfig");
const { resolvePosts, resolveMainRole } = require("./memberDisplay");
const { getPlayer } = require("./disciplineStore");
const { teams } = require("./staffTools");

async function snapshot(guild) {
  await guild.members.fetch();
  const cfg = getGuildConfig(guild.id);
  const teamConfigs = teams(guild.id);
  const roleIds = [...new Set([
    ...(cfg.playerRoleIds || []),
    ...teamConfigs.flatMap((t) => t.playerRoleIds || []),
  ].filter(Boolean).map(String))];
  const members = [...guild.members.cache.values()].filter((member) =>
    !member.user.bot && roleIds.some((id) => member.roles.cache.has(id))
  );
  const players = members.map((member) => ({
    member,
    id: member.id,
    name: member.displayName,
    posts: resolvePosts(member, cfg),
    mainRole: resolveMainRole(member, cfg) || "—",
    warning: getPlayer(guild.id, member.id).level || 0,
    teamIds: teamConfigs.filter((t) => (t.playerRoleIds || []).some((id) => member.roles.cache.has(id))).map((t) => t.id),
  })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const positions = {};
  for (const player of players) {
    const post = player.posts[0] || "SANS POSTE";
    positions[post] = (positions[post] || 0) + 1;
  }
  return { cfg, teams: teamConfigs, players, positions, warnings: players.filter((p) => p.warning > 0).length };
}
module.exports = { snapshot };
