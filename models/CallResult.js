const mongoose = require('mongoose');

const callResultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, index: true }, // index for faster lookup
  reason: { type: String, required: true },
  summary: { type: String, required: true },
  status: {
    type: String,
    enum: ['connected', 'not_connected'],
    default: 'not_connected',
    index: true
  },
  userId: { type: String, required: true },
  username: { type: String, required: true },

  retryCount: { type: Number, default: 0 },
  nextRetryAt: { type: Date },
  retryValid: { type: Boolean, default: false },

  assignedTo: {
    userId: { type: String },
    username: { type: String }
  },

  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CallResult', callResultSchema);
