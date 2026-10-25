const { requireStaffChannel } = require("../core/staffVisibility");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { authorized, reject } = require("../core/staffTools");
const { snapshot } = require("../core/rosterService");
const { embed, safe, pages } = require("../core/primeTheme");
module.exports = {
  data: new SlashCommandBuilder().setName("liste_joueurs").setDescription("Annuaire de l'effectif PRIME")
    .addIntegerOption(o => o.setName("page").setDescription("Numéro de page").setMinValue(1)),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    if (!await requireStaffChannel(interaction)) return;
    await interaction.deferReply();
    try {
      const data = await snapshot(interaction.guild);
      const chunks = pages(data.players, 15);
      const page = Math.min(Math.max(1, interaction.options.getInteger("page") || 1), chunks.length);
      const text = chunks[page - 1].map(p => `<@${p.id}>  ·  ${safe(p.posts.join(" / ") || "Sans poste", 70)}`).join("\n");
      return interaction.editReply({ embeds: [embed("EFFECTIF  •  Annuaire", text || "Aucun joueur.")
        .addFields({ name: "Page", value: `${page} / ${chunks.length}`, inline: true },
          { name: "Total", value: String(data.players.length), inline: true })], allowedMentions: { parse: [] } });
    } catch (error) {
      console.error("[PRIME][LISTE_JOUEURS]", error);
      return interaction.editReply({ content: "Impossible de charger l'annuaire." });
    }
  },
};
