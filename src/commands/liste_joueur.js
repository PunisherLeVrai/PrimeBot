const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("liste_joueurs").setDescription("Lister les joueurs du club"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      await interaction.guild.members.fetch();
      const cfg=getGuildConfig(interaction.guildId);
      const ids=new Set([...(cfg.playerRoleIds||[]),...teams(interaction.guildId).flatMap(t=>t.playerRoleIds||[])]);
      const players=[...interaction.guild.members.cache.values()].filter(m=>!m.user.bot&&[...ids].some(id=>m.roles.cache.has(id)));
      const {resolvePosts}=require("../core/memberDisplay");
      const lines=players.map(m=>`${m.displayName} — ${resolvePosts(m,cfg).join("/")||"Sans poste"}`).sort();
      return interaction.reply({content:`Effectif : ${players.length}\n${lines.slice(0,65).join("\n")}`,flags:MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][LISTE_JOUEURS]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
