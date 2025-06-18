// commands/conversionSummary.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../utils/config.json");
const Lead = require("../models/lead");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("conversion_summary")
    .setDescription("Post a summary of today's lead conversions"),

  async execute(interaction, client) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const convertedLeads = await Lead.find({
      status: "hot",
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const summary = convertedLeads.length
      ? convertedLeads.map(lead => `• ${lead.name} | 📞 ${lead.phone}`).join("\n")
      : "No conversions recorded today.";

    const report = `📈 **Today's Conversion Summary (${today.toDateString()}):**\n${summary}`;

    const reportChannel = client.channels.cache.get(config.salesReports);
    if (reportChannel) await reportChannel.send(report);

    await interaction.reply({ content: "✅ Conversion summary posted.", ephemeral: true });
  }
};