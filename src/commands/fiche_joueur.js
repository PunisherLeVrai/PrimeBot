const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { authorized, reject } = require("../core/staffTools");
const { snapshot } = require("../core/rosterService");
const { embed, safe } = require("../core/primeTheme");
const { getPlayer } = require("../core/disciplineStore");
const { getUserPseudos } = require("../core/pseudoStore");
module.exports = {
  data: new SlashCommandBuilder().setName("fiche_joueur").setDescription("Profil détaillé d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur concerné").setRequired(true)),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const user = interaction.options.getUser("joueur");
      const data = await snapshot(interaction.guild);
      const player = data.players.find(p => p.id === user.id);
      if (!player) return interaction.editReply({ content: "Ce membre n'appartient pas à l'effectif configuré." });
      const discipline = getPlayer(interaction.guildId, user.id);
      const pseudo = getUserPseudos(interaction.guildId, user.id);
      return interaction.editReply({ embeds: [embed(`JOUEUR  •  ${safe(player.name, 150)}`, `<@${user.id}>`)
        .addFields(
          { name: "Postes", value: safe(player.posts.join(" / ") || "Non renseignés"), inline: true },
          { name: "Rôle", value: safe(player.mainRole), inline: true },
          { name: "Équipes", value: String(player.teamIds.length), inline: true },
          { name: "Pseudo", value: safe(pseudo?.pseudo || "—"), inline: true },
          { name: "Discipline", value: discipline.level ? `A${discipline.level}` : "Aucun avertissement", inline: true },
          { name: "Dernière modification", value: safe(discipline.updatedAt?.slice(0,10) || "—"), inline: true },
        ).setThumbnail(user.displayAvatarURL())], allowedMentions: { parse: [] } });
    } catch (error) {
      console.error("[PRIME][FICHE_JOUEUR]", error);
      return interaction.editReply({ content: "Impossible de charger cette fiche." });
    }
  },
};
