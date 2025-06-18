const { SlashCommandBuilder } = require("discord.js");
const CallResult = require("../models/CallResult");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mark_connected")
    .setDescription("Mark a previously not connected lead as connected")
    .addStringOption(opt =>
      opt.setName("phone")
        .setDescription("Phone number of the lead")
        .setRequired(true)),

  async execute(interaction) {
    const phone = interaction.options.getString("phone");
    const userId = interaction.user.id;

    // Only update if assigned to the user and not already marked as connected
    const lead = await CallResult.findOne({
      phone,
      status: 'not_connected',
      'assignedTo.userId': userId
    });

    if (!lead) {
      return await interaction.reply({
        content: "❌ No pending lead found with this phone number assigned to you.",
        ephemeral: true
      });
    }

    // Update status
    lead.status = 'connected';
    lead.retryValid = false;
    lead.summary += " → ✅ Marked as Connected";
    await lead.save();

    await interaction.reply({
      content: `✅ Lead **${lead.name}** marked as connected. Removed from retry queue.`,
      ephemeral: true
    });
  }
};
