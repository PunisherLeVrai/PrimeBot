// src/commands/automations_plus.js
// Réglages complémentaires, sans modification des autres automations.
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { authorized, reject } = require("../core/staffTools");
const { getGuildConfig, upsertGuildConfig } = require("../core/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automations_plus")
    .setDescription("Configurer les automations complémentaires de PRIME")
    .addStringOption(option => option.setName("equipe").setDescription("Identifiant de l'équipe").setRequired(true))
    .addBooleanOption(option => option.setName("derniere_chance").setDescription("Activer le rappel avant dernier check").setRequired(true))
    .addIntegerOption(option => option.setName("minutes").setDescription("Minutes avant le dernier check (5 à 180)").setMinValue(5).setMaxValue(180)),

  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    const cfg = getGuildConfig(interaction.guildId);
    const id = interaction.options.getString("equipe").trim().toLowerCase();
    const index = (cfg?.disponibilites || []).findIndex(item => item.id === id);
    if (index < 0) return interaction.reply({ content: "Équipe introuvable. Consulte /config.", flags: MessageFlags.Ephemeral });
    const values = cfg.disponibilites.map(item => ({ ...item, automations: { ...item.automations } }));
    values[index].automations.derniereChance = {
      enabled: interaction.options.getBoolean("derniere_chance"),
      minutesBefore: interaction.options.getInteger("minutes") || 30,
    };
    upsertGuildConfig(interaction.guildId, { disponibilites: values });
    return interaction.reply({ content: `Équipe ${id} : dernier rappel ${values[index].automations.derniereChance.enabled ? "activé" : "désactivé"} (${values[index].automations.derniereChance.minutesBefore} min).`, flags: MessageFlags.Ephemeral });
  },
};
