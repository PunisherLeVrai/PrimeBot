// /prime : tableau de bord staff interactif, sans listener global ni état persistant.
const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, MessageFlags,
} = require("discord.js");
const { authorized, reject } = require("../core/staffTools");
const { snapshot } = require("../core/rosterService");
const { embed, safe, pages } = require("../core/primeTheme");
const { getPlayer, recordWarning } = require("../core/disciplineStore");
const { log } = require("../core/primeAudit");
const { teams } = require("../core/staffTools");
const { PermissionsBitField } = require("discord.js");
const { getUserPseudos } = require("../core/pseudoStore");

function menu(view, page, playerId, nonce) {
  const id = (action) => `prime3:${nonce}:${action}`;
  const nav = new ActionRowBuilder().addComponents(
    ...[["home", "Accueil"], ["players", "Joueurs"], ["posts", "Postes"], ["teams", "Équipes"], ["issues", "Contrôles"]]
      .map(([key, label]) => new ButtonBuilder().setCustomId(id(key)).setLabel(label)
        .setStyle(key === view ? ButtonStyle.Primary : ButtonStyle.Secondary))
  );
  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id("previous")).setLabel("◀ Précédent").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(id("next")).setLabel("Suivant ▶").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(id("profile")).setLabel("Fiche joueur").setStyle(ButtonStyle.Success).setDisabled(!playerId),
    new ButtonBuilder().setCustomId(id("discipline")).setLabel("Discipline").setStyle(ButtonStyle.Danger).setDisabled(!playerId),
  );
  const report = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id("weeklyReport")).setLabel("Publier rapport hebdo").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(id("refresh")).setLabel("Actualiser").setStyle(ButtonStyle.Secondary),
  );
  return [nav, actions, report];
}

function viewPayload(state, nonce) {
  const { roster, view, page, selected } = state;
  const { players, positions, teams, warnings } = roster;
  const rows = pages(players, 10);
  const index = Math.min(page, rows.length - 1);
  state.page = index;
  let card;
  let playerId = selected;
  if (view === "players") {
    card = embed("EFFECTIF  •  Annuaire des joueurs",
      rows[index].map((p, i) => `**${index * 10 + i + 1}.** <@${p.id}>  ·  ${safe(p.posts.join(" / ") || "Sans poste", 65)}${p.warning ? `  ·  A${p.warning}` : ""}`).join("\n") || "Aucun joueur enregistré.")
      .addFields({ name: "Pagination", value: `${index + 1} / ${rows.length}`, inline: true });
  } else if (view === "posts") {
    card = embed("EFFECTIF  •  Répartition par poste",
      Object.entries(positions).sort((a,b) => b[1] - a[1]).map(([post, n]) => `**${safe(post, 40)}**  —  ${n} joueur(s)`).join("\n") || "Aucun poste attribué.");
  } else if (view === "teams") {
    card = embed("EFFECTIF  •  Équipes", teams.map((t) => {
      const count = players.filter((p) => p.teamIds.includes(t.id)).length;
      return `**${safe(t.nom || t.name || t.id, 60)}**  —  ${count} joueur(s)`;
    }).join("\n") || "Aucune équipe configurée.");
  } else if (view === "issues") {
    const noPost = players.filter((p) => !p.posts.length);
    const noPseudo = players.filter((p) => !getUserPseudos(state.guildId, p.id)?.pseudo);
    const warningIds = [...new Set(teams.flatMap((t) => t.automations?.avertissement?.roleIds || []))].filter(Boolean);
    const multiple = players.filter((p) => warningIds.filter((id) => p.member.roles.cache.has(id)).length > 1);
    card = embed("EFFECTIF  •  Contrôle de cohérence", `**Sans poste :** ${noPost.length}\n**Sans pseudo enregistré :** ${noPseudo.length}\n**Rôles disciplinaires multiples :** ${multiple.length}`)
      .addFields({ name: "Détails", value: [...noPost.slice(0,8).map(p => `<@${p.id}> · sans poste`), ...multiple.slice(0,8).map(p => `<@${p.id}> · rôles multiples`)].join("\n") || "Aucune anomalie prioritaire.", inline: false });
  } else if (view === "profile" || view === "discipline") {
    const p = players.find((item) => item.id === selected);
    const warning = getPlayer(state.guildId, selected);
    card = embed(view === "profile" ? "JOUEUR  •  Fiche individuelle" : "DISCIPLINE  •  Suivi du joueur",
      p ? `<@${p.id}>\n**Postes :** ${safe(p.posts.join(" / ") || "Non renseignés")}\n**Rôle :** ${safe(p.mainRole)}\n**Avertissement :** ${warning.level ? `A${warning.level}` : "Aucun"}` : "Joueur introuvable dans l'effectif.")
      .addFields({ name: "Derniers événements", value: (warning.events || []).slice(-5).map(e => `${safe(e.at?.slice(0,10))} · A${e.from} → A${e.to}`).join("\n") || "Aucun historique." });
  } else {
    card = embed("DASHBOARD  •  Gestion de l'effectif", "Sélectionnez une rubrique ci-dessous pour accéder aux outils du staff.")
      .addFields(
        { name: "Joueurs", value: String(players.length), inline: true },
        { name: "Équipes", value: String(teams.length), inline: true },
        { name: "Joueurs avertis", value: String(warnings), inline: true },
        { name: "Postes couverts", value: String(Object.keys(positions).filter(p => p !== "SANS POSTE").length), inline: true },
        { name: "Sans poste", value: String(positions["SANS POSTE"] || 0), inline: true }
      );
  }
  const components = menu(view, index, playerId, nonce);
  if (players.length) {
    const choices = players.slice(0, 25).map(p => ({ label: p.name.slice(0,100), value: p.id, description: (p.posts.join(" / ") || "Sans poste").slice(0,100) }));
    components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId(`prime3:${nonce}:select`).setPlaceholder("Sélectionner un joueur (25 premiers)")
      .addOptions(choices)));
  }
  if (view === "discipline" && playerId) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prime3:${nonce}:warn`).setLabel("Ajouter un avertissement").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`prime3:${nonce}:reset`).setLabel("Réinitialiser").setStyle(ButtonStyle.Secondary)
    ));
  }
  return { embeds: [card], components, allowedMentions: { parse: [] } };
}

module.exports = {
  data: new SlashCommandBuilder().setName("prime").setDescription("Ouvrir le centre de gestion PRIME"),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    // Refuser la publication dans un salon visible par les joueurs.
    const everyone = interaction.guild.roles.everyone;
    if (interaction.channel.permissionsFor(everyone)?.has(PermissionsBitField.Flags.ViewChannel)) {
      return interaction.reply({ content: "Pour partager le dashboard, lance /prime dans un salon privé réservé au staff.", flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply();
    const roster = await snapshot(interaction.guild);
    const state = { roster, guildId: interaction.guildId, view: "home", page: 0, selected: null };
    const nonce = interaction.id;
    const response = await interaction.editReply(viewPayload(state, nonce));
    const collector = response.createMessageComponentCollector({ time: 10 * 60 * 1000 });
    collector.on("collect", async (button) => {
      if (!authorized(button)) {
        return button.reply({ content: "Cette interface est réservée au staff.", flags: MessageFlags.Ephemeral });
      }
      const action = button.customId.split(":")[2];
      try {
        if (action === "weeklyReport") {
          const { getGuildConfig } = require("../core/guildConfig");
          const { reportForGuild } = require("../core/weeklyRoster");
          const cfg = getGuildConfig(interaction.guildId);
          const channelId = cfg?.automations?.rapportEffectif?.channelId || cfg?.staffReportsChannelId;
          if (!channelId) return button.reply({ content: "Configure le salon du rapport dans /setup.", flags: MessageFlags.Ephemeral });
          await button.deferReply({ flags: MessageFlags.Ephemeral });
          try {
            const result = await reportForGuild(interaction.guild, channelId);
            return button.editReply(`Rapport publié dans <#${result.channelId}> pour ${result.players} joueurs.`);
          } catch (err) {
            return button.editReply(`Rapport non publié : ${err.message}`);
          }
        }
        if (action === "refresh") state.roster = await snapshot(interaction.guild);
        if (action === "select") {
          state.selected = button.values[0];
          state.view = "profile";
        } else if (["home", "players", "posts", "teams", "issues"].includes(action)) {
          state.view = action;
          state.page = 0;
        } else if (action === "next") {
          state.page += 1;
        } else if (action === "previous") {
          state.page = Math.max(0, state.page - 1);
        } else if (action === "profile" || action === "discipline") {
          state.view = action;
        } else if (action === "warn" || action === "reset") {
          const player = state.roster.players.find(p => p.id === state.selected);
          if (!player) return button.reply({ content: "Joueur introuvable.", flags: MessageFlags.Ephemeral });
          const current = getPlayer(interaction.guildId, player.id).level || 0;
          const next = action === "reset" ? 0 : Math.min(3, current + 1);
          const confirmation = await button.reply({
            content: `Confirmer ${action === "reset" ? "la remise à zéro" : `le passage au niveau A${next}`} pour <@${player.id}> ?`,
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`prime3:${nonce}:confirm:${action}:${player.id}`).setLabel("Confirmer").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`prime3:${nonce}:cancel`).setLabel("Annuler").setStyle(ButtonStyle.Secondary),
            )], flags: MessageFlags.Ephemeral, fetchReply: true, allowedMentions: { parse: [] },
          });
          try {
            const decision = await confirmation.awaitMessageComponent({
              filter: i => i.user.id === button.user.id && i.customId.startsWith(`prime3:${nonce}:`),
              time: 30000,
            });
            if (decision.customId.endsWith(":cancel")) return decision.update({ content: "Action annulée.", components: [] });
            const roleIds = [...new Set(teams(interaction.guildId).flatMap(t => t.automations?.avertissement?.roleIds || []))].filter(Boolean);
            const level = getPlayer(interaction.guildId, player.id).level || 0;
            const target = action === "reset" ? 0 : Math.min(3, level + 1);
            const targetRole = teams(interaction.guildId).map(t => t.automations?.avertissement?.roleIds?.[target - 1]).find(Boolean);
            if (target && !targetRole) return decision.update({ content: "Rôle cible non configuré. Aucune modification.", components: [] });
            const member = await interaction.guild.members.fetch(player.id);
            const bot = interaction.guild.members.me || await interaction.guild.members.fetchMe();
            const touched = [...new Set([...roleIds, ...(targetRole ? [targetRole] : [])])];
            if (!bot.permissions.has("ManageRoles") || touched.some(id => !interaction.guild.roles.cache.get(id)?.editable)) {
              return decision.update({ content: "Permissions ou hiérarchie des rôles insuffisantes. Aucune modification.", components: [] });
            }
            const roles = new Set(member.roles.cache.keys());
            for (const id of touched) roles.delete(id);
            if (targetRole) roles.add(targetRole);
            await member.roles.set([...roles], `PRIME : discipline modifiée par ${decision.user.id}`);
            recordWarning(interaction.guildId, player.id, target, { source: "dashboard", actor: decision.user.id });
            log(interaction.guildId, decision.user.id, action === "reset" ? "warning.reset" : "warning.raise", player.id, { from: level, to: target });
            state.roster = await snapshot(interaction.guild);
            await decision.update({ content: `Discipline de <@${player.id}> : ${target ? `A${target}` : "aucun avertissement"}.`, components: [], allowedMentions: { parse: [] } });
            return interaction.editReply(viewPayload(state, nonce));
          } catch (error) {
            if (error.code === "InteractionCollectorError") return;
            console.error("[PRIME][DISCIPLINE]", error);
            return button.editReply({ content: "Opération non terminée. Vérifie les permissions et l'historique.", components: [] }).catch(() => {});
          }
        }
        return button.update(viewPayload(state, nonce));
      } catch (error) {
        console.error("[PRIME][DASHBOARD]", error);
        if (!button.replied && !button.deferred) await button.reply({ content: "Impossible d'effectuer cette action.", flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    });
    collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
  },
};
