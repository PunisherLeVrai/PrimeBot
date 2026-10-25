// Rapport hebdomadaire de l'effectif : source unique = rôles Discord.
const { snapshot } = require('./rosterService');
const { embed, safe } = require('./primeTheme');
const { getGuildConfig, upsertGuildConfig } = require('./guildConfig');
const { PermissionsBitField } = require('discord.js');

function parisParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function weekKey(parts) {
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date - start) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
function groupPlayers(players) {
  const groups = new Map();
  for (const player of players) {
    const posts = [...new Set((player.posts || []).filter(Boolean))];
    for (const post of posts.length ? posts : ['SANS POSTE']) {
      if (!groups.has(post)) groups.set(post, []);
      groups.get(post).push(player);
    }
  }
  return [...groups.entries()].sort(([a], [b]) => a === 'SANS POSTE' ? 1 : b === 'SANS POSTE' ? -1 : a.localeCompare(b, 'fr'));
}
function buildReport(roster, guildName, now = new Date()) {
  const groups = groupPlayers(roster.players);
  const totalPosts = groups.reduce((sum, [, players]) => sum + players.length, 0);
  const first = embed('PRIME ESPORT  •  Rapport hebdomadaire de l’effectif',
    `**${safe(guildName, 90)}** · Semaine **${weekKey(parisParts(now))}**\n` +
    `**Joueurs uniques :** ${roster.players.length}  ·  **Postes représentés :** ${groups.filter(([post]) => post !== 'SANS POSTE').length}\n` +
    `**Affectations par poste :** ${totalPosts}  ·  **Sans poste :** ${groups.find(([post]) => post === 'SANS POSTE')?.[1].length || 0}\n\n` +
    'Un joueur polyvalent figure dans chacun de ses postes. Les totaux uniques ne le comptent qu’une fois.');
  const messages = [{ embeds: [first], allowedMentions: { parse: [] } }];
  // Discord limite un embed à 4096 caractères de description.
  let buffer = '';
  function flush() {
    if (!buffer) return;
    messages.push({ embeds: [embed('PRIME ESPORT  •  Joueurs par poste', buffer)], allowedMentions: { parse: [] } });
    buffer = '';
  }
  for (const [post, players] of groups) {
    const header = `\n**${safe(post, 70)} — ${players.length} joueur(s)**\n`;
    if (buffer.length + header.length > 3600) flush();
    buffer += header;
    for (const player of players) {
      const teamNames = (roster.teams || []).filter(t => player.teamIds.includes(t.id)).map(t => safe(t.nom || t.name || t.id, 25));
      const line = `• ${safe(player.name, 60)} (<@${player.id}>)${teamNames.length ? ` · ${teamNames.join(', ')}` : ''}\n`;
      if (buffer.length + line.length > 3600) flush();
      buffer += line.slice(0, 900);
    }
  }
  flush();
  if (!groups.length) messages.push({ embeds: [embed('Effectif', 'Aucun joueur trouvé avec les rôles configurés.')], allowedMentions: { parse: [] } });
  return messages;
}
async function reportForGuild(guild, channelId, { now = new Date() } = {}) {
  const cfg = getGuildConfig(guild.id);
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.() || typeof channel.send !== 'function') throw new Error('Salon du rapport introuvable ou non textuel.');
  const everyone = guild.roles.everyone;
  if (channel.permissionsFor(everyone)?.has(PermissionsBitField.Flags.ViewChannel)) {
    throw new Error('Le salon choisi est visible par @everyone : publication refusée pour préserver le mode Staff.');
  }
  const me = guild.members.me || await guild.members.fetchMe();
  if (!channel.permissionsFor(me)?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
    throw new Error('Permissions insuffisantes pour publier le rapport.');
  }
  const roster = await snapshot(guild);
  const messages = buildReport(roster, guild.name, now);
  for (const payload of messages) await channel.send(payload);
  return { players: roster.players.length, messages: messages.length, channelId: channel.id };
}
const busy = new Set();
function startWeeklyRoster(client) {
  async function tick() {
    const now = new Date();
    const parts = parisParts(now);
    const days = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    for (const guild of client.guilds.cache.values()) {
      if (busy.has(guild.id)) continue;
      const cfg = getGuildConfig(guild.id);
      const r = cfg?.automations?.rapportEffectif;
      if (!cfg?.automations?.enabled || !r?.enabled || !r.channelId) continue;
      const key = weekKey(parts);
      if (r.lastSentKey === key || days[parts.weekday] !== r.day || `${parts.hour}:${parts.minute}` < r.time) continue;
      busy.add(guild.id);
      try {
        await reportForGuild(guild, r.channelId, { now });
        upsertGuildConfig(guild.id, { automations: { rapportEffectif: { ...r, lastSentKey: key } } });
      } catch (error) {
        console.error(`[PRIME][RAPPORT_HEBDO] ${guild.id}`, error);
      } finally { busy.delete(guild.id); }
    }
  }
  const timer = setInterval(() => tick().catch(console.error), 60_000);
  timer.unref?.();
  tick().catch(console.error);
  return timer;
}
module.exports = { buildReport, reportForGuild, startWeeklyRoster, parisParts, weekKey, groupPlayers };
