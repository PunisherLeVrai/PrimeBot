// Historique disciplinaire commun au serveur ; traitement distinct par équipe.
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "config", "discipline.json");

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return data && typeof data === "object" ? data : { guilds: {} };
  } catch {
    return { guilds: {} };
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temporary = `${FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporary, FILE);
}

function ensureGuild(data, guildId) {
  data.guilds ||= {};
  const guild = data.guilds[String(guildId)] ||= { players: {} };
  guild.players ||= {};
  guild.processedTeams ||= {};
  return guild;
}

function getProcessedDate(guildId, availabilityId = "principal") {
  const guild = read().guilds?.[String(guildId)];
  return guild?.processedTeams?.[String(availabilityId)] || null;
}

function setProcessedDate(guildId, date, availabilityId = "principal") {
  const data = read();
  ensureGuild(data, guildId).processedTeams[String(availabilityId)] = date;
  write(data);
}

function getPlayer(guildId, userId) {
  return read().guilds?.[String(guildId)]?.players?.[String(userId)] ||
    { level: 0, updatedAt: null, events: [] };
}

function listPlayers(guildId) {
  return read().guilds?.[String(guildId)]?.players || {};
}

function wasPlayerProcessed(guildId, userId, date) {
  return getPlayer(guildId, userId).lastProcessedDate === date;
}

function markPlayerProcessed(guildId, userId, date, availabilityId) {
  const data = read();
  const guild = ensureGuild(data, guildId);
  const player = guild.players[String(userId)] ||= { level: 0, events: [] };
  player.lastProcessedDate = date;
  player.lastProcessedAvailabilityId = availabilityId;
  write(data);
}

function recordWarning(guildId, userId, level, meta = {}) {
  const data = read();
  const guild = ensureGuild(data, guildId);
  const player = guild.players[String(userId)] ||= { level: 0, events: [] };
  const previous = player.level || 0;
  player.level = Math.max(0, Math.min(3, Number(level) || 0));
  player.updatedAt = new Date().toISOString();
  player.events ||= [];
  player.events.push({ at: player.updatedAt, from: previous, to: player.level, ...meta });
  write(data);
  return player;
}

module.exports = {
  getProcessedDate, setProcessedDate, getPlayer, listPlayers,
  wasPlayerProcessed, markPlayerProcessed, recordWarning,
};
