// Archives journalières des disponibilités par serveur et par équipe.
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "config", "dispoHistory.json");
function read() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return { guilds: {} }; }
}
function archive(guildId, availabilityId, day, snapshot) {
  const data = read();
  const guild = data.guilds[guildId] ||= {};
  const team = guild[availabilityId] ||= {};
  team[day] = { ...snapshot, archivedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temporary = `${FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporary, FILE);
  return team[day];
}
function getGuild(guildId) { return read().guilds[guildId] || {}; }
module.exports = { archive, getGuild };
