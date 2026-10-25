const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, teams } = require("../core/staffTools");
const { embed, safe } = require("../core/primeTheme");
module.exports = {
  data: new SlashCommandBuilder().setName("health").setDescription("État de santé des services PRIME"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const me = interaction.guild.members.me || await interaction.guild.members.fetchMe();
      const lines = [];
      for (const t of teams(interaction.guildId)) {
        const channel = t.disposChannelId ? await interaction.guild.channels.fetch(t.disposChannelId).catch(() => null) : null;
        lines.push(`**${safe(t.nom || t.id, 60)}**  ·  Salon ${channel ? "OK" : "MANQUANT"}  ·  ${(t.dispoMessageIds || []).filter(Boolean).length}/7 messages`);
      }
      const card = embed("SYSTÈME  •  Diagnostic rapide", lines.join("\n") || "Aucune équipe configurée.")
        .addFields({ name: "Connexion", value: me ? "Opérationnelle" : "Indisponible", inline: true },
          { name: "Gestion des rôles", value: me.permissions.has("ManageRoles") ? "Autorisée" : "Permission manquante", inline: true },
          { name: "Latence API", value: `${Math.round(interaction.client.ws.ping)} ms`, inline: true });
      return interaction.editReply({ embeds: [card] });
    } catch (error) {
      console.error("[PRIME][HEALTH]", error);
      return interaction.editReply({ content: "Diagnostic indisponible." });
    }
  },
};
