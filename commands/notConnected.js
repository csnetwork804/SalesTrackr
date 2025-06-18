const { SlashCommandBuilder } = require("discord.js");
const config = require("../utils/config.json");
const CallResult = require("../models/CallResult");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("not_connected")
    .setDescription("Log a not-connected call with retry logic")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Lead's name")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName("phone")
        .setDescription("Phone number (e.g., +1234567890)")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason the call was not connected")
        .setRequired(true)
        .addChoices(
          { name: "No Answer", value: "No Answer" },
          { name: "Voicemail", value: "Voicemail" },
          { name: "Wrong Number", value: "Wrong Number" },
          { name: "Busy Line", value: "Busy Line" },
          { name: "Disconnected", value: "Disconnected" },
          { name: "Call Dropped", value: "Call Dropped" },
          { name: "Not Available", value: "Not Available" },
          { name: "Call Back Later", value: "Call Back Later" }
        )),

  async execute(interaction, client) {
    const name = interaction.options.getString("name");
    const phone = interaction.options.getString("phone");
    const reason = interaction.options.getString("reason");

    const userId = interaction.user.id;
    const username = interaction.user.tag;

    const retryableReasons = ["Voicemail", "Not Available", "Call Back Later", "Busy Line"];
    const isRetryValid = retryableReasons.includes(reason);
    const nextRetryAt = isRetryValid ? new Date(Date.now() + 3 * 60 * 60 * 1000) : null;

    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return await interaction.reply({
        content: "❌ Invalid phone number format. Use format like +1234567890.",
        ephemeral: true
      });
    }

    const assignedUserId = userId; // or implement your own logic
    const assignedUsername = username;

    try {
      await CallResult.create({
        name,
        phone,
        reason,
        summary: `❌ Not Connected - ${reason}`,
        status: 'not_connected',
        userId,
        username,
        retryValid: true,
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 30 * 1000), // First retry in 30 seconds
        assignedTo: {
          userId: interaction.user.id,
          username: interaction.user.tag
        }
      });
    } catch (err) {
      console.error("❌ Failed to store call result:", err);
      return await interaction.reply({
        content: "❌ Failed to save not-connected call result.",
        ephemeral: true
      });
    }

    const coldCallChannel = client.channels.cache.get(config.coldCallingUpdates);
    if (coldCallChannel) {
      await coldCallChannel.send({
        content: `📞 **Call Log – Not Connected**`,
        embeds: [{
          color: 0xFFCC00,
          title: `🧾 Lead Information`,
          fields: [
            { name: "👤 Lead Name", value: name, inline: true },
            { name: "📱 Phone Number", value: phone, inline: true },
            { name: "❌ Call Outcome", value: reason, inline: false },
            { name: "🧑 Logged By", value: `<@${userId}> (${username})`, inline: true },
            { name: "📋 Assigned To", value: `<@${assignedUserId}> (${assignedUsername})`, inline: true },
            { name: "🕒 Logged At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          ],
          footer: {
            text: "Cold Calling Log • Not Connected Attempt"
          },
          timestamp: new Date().toISOString()
        }]
      });
    }

    await interaction.reply({
      content: `⚠️ Not-connected call for **${name}** logged, assigned to <@${assignedUserId}>.`,
      ephemeral: true
    });
  }
};
