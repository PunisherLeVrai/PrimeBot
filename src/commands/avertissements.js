const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { authorized, reject, team, teams } = require("../core/staffTools");
const { getGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder().setName("avertissements").setDescription("Gérer les avertissements des joueurs")
    .addStringOption(o => o.setName("action").setDescription("Action").setRequired(true)
      .addChoices({name:"Voir tous",value:"tous"},{name:"Consulter",value:"voir"},
        {name:"Retirer un niveau",value:"retirer"},{name:"Remettre à zéro",value:"reset"}))
    .addUserOption(o => o.setName("joueur").setDescription("Joueur concerné")),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    try {
      const store = require("../core/disciplineStore");
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("joueur");
      if (action === "tous") {
        const players = Object.entries(store.listPlayers(interaction.guildId))
          .filter(([,p]) => p.level > 0);
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Avertissements — serveur")
          .setDescription(players.length ? players.slice(0,50).map(([id,p]) =>
            `<@${id}> | A${p.level} | ${p.updatedAt?.slice(0,10) || "—"}`).join("\n") : "Aucun avertissement enregistré.")],
          flags: MessageFlags.Ephemeral });
      }
      if (!user) return interaction.reply({ content: "Sélectionne un joueur.", flags: MessageFlags.Ephemeral });
      const p = store.getPlayer(interaction.guildId, user.id);
      if (action === "voir") return interaction.reply({ content:
        `${user} | ${p.level ? `A${p.level}` : "Aucun"} | ${p.updatedAt || "—"}\n` +
        p.events.slice(-8).map(e => `${e.at.slice(0,10)} : A${e.from} → A${e.to} (${e.source || "staff"})`).join("\n"),
        flags: MessageFlags.Ephemeral });
      const member = await interaction.guild.members.fetch(user.id);
      const cfg = getGuildConfig(interaction.guildId);
      const ids = [...new Set(teams(interaction.guildId).flatMap(t =>
        t.automations?.avertissement?.roleIds || []))].filter(Boolean);
      const currentLevel = Math.max(
        p.level || 0,
        ...ids.map((id, index) => member.roles.cache.has(id) ? (index % 3) + 1 : 0)
      );
      const target = action === "reset" ? 0 : Math.max(0, currentLevel - 1);
      for (const id of ids) if (member.roles.cache.has(id)) await member.roles.remove(id);
      const role = teams(interaction.guildId)
        .map(t => t.automations?.avertissement?.roleIds?.[target - 1])
        .find(Boolean);
      if (target && !role) throw new Error("Rôle avertissement cible non configuré");
      if (target && role) await member.roles.add(role);
      store.recordWarning(interaction.guildId, user.id, target, {source:"staff", actor:interaction.user.id});
      return interaction.reply({ content: `${user} : niveau A${target} enregistré.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error("[PRIME][AVERTISSEMENTS]", error);
      const payload = { content: "Erreur pendant l'exécution.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
      return interaction.reply(payload);
    }
  },
};
