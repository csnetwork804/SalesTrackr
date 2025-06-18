const CallResult = require('../models/CallResult');
const config = require('../utils/config.json');

function getNextRetryTime(currentRetry) {
  const now = new Date();
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  switch (currentRetry) {
    case 0: // 1st Retry → +2 hours
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    case 1: { // 2nd Retry → Today at 7:00 PM
      today.setHours(19, 0, 0, 0);
      return today > now ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }
    case 2: { // 3rd Retry → Tomorrow at 12:30 PM
      tomorrow.setHours(12, 30, 0, 0);
      return tomorrow;
    }
    case 3: { // 4th Retry → Same day (as 3rd) at 7:00 PM
      const retryDay = new Date(tomorrow);
      retryDay.setHours(19, 0, 0, 0);
      return retryDay;
    }
    default:
      return null;
  }
}

async function processRetryCalls(client) {
  const retryList = await CallResult.find({
    status: 'not_connected',
    retryValid: true,
    nextRetryAt: { $lte: new Date() },
    retryCount: { $lt: 4 }
  });

  for (const lead of retryList) {
    try {
      const currentRetry = lead.retryCount;

      const nextRetry = getNextRetryTime(currentRetry);
      lead.retryCount += 1;
      lead.nextRetryAt = nextRetry;

      if (lead.retryCount >= 4) {
        lead.retryValid = false;
      }

      await lead.save();

      const channel = client.channels.cache.get(config.coldCallingUpdates);
      if (channel) {
        await channel.send({
          content: `📞 **Retry Reminder – Attempt ${lead.retryCount}**`,
          embeds: [
            {
              color: 0x3399ff,
              title: `🔁 Scheduled Callback: Lead Retry`,
              fields: [
                { name: "👤 Lead Name", value: lead.name, inline: true },
                { name: "📱 Phone Number", value: lead.phone, inline: true },
                {
                  name: "📋 Assigned To",
                  value: `<@${lead.assignedTo?.userId || 'Unassigned'}>`,
                  inline: true
                },
                {
                  name: "🧑 Logged By",
                  value: `<@${lead.userId}> (${lead.username})`,
                  inline: true
                },
                { name: "❌ Reason", value: lead.reason || "N/A", inline: false }
              ],
              footer: {
                text: nextRetry
                  ? `Next retry scheduled at ${nextRetry.toLocaleString()}`
                  : `✅ Final attempt done. No more retries.`
              },
              timestamp: new Date().toISOString()
            }
          ]
        });
      }

    } catch (err) {
      console.error(`❌ Retry error for lead: ${lead.name}`, err);
    }
  }
}

module.exports = processRetryCalls;
