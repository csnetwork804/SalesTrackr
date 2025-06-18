// utils/scheduler.js
const cron = require("node-cron");
const Lead = require("../models/lead");
const config = require("./config.json");

module.exports = function scheduleFollowUps(client) {
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    const startOfHour = new Date(now.setMinutes(0, 0, 0));
    const endOfHour = new Date(startOfHour.getTime() + 3600000);

    const leads = await Lead.find({
      followUp: { $gte: startOfHour, $lt: endOfHour }
    });

    if (!leads.length) return;

    const channel = client.channels.cache.get(config.coldCallingUpdates);
    if (!channel) return;

    for (const lead of leads) {
      const mention = lead.assignedTo ? `<@${lead.assignedTo}>` : "@BDE";
      await channel.send(
        `🔔 **Follow-up Reminder**
👤 ${lead.name} | 📞 ${lead.phone}
🕒 <t:${Math.floor(new Date(lead.followUp).getTime() / 1000)}:f>
🔁 Assigned: ${mention}`
      );
    }
  });
};