// models/Lead.js
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ["cold", "hot"], required: true },
  summary: { type: String },
  requirements: { type: String },
  followUp: { type: Date },
  assignedTo: { type: String },
recordings: [
  {
    url: String,
    name: String,
    uploadedAt: Date,
    uploadedBy: String
  }
],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lead", leadSchema);
