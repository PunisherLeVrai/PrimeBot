const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("sync_roles").setDescription("Contrôler la cohérence des rôles et pseudos"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      await interaction.guild.members.fetch();
      const cfg=getGuildConfig(interaction.guildId);
      const ids=new Set(teams(interaction.guildId).flatMap(t=>t.playerRoleIds||[]));
      const {resolvePosts}=require("../core/memberDisplay");
      const {getUserPseudos}=require("../core/pseudoStore");
      const issues=[];
      for(const m of interaction.guild.members.cache.values()){
        if(m.user.bot||![...ids].some(id=>m.roles.cache.has(id)))continue;
        const posts=resolvePosts(m,cfg);
        if(!posts.length)issues.push(`${m.displayName}: sans poste`);
        if(!getUserPseudos(interaction.guildId,m.id)?.pseudo)issues.push(`${m.displayName}: sans pseudo enregistré`);
        const roles=[...new Set(teams(interaction.guildId).flatMap(t=>t.automations?.avertissement?.roleIds||[]))].filter(Boolean);
        if(roles.filter(id=>m.roles.cache.has(id)).length>1)issues.push(`${m.displayName}: plusieurs rôles avertissement`);
      }
      return interaction.reply({content:issues.slice(0,60).join("\n")||"Aucune anomalie détectée.",flags:MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][SYNC_ROLES]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
