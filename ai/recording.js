const OpenAI = require("openai");
const fs = require("fs");
const tmp = require("tmp-promise");
const fetch = require("node-fetch"); // ✅ Correctly import fetch for Node < 18
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Downloads an audio file and transcribes it using Whisper.
 * @param {string} audioUrl - Public URL to the audio file (MP3, WAV, etc.).
 * @returns {Promise<string>} - Transcribed text.
 */
async function transcribeAudio(audioUrl) {
  const { path: tempPath, cleanup } = await tmp.file({ postfix: ".mp3" });

  try {
    console.log("🔗 Fetching audio from:", audioUrl);

    const response = await fetch(audioUrl); // ✅ Should work now

    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status, response.statusText);
      throw new Error("Failed to fetch audio file");
    }

    const buffer = await response.buffer();
    fs.writeFileSync(tempPath, buffer);
    console.log("✅ Audio file saved to temp path:", tempPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
      language: "en",
    });

    console.log("✅ Transcription complete");
    return transcription.text;
  } catch (error) {
    console.error("❌ Error in transcribeAudio:", error.message || error);
    throw new Error("Transcription failed.");
  } finally {
    await cleanup();
    console.log("🗑️ Temp file cleaned up.");
  }
}

/**
 * Evaluates a call transcript using GPT-4 and returns structured feedback.
 * @param {string} transcript - The text of the call transcript.
 * @returns {Promise<Object>} - Evaluation JSON.
 */
async function evaluateCallWithAI(transcript) {
  const prompt = `
You are a sales coach. Analyze this call transcript.

Transcript:
"""${transcript}"""

1. Summarize the call.
2. Rate the following criteria from 1–5:
- Opening & Introduction
- Product Knowledge
- Listening Skills
- Objection Handling
- Closing Technique
- Confidence & Clarity
- Overall Professionalism

3. Give a Total Score (out of 35).
4. Provide improvement feedback for tone, pitch, closing, etc.

Respond ONLY in JSON format:
{
  "summary": "...",
  "evaluation": {
    "opening": 4,
    "productKnowledge": 5,
    "listening": 4,
    "objectionHandling": 3,
    "closing": 4,
    "confidence": 5,
    "professionalism": 4,
    "total": 29,
    "feedback": "..."
  }
}
  `.trim();

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const message = res.choices[0].message.content.trim();
    const jsonStart = message.indexOf("{");
    const jsonEnd = message.lastIndexOf("}");
    const jsonString = message.substring(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("❌ Error in evaluateCallWithAI:", error.message || error);
    throw new Error("AI evaluation failed.");
  }
}

module.exports = {
  transcribeAudio,
  evaluateCallWithAI,
};
