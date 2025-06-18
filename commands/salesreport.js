const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const Call = require('../models/CallResult');
const Prospect = require('../models/lead');
const config = require('../utils/config.json'); // Contains salesReportChannelId

module.exports = {
  data: new SlashCommandBuilder()
  .setName('salesreport')
  .setDescription('Generates a sales report for a selected time range')
  .addStringOption(option =>
    option.setName('range')
      .setDescription('Select the time range')
      .setRequired(true)
      .addChoices(
        { name: 'Daily', value: 'daily' },
        { name: 'Weekly', value: 'weekly' },
        { name: 'Monthly', value: 'monthly' }
      )
  )
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Employee to get the report for')
      .setRequired(false)
  ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    const range = interaction.options.getString('range');

    // Determine date range
    let startDate = moment();
    if (range === 'weekly') startDate = moment().subtract(7, 'days');
    else if (range === 'monthly') startDate = moment().subtract(30, 'days');

    const calls = await Call.find({
      'assignedTo.userId': userId,
      timestamp: { $gte: startDate.toDate() }
    });

    const prospects = await Prospect.find({
      assignedTo: userId,
      createdAt: { $gte: startDate.toDate() }
    });

    const notConnected = calls.filter(call => call.status === 'not_connected');
    const connected = prospects.filter(p => p.status !== 'not_connected');
    const interested = connected.filter(p => p.status === 'cold');

    const formattedStartDate = startDate.format('DD/MM/YYYY');
    const formattedEndDate = moment().format('DD/MM/YYYY');

    const report = `📝 ${range[0].toUpperCase() + range.slice(1)} Sales Activity Report
Date Range: ${formattedStartDate} - ${formattedEndDate}
Employee Name: ${user.username}
Department: Sales
Reporting Manager: [Manager Name]

📊 Metric
Total Calls Made: ${calls.length + prospects.length}
Calls Not Connected: ${notConnected.length}
Calls Connected: ${connected.length}
Interested/Ready to Move Forward: ${interested.length}

🚫 Unconnected Calls (Name & Number)
${notConnected.map(call =>
  `${call.name} | ${call.phone} | ${call.summary || 'No remarks'}`
).join('\n') || 'None'}

✅ Connected & Interested Prospects
${interested.map(p =>
  `${p.name} | ${p.phone} | Medium | ${moment(p.followUp).format('DD/MM/YYYY')} | ${p.summary || 'N/A'}`
).join('\n') || 'None'}

🔁 Follow-Up on Previous Leads
${connected.map(p =>
  `${p.name} | ${moment(p.createdAt).format('DD/MM/YYYY')} | ${p.summary || 'N/A'} | ${p.status} | Follow up on ${moment(p.followUp).format('DD/MM/YYYY')}`
).join('\n') || 'None'}

🎧 Recordings Uploaded
${connected.flatMap(p =>
  (p.recordings || []).map(r =>
    `${p.name} | ${r.name} | ${moment(r.uploadedAt).format('DD/MM/YYYY HH:mm')}`
  )
).join('\n') || 'None'}

🗒️ Additional Notes / Challenges Faced / Support Required
[Write here if any specific issue, feedback, or support needed.]
`;

    const filePath = path.join(__dirname, `${user.username}-${range}-sales-report.txt`);
    fs.writeFileSync(filePath, report);
    const attachment = new AttachmentBuilder(filePath);

    // Send to report channel
    const channel = await interaction.client.channels.fetch(config.salesReportChannelId);
    if (channel) {
      await channel.send({
        content: `📄 ${range[0].toUpperCase() + range.slice(1)} sales report for **${user.username}**:`,
        files: [attachment],
      });
    } else {
      await interaction.editReply({ content: '❌ Sales report channel not found.' });
      return;
    }

    await interaction.editReply({ content: `✅ Report generated and sent to <#${config.salesReportChannelId}>.` });

    setTimeout(() => fs.unlink(filePath, () => {}), 10000);
  }
};
