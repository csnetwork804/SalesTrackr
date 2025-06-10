const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: String,
    phone: String,
    status: { type: String, enum: ['Cold', 'Hot', 'Converted'], default: 'Cold' },
    interestLevel: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    nextFollowUp: Date,
    remarks: String,
    createdBy: String
});

module.exports = mongoose.model('Lead', leadSchema);
