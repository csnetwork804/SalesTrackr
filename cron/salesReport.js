const CallResult = require('../models/CallResult');

async function generateNotConnectedReport() {
  const reportData = await CallResult.find({
    status: 'not_connected',
    retryValid: true
  });

  // Group or format this however you want
  return reportData.map(entry => ({
    name: entry.name,
    phone: entry.phone,
    reason: entry.reason,
    assignedTo: entry.assignedTo?.username || 'Unassigned',
    retryCount: entry.retryCount
  }));
}

module.exports = generateNotConnectedReport;
