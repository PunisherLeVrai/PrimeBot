const { embed } = require("../core/primeTheme");
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("dispo_resume").setDescription("Résumé des disponibilités archivées"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const history=require("../core/dispoHistory").getGuild(interaction.guildId);
      const today=new Date().toLocaleDateString("en-CA");
      const lines=Object.entries(history).map(([name,days])=>{
        const d=days[today];return `${name} : ${d ? `Présents ${d.yes.length}, absents ${d.no.length}, sans réponse ${d.missing.length}` : "Pas encore archivé"}`;
      });
      return interaction.reply({embeds: [embed("DISPONIBILITÉS  |  Synthèse quotidienne", `**Date :** ${today}\n\n${lines.join("\n") || "Aucune donnée archivée."}`)], flags: MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][DISPO_RESUME]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
