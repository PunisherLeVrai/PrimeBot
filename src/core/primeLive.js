// Lecture en direct des réactions : une erreur de lecture ne devient jamais une absence.
const { systems, DAYS } = require('./primeReminder');
async function liveStatus(guild, system, day) {
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new Error('Jour invalide.');
  const channelId = system.disposChannelId;
  const messageId = system.dispoMessageIds?.[day];
  if (!channelId || !messageId) throw new Error('Salon ou message de disponibilités manquant.');
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased?.() || !channel.messages?.fetch) throw new Error('Salon inaccessible.');
  const message = await channel.messages.fetch(messageId);
  const roleIds = system.playerRoleIds || [];
  if (!roleIds.length) throw new Error('Aucun rôle joueur configuré pour cette équipe.');
  const members = await guild.members.fetch();
  const players = [...members.values()].filter(m => !m.user.bot && roleIds.some(id => m.roles.cache.has(id)));
  const reacted = [new Set(), new Set()];
  for (const [i, emoji] of ['✅', '❌'].entries()) {
    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
    if (!reaction) continue;
    let after;
    while (true) {
      const batch = await reaction.users.fetch({ limit: 100, ...(after ? { after } : {}) });
      for (const user of batch.values()) reacted[i].add(user.id);
      after = batch.last()?.id;
      if (batch.size < 100 || !after) break;
    }
  }
  const yes = [], no = [], missing = [], conflicting = [];
  for (const m of players) {
    if (reacted[0].has(m.id) && reacted[1].has(m.id)) conflicting.push(m);
    else if (reacted[0].has(m.id)) yes.push(m);
    else if (reacted[1].has(m.id)) no.push(m);
    else missing.push(m);
  }
  return { channel, message, yes, no, missing, conflicting, total: players.length, system, day };
}
function mentionList(members, max = 18) {
  const list = members.slice(0, max).map(m => `<@${m.id}>`).join(' · ');
  return list + (members.length > max ? `\n… et ${members.length - max} autres` : '') || 'Aucun';
}
async function sendLiveReminder(report, delivery) {
  if (!['salon','mp','both'].includes(delivery)) throw new Error('Mode de rappel invalide.');
  const recipients = report.missing;
  if (!recipients.length) return { sent: 0, failed: 0, channelId: report.channel.id };
  const link = `https://discord.com/channels/${report.message.guildId}/${report.channel.id}/${report.message.id}`;
  const text = `**PRIME ESPORT · RAPPEL DISPONIBILITÉS**\n**${report.system.nom || 'Équipe'} — ${DAYS[report.day]}**\nMerci de répondre par ✅ ou ❌.\n${link}`;
  let sent = 0, failed = 0;
  if (delivery === 'salon' || delivery === 'both') {
    let chunk = text + '\n\n';
    for (const member of recipients) {
      const tag = `<@${member.id}> `;
      if (chunk.length + tag.length > 1900) {
        await report.channel.send({ content: chunk, allowedMentions: { users: recipients.map(m => m.id) } });
        chunk = '';
      }
      chunk += tag;
    }
    if (chunk.trim()) await report.channel.send({ content: chunk, allowedMentions: { users: recipients.map(m => m.id) } });
    sent = recipients.length;
  }
  if (delivery === 'mp' || delivery === 'both') {
    for (const member of recipients) {
      try { await member.send(text); sent++; } catch { failed++; }
    }
  }
  return { sent, failed, channelId: report.channel.id };
}
module.exports = { liveStatus, mentionList, sendLiveReminder, systems, DAYS };
