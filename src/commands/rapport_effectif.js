const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { authorized, reject } = require('../core/staffTools');
const { getGuildConfig } = require('../core/guildConfig');
const { reportForGuild } = require('../core/weeklyRoster');
module.exports = {
  data: new SlashCommandBuilder().setName('rapport_effectif')
    .setDescription('Publier le rapport des joueurs classés par poste dans le salon staff'),
  async execute(interaction) {
    if (!authorized(interaction)) return reject(interaction);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cfg = getGuildConfig(interaction.guildId);
    const channelId = cfg?.automations?.rapportEffectif?.channelId || cfg?.staffReportsChannelId;
    if (!channelId) return interaction.editReply('Configure le salon du rapport dans /setup.');
    try {
      const result = await reportForGuild(interaction.guild, channelId);
      return interaction.editReply(`Rapport publié dans <#${result.channelId}> : ${result.players} joueurs, ${result.messages} messages.`);
    } catch (error) {
      console.error('[PRIME][RAPPORT_EFFECTIF]', error);
      return interaction.editReply(`Publication impossible : ${error.message}`);
    }
  },
};
