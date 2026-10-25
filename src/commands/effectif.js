const { requireStaffChannel } = require("../core/staffVisibility");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { authorized, reject } = require("../core/staffTools");
const { snapshot } = require("../core/rosterService");
const { embed, safe } = require("../core/primeTheme");
module.exports = {
  data: new SlashCommandBuilder().setName("effectif").setDescription("Tableau de bord de l'effectif PRIME"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    if (!await requireStaffChannel(interaction)) return;
    await interaction.deferReply();
    try {
      const data = await snapshot(interaction.guild);
      const lines = Object.entries(data.positions).sort((a,b) => b[1]-a[1])
        .map(([post, count]) => `**${safe(post, 40)}** · ${count}`).join("\n");
      return interaction.editReply({ embeds: [embed("EFFECTIF  •  Vue générale", lines || "Aucun joueur détecté.")
        .addFields({ name: "Joueurs", value: String(data.players.length), inline: true },
          { name: "Équipes", value: String(data.teams.length), inline: true },
          { name: "Avertis", value: String(data.warnings), inline: true },
          { name: "Gestion interactive", value: "Utilisez `/prime` pour ouvrir le dashboard." })] });
    } catch (error) {
      console.error("[PRIME][EFFECTIF]", error);
      return interaction.editReply({ content: "Impossible de charger l'effectif." });
    }
  },
};
