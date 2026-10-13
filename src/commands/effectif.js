const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("effectif").setDescription("Répartition des joueurs par poste"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      await interaction.guild.members.fetch();
      const cfg=getGuildConfig(interaction.guildId);
      const ids=new Set([...(cfg.playerRoleIds||[]),...teams(interaction.guildId).flatMap(t=>t.playerRoleIds||[])]);
      const players=[...interaction.guild.members.cache.values()].filter(m=>!m.user.bot&&[...ids].some(id=>m.roles.cache.has(id)));
      const {resolvePosts}=require("../core/memberDisplay");
      const groups={GK:[],DC:[],MDC:[],MG:[],MD:[],MC:[],MOC:[],BU:[],Autres:[]};
      for(const m of players){const post=resolvePosts(m,cfg)[0];(groups[post]||groups.Autres).push(m.displayName);}
      const lines=Object.entries(groups).map(([k,v])=>`${k} (${v.length}) : ${v.slice(0,20).join(", ")||"—"}`);
      return interaction.reply({content:`Effectif total : ${players.length}\n${lines.join("\n")}`,flags:MessageFlags.Ephemeral});
    } catch (error) {
      console.error("[PRIME][EFFECTIF]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
