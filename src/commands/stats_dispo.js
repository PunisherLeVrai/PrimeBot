const { embed } = require("../core/primeTheme");
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("stats_dispo").setDescription("Statistiques de présence archivées")
    .addIntegerOption(o => o.setName("jours").setDescription("Période").addChoices(
      {name:"7 jours",value:7},{name:"30 jours",value:30},{name:"Saison",value:365}).setRequired(true)),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const days = interaction.options.getInteger("jours");
      const history = require("../core/dispoHistory").getGuild(interaction.guildId);
      const min = new Date(Date.now()-days*86400000).toISOString().slice(0,10);
      const scores = new Map(); let records=0;
      for (const entries of Object.values(history)) for (const [date,d] of Object.entries(entries)) {
        if (date < min) continue;
        records++;
        for (const id of d.players || []) {
          const s=scores.get(id)||{yes:0,no:0,missing:0};
          if (d.yes.includes(id)) s.yes++;
          else if (d.no.includes(id)) s.no++;
          else s.missing++;
          scores.set(id,s);
        }
      }
      const lines=[...scores].sort((a,b)=>(b[1].yes+b[1].no)/(b[1].yes+b[1].no+b[1].missing)-(a[1].yes+a[1].no)/(a[1].yes+a[1].no+a[1].missing))
        .slice(0,30).map(([id,s])=>{const n=s.yes+s.no+s.missing;return `<@${id}> : ${Math.round(100*(s.yes+s.no)/n)}% | Présent ${s.yes} | Absent ${s.no} | Oubli ${s.missing}`;});
      return interaction.reply({embeds: [embed("STATISTIQUES  |  Disponibilités", `**Période :** ${days} jours\n**Journées / équipes archivées :** ${records}\n\n${lines.join("\n") || "Aucune donnée."}`)], flags: MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][STATS_DISPO]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
