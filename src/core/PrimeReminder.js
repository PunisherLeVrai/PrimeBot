// Assistant de rappel /prime : sélection d'un système et contrôle des réactions.
const { getGuildConfig } = require('./guildConfig');
const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
function systems(guildId) {
  const cfg = getGuildConfig(guildId) || {};
  const list = Array.isArray(cfg.disponibilites) ? cfg.disponibilites : [];
  return list.length ? list : [{ id: 'default', nom: 'Équipe par défaut', disposChannelId: cfg.disposChannelId, playerRoleIds: cfg.playerRoleIds || [], dispoMessageIds: cfg.dispoMessageIds || [] }];
}
function getSystem(guildId, id) { return systems(guildId).find(s => String(s.id) === String(id)); }
async function missingPlayers(guild, system, day) {
  const channelId = system.disposChannelId;
  const messageId = system.dispoMessageIds?.[day];
  if (!channelId || !messageId) throw new Error('Salon ou message de disponibilités non configuré pour ce jour.');
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.messages?.fetch || !channel.isTextBased()) throw new Error('Salon de disponibilités inaccessible.');
  const message = await channel.messages.fetch(messageId);
  const roles = system.playerRoleIds || [];
  if (!roles.length) throw new Error('Aucun rôle joueur configuré pour cette équipe.');
  const members = await guild.members.fetch();
  const players = [...members.values()].filter(m => !m.user.bot && roles.some(id => m.roles.cache.has(id)));
  const answered = new Set();
  for (const emoji of ['✅','❌']) {
    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
    if (!reaction) continue;
    // Ne jamais interpréter une erreur de lecture comme une absence de réponse.
    let after;
    while (true) {
      const batch = await reaction.users.fetch({ limit: 100, ...(after ? { after } : {}) });
      for (const user of batch.values()) answered.add(user.id);
      after = batch.last()?.id;
      if (batch.size < 100 || !after) break;
    }
  }
  return { channel, message, players: players.filter(m => !answered.has(m.id)), total: players.length };
}
async function sendReminder(result, system, day, actorId) {
  const missing = result.players;
  if (!missing.length) return { count: 0, channelId: result.channel.id };
  const header = `**PRIME ESPORT | RAPPEL DISPONIBILITÉS**\n**${system.nom || 'Équipe'} · ${DAYS[day]}**\nMerci de répondre par ✅ ou ❌ sur le message de disponibilités.\n`;
  const link = `https://discord.com/channels/${result.message.guildId}/${result.channel.id}/${result.message.id}`;
  const mentions = missing.map(m => `<@${m.id}>`);
  // Discord limite chaque message à 2000 caractères.
  let chunk = header + `\n${link}\n\n`;
  for (const mention of mentions) {
    if ((chunk + mention + ' ').length > 1900) { await result.channel.send({ content: chunk, allowedMentions: { users: missing.map(m => m.id) } }); chunk = ''; }
    chunk += mention + ' ';
  }
  if (chunk.trim()) await result.channel.send({ content: chunk, allowedMentions: { users: missing.map(m => m.id) } });
  return { count: missing.length, channelId: result.channel.id };
}
module.exports = { DAYS, systems, getSystem, missingPlayers, sendReminder };
