// Required packages: express, multer, openai, mongoose, dotenv
// Install with: npm install express multer openai mongoose dotenv

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// File storage config
const upload = multer({ dest: "uploads/" });

// MongoDB model
mongoose.connect("mongodb://127.0.0.1:27017/sales", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const leadSchema = new mongoose.Schema({
  name: String,
  phone: String,
  recordings: [{ name: String, url: String }],
  aiAnalysis: Object
});

const Lead = mongoose.model("Lead", leadSchema);

// Serve audio files statically
app.use("/audio", express.static(path.join(__dirname, "uploads")));

// Upload endpoint from Discord bot
app.post("/upload/:phone", upload.single("file"), async (req, res) => {
  const { phone } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded." });

  const publicUrl = `http://localhost:${port}/audio/${file.filename}`;

  const lead = await Lead.findOneAndUpdate(
    { phone },
    {
      $push: {
        recordings: { name: file.originalname, url: publicUrl }
      }
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, url: publicUrl });
});

app.listen(port, () => {
  console.log(`🟢 Upload server running at http://localhost:${port}`);
});
