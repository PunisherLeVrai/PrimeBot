const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("health").setDescription("Contrôle rapide de santé du bot"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const cfg=getGuildConfig(interaction.guildId);
      const bot=interaction.guild.members.me;
      const lines=[];
      for(const t of teams(interaction.guildId)){
        const channel=await interaction.guild.channels.fetch(t.disposChannelId).catch(()=>null);
        const report=await interaction.guild.channels.fetch(t.reportChannelId).catch(()=>null);
        lines.push(`${t.nom}: salon ${channel?"OK":"ABSENT"}, rapports ${report?"OK":"ABSENT"}, IDs ${(t.dispoMessageIds||[]).filter(Boolean).length}/7`);
      }
      return interaction.reply({content:`Bot : ${bot?"OK":"ERREUR"}\nGérer les rôles : ${bot?.permissions.has("ManageRoles")?"OK":"ERREUR"}\n${lines.join("\n")}`,flags:MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][HEALTH]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
