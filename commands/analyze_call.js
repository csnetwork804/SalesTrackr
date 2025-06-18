const { SlashCommandBuilder } = require("discord.js");
const Lead = require("../models/lead");
const { transcribeAudio, evaluateCallWithAI } = require("../ai/recording");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("analyze_call")
    .setDescription("Analyze a lead's latest call recording using phone number")
    .addStringOption(opt =>
      opt.setName("phone")
        .setDescription("Lead's 10-digit phone number")
        .setRequired(true)
    ),

  async execute(interaction) {
    const phone = interaction.options.getString("phone").trim();

    // Validate phone format
    if (!/^\d{10}$/.test(phone)) {
      return interaction.reply({
        content: "❌ Please enter a valid 10-digit phone number.",
        ephemeral: true
      });
    }

    const lead = await Lead.findOne({ phone });

    if (!lead) {
      return interaction.reply({
        content: "❌ No lead found with this phone number.",
        ephemeral: true
      });
    }

    if (!lead.recordings || lead.recordings.length === 0) {
      return interaction.reply({
        content: "❌ This lead has no uploaded recordings to analyze.",
        ephemeral: true
      });
    }

    const latestRecording = lead.recordings[lead.recordings.length - 1];

    await interaction.reply({
      content: "⏳ Analyzing the latest call recording. This may take a moment...",
      ephemeral: true
    });

    try {
      const transcript = await transcribeAudio(latestRecording.url);
      const { summary, evaluation } = await evaluateCallWithAI(transcript);

      lead.aiAnalysis = {
        transcript,
        summary,
        evaluation
      };
      await lead.save();

      const msg = `🧠 **Call Analysis for ${lead.name} (${lead.phone})**\n` +
        `🎧 Recording: [${latestRecording.name}](${latestRecording.url})\n\n` +
        `📝 **Summary:** ${summary}\n\n` +
        `📊 **Ratings (1–5):**\n` +
        `> • Opening & Introduction: ${evaluation.opening}\n` +
        `> • Product Knowledge: ${evaluation.productKnowledge}\n` +
        `> • Listening Skills: ${evaluation.listening}\n` +
        `> • Objection Handling: ${evaluation.objectionHandling}\n` +
        `> • Closing Technique: ${evaluation.closing}\n` +
        `> • Confidence & Clarity: ${evaluation.confidence}\n` +
        `> • Professionalism: ${evaluation.professionalism}\n\n` +
        `🏁 **Total Score:** ${evaluation.total}/35\n` +
        `🗣️ **Feedback:** ${evaluation.feedback}`;

      await interaction.followUp({ content: msg });
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      await interaction.followUp({
        content: "❌ Failed to analyze the recording. Please try again later.",
        ephemeral: true
      });
    }
  }
};
