// PRIME ESPORT — charte graphique commune pour toutes les interfaces Discord.
// Les embeds Discord ne permettent pas de fond noir personnalisé : la couleur de bordure
// et la hiérarchie du contenu sont les éléments réellement contrôlables.
const { EmbedBuilder } = require('discord.js');
const COLORS = Object.freeze({ gold: 0xD5AE55, blue: 0x315EAE, red: 0xC54E58, green: 0x36A886, dark: 0x151923 });
const FOOTER = 'PRIME ESPORT  •  PRIMEBOT 3.0';
function brandedEmbed() {
  return new EmbedBuilder().setColor(COLORS.gold).setFooter({ text: FOOTER });
}
function embed(title, description = '') {
  const e = brandedEmbed().setTitle(String(title).slice(0, 256));
  if (description) e.setDescription(String(description).slice(0, 4096));
  return e;
}
function success(title, description) { return embed(title, description).setColor(COLORS.green); }
function error(title, description) { return embed(title, description).setColor(COLORS.red); }
function safe(value, max = 1024) {
  return String(value ?? '—').replace(/@/g, '@\u200b').slice(0, max);
}
function pages(items, size = 12) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result.length ? result : [[]];
}
function section(name, value, inline = false) {
  return { name: safe(name, 256), value: safe(value || '—', 1024), inline };
}
function lines(value, max = 3900) { return safe(value || 'Aucune donnée disponible.', max); }
module.exports = { COLORS, GOLD: COLORS.gold, RED: COLORS.red, BLUE: COLORS.blue, brandedEmbed, embed, success, error, safe, pages, section, lines };
