const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    employee: String,
    date: String,
    totalCalls: Number,
    connectedCalls: Number,
    interestedLeads: Number,
    followUps: Number,
    notes: String
});

module.exports = mongoose.model('Report', reportSchema);
