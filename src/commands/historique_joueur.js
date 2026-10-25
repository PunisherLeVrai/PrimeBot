const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("historique_joueur").setDescription("Historique des disponibilités d’un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(true)),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const user = interaction.options.getUser("joueur");
      const history = require("../core/dispoHistory").getGuild(interaction.guildId);
      const lines = Object.entries(history).flatMap(([name,days]) => Object.entries(days)
        .filter(([,d]) => d.players?.includes(user.id))
        .map(([day,d]) => `${day} | ${name} | ${d.yes.includes(user.id) ? "Présent" : d.no.includes(user.id) ? "Absent" : "Sans réponse"}`))
        .sort().reverse().slice(0,30);
      return interaction.reply({ content: `${user}\n${lines.join("\n") || "Aucun historique archivé."}`,
        flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error("[PRIME][HISTORIQUE_JOUEUR]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
