// reminderScheduler.js
const Lead = require("../models/lead");
const config = require("../utils/config.json");

const REMINDER_OFFSETS_MINUTES = [10, 5, 1];

module.exports = async function scheduleReminders(client) {
  setInterval(async () => {
    const now = new Date();

    for (const offset of REMINDER_OFFSETS_MINUTES) {
      const target = new Date(now.getTime() + offset * 60 * 1000);

      const leads = await Lead.find({
        followUp: {
          $gte: new Date(target.getTime() - 30 * 1000), // ±30 sec window
          $lte: new Date(target.getTime() + 30 * 1000)
        }
      });

      if (!leads.length) continue;

      const updatesChannel = client.channels.cache.get(config.followUpReminders);
      if (!updatesChannel) return;

      for (const lead of leads) {
        const followUpTimestamp = Math.floor(lead.followUp.getTime() / 1000);

        const message = `🔔 **Follow-Up Reminder - ${offset} Minute${offset > 1 ? "s" : ""} Left**\n\n` +
          `👤 **Name:** ${lead.name}\n` +
          `📞 **Phone:** ${lead.phone}\n` +
          `🔥 **Status:** ${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}\n` +
          `📝 **Summary:** ${lead.summary || "_No summary provided_"}\n` +
          `📌 **Requirements:** ${lead.requirements || "_None_"}\n` +
          `⏰ **Follow-Up Time:** <t:${followUpTimestamp}:F> (<t:${followUpTimestamp}:R>)\n` +
          `👤 **Assigned To:** <@${lead.assignedTo}>`;

        await updatesChannel.send({ content: message });
      }
    }
  }, 60 * 1000); // check every minute
};
