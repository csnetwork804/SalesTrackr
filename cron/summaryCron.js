const cron = require('node-cron');
const Lead = require('../models/lead');

module.exports = (client) => {
    cron.schedule('0 18 * * *', async () => { // Runs daily at 6 PM
        const totalLeads = await Lead.countDocuments();
        const hotLeads = await Lead.countDocuments({ status: 'Hot' });
        const convertedLeads = await Lead.countDocuments({ status: 'Converted' });
        const coldLeads = await Lead.countDocuments({ status: 'Cold' });

        const reportChannel = client.channels.cache.find(channel => channel.name === '📈│sales-reports');
        if (reportChannel) {
            reportChannel.send(`📊 **Daily Sales Summary**
Total Leads: ${totalLeads}
Hot Leads: ${hotLeads}
Cold Leads: ${coldLeads}
Converted Leads: ${convertedLeads}`);
        }
    });
};
