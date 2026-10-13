const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("config").setDescription("Afficher la configuration actuelle"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const cfg=getGuildConfig(interaction.guildId);
      const lines=teams(interaction.guildId).map(t=>`${t.nom} (${t.id}) : salon <#${t.disposChannelId}>, rapports <#${t.reportChannelId}>, rôles ${(t.playerRoleIds||[]).length}, messages ${(t.dispoMessageIds||[]).filter(Boolean).length}/7`);
      return interaction.reply({content:`PRIME — Configuration\nAutomation globale : ${cfg.automations.enabled?"Activée":"Désactivée"}\n${lines.join("\n")}`,flags:MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][CONFIG]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
