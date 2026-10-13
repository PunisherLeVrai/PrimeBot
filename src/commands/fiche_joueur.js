const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("fiche_joueur").setDescription("Consulter la fiche d’un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(true)),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const user = interaction.options.getUser("joueur");
      const member = await interaction.guild.members.fetch(user.id);
      const discipline = require("../core/disciplineStore").getPlayer(interaction.guildId,user.id);
      const pseudo = require("../core/pseudoStore").getUserPseudos(interaction.guildId,user.id);
      const { resolvePosts, resolveMainRole } = require("../core/memberDisplay");
      const cfg = getGuildConfig(interaction.guildId);
      const history = require("../core/dispoHistory").getGuild(interaction.guildId);
      const today = new Date().toLocaleDateString("en-CA");
      const statuses = Object.entries(history).map(([name,days]) => {
        const d = days[today];
        return `${name}: ${!d ? "Non archivé" : d.yes.includes(user.id) ? "Présent" : d.no.includes(user.id) ? "Absent" : "Sans réponse"}`;
      });
      return interaction.reply({ embeds:[new EmbedBuilder().setTitle(`Fiche — ${member.displayName}`)
        .addFields({name:"Discord",value:`<@${user.id}>`},{name:"Rôle",value:resolveMainRole(member,cfg)||"—"},
          {name:"Postes",value:resolvePosts(member,cfg).join(" / ")||"—"},
          {name:"Avertissements",value:`${discipline.level}/3 — ${discipline.updatedAt||"Jamais"}`},
          {name:"Pseudo enregistré",value:pseudo?.pseudo||"—"},
          {name:"Disponibilités",value:statuses.join("\n")||"Pas encore d'archives"})],
        flags:MessageFlags.Ephemeral });
    } catch (error) {
      console.error("[PRIME][FICHE_JOUEUR]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
