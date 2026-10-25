// Audit append-only : aucune donnée de jeton, aucun contenu de message.
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "config", "primeAudit.jsonl");
function log(guildId, actorId, action, targetId, details = {}) {
  const event = { at: new Date().toISOString(), guildId, actorId, action, targetId, details };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(event) + "\n", "utf8");
  } catch (error) { console.error("[PRIME][AUDIT]", error); }
}
module.exports = { log };
