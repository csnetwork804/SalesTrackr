const { SlashCommandBuilder } = require("discord.js");
const CallResult = require("../models/CallResult");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("callbacks_due")
    .setDescription("List leads that are due for callback now"),

  async execute(interaction) {
    const now = new Date();

    const leads = await CallResult.find({
      retryValid: true,
      retryCount: { $lt: 4 },
      nextRetryAt: { $lte: now }
    });

    if (leads.length === 0) {
      return await interaction.reply({ content: "✅ No callbacks are due right now.", ephemeral: true });
    }

    const message = leads.map((lead, i) =>
      `🔁 **${i + 1}. ${lead.name}**\n📱 ${lead.phone}\n❌ Reason: ${lead.reason}\n#️⃣ Retry Attempt: ${lead.retryCount}\n⏰ Logged At: <t:${Math.floor(new Date(lead.timestamp).getTime() / 1000)}:f>`
    ).join("\n\n");

    await interaction.reply({ content: `**📋 Callbacks Due:**\n\n${message}`, ephemeral: true });
  }
};
