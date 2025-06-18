const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const Lead = require("../models/lead");
const config = require("../utils/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_lead")
    .setDescription("Update or create a lead and optionally attach a call recording")
    .addStringOption(opt =>
      opt.setName("lead")
        .setDescription("Lead name or phone")
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt =>
      opt.setName("phone")
        .setDescription("Phone number (needed if creating new)"))
    .addStringOption(opt =>
      opt.setName("status")
        .setDescription("Status")
        .addChoices(
          { name: "Cold ❄️", value: "cold" },
          { name: "Hot 🔥", value: "hot" }
        ))
    .addStringOption(opt =>
      opt.setName("summary")
        .setDescription("Brief summary of the call"))
    .addStringOption(opt =>
      opt.setName("requirements")
        .setDescription("Client's requirements"))
    .addStringOption(opt =>
      opt.setName("followup_date")
        .setDescription("Follow-up date (YYYY-MM-DD)"))
    .addIntegerOption(opt =>
      opt.setName("followup_hour")
        .setDescription("Hour (0–23)"))
    .addIntegerOption(opt =>
      opt.setName("followup_minute")
        .setDescription("Minute (0, 15, 30, 45)"))
    .addAttachmentOption(opt =>
      opt.setName("recording")
        .setDescription("Attach a call recording")),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const leads = await Lead.find({
      $or: [
        { name: { $regex: focused, $options: "i" } },
        { phone: { $regex: focused, $options: "i" } }
      ]
    }).limit(10);

    await interaction.respond(
      leads.map(lead => ({
        name: `${lead.name} (${lead.phone})`,
        value: lead._id.toString()
      }))
    );
  },

  async execute(interaction, client) {
    const leadInput = interaction.options.getString("lead");
    const phoneInputRaw = interaction.options.getString("phone");
    const statusInput = interaction.options.getString("status");
    const summaryInput = interaction.options.getString("summary");
    const requirementsInput = interaction.options.getString("requirements");
    const followUpDate = interaction.options.getString("followup_date");
    const followUpHour = interaction.options.getInteger("followup_hour");
    const followUpMinute = interaction.options.getInteger("followup_minute");
    const recording = interaction.options.getAttachment("recording");

    const phoneInput = phoneInputRaw?.trim();
    let lead;

    if (mongoose.Types.ObjectId.isValid(leadInput)) {
      lead = await Lead.findById(leadInput);
    }

    if (!lead) {
      lead = await Lead.findOne({
        $or: [
          { name: new RegExp("^" + leadInput + "$", "i") },
          { phone: leadInput }
        ]
      });
    }

    let isNew = false;

    if (!lead) {
      if (!phoneInput || !statusInput) {
        return interaction.reply({
          content: "❌ Lead not found. Please provide both `phone` and `status` to create a new lead.",
          ephemeral: true
        });
      }

      if (!/^\d{10}$/.test(phoneInput)) {
        return interaction.reply({
          content: "❌ Invalid phone number. It must be exactly 10 digits (0–9).",
          ephemeral: true
        });
      }

      lead = new Lead({
        name: leadInput,
        phone: phoneInput,
        status: statusInput,
        assignedTo: interaction.user.id,
        recordings: []
      });

      isNew = true;
    }

    if (phoneInput) {
      if (!/^\d{10}$/.test(phoneInput)) {
        return interaction.reply({
          content: "❌ Invalid phone number. It must be exactly 10 digits (0–9).",
          ephemeral: true
        });
      }
      lead.phone = phoneInput;
    }

    if (statusInput) lead.status = statusInput;
    if (summaryInput) lead.summary = summaryInput;
    if (requirementsInput) lead.requirements = requirementsInput;

    // Follow-up date and time
    let followUpSet = false;
    if (followUpDate && followUpHour !== null && followUpMinute !== null) {
      const followUpString = `${followUpDate}T${String(followUpHour).padStart(2, "0")}:${String(followUpMinute).padStart(2, "0")}`;
      const parsed = new Date(followUpString);

      if (isNaN(parsed.getTime())) {
        return interaction.reply({
          content: "❌ Invalid follow-up date or time. Use YYYY-MM-DD for date and valid time.",
          ephemeral: true
        });
      }

      lead.followUp = parsed;
      followUpSet = true;
    }

    lead.assignedTo = interaction.user.id;

    if (recording) {
      if (!lead.recordings) lead.recordings = [];
      lead.recordings.push({
        url: recording.url,
        name: recording.name,
        uploadedAt: new Date(),
        uploadedBy: interaction.user.id
      });
    }

    await lead.save();
    lead = await Lead.findById(lead._id);

    const postChannel = client.channels.cache.get(
      lead.status === "cold" ? config.leadsCold : config.leadsHot
    );

    let msg = `${isNew ? "✅ **New Lead Created**" : "✏️ **Lead Updated**"}\n\n📋 \`Lead Details\`\n`;
    msg += `> 👤 **Name:** ${lead.name}\n`;
    msg += `> 📞 **Phone:** ${lead.phone}\n`;
    msg += `> 🔥 **Status:** ${lead.status}\n`;
    if (lead.summary) msg += `> 📝 **Summary:** ${lead.summary}\n`;
    if (lead.requirements) msg += `> 📌 **Requirements:** ${lead.requirements}\n`;
    if (lead.followUp) {
      const seconds = Math.floor(lead.followUp.getTime() / 1000);
      msg += `> ⏰ **Follow-Up:** <t:${seconds}:F> (<t:${seconds}:R>)\n`;
    }

    if (lead.recordings?.length) {
      msg += `\n🎧 **Recordings:**\n`;
      lead.recordings.forEach(r => {
        msg += `> • [${r.name}](${r.url}) — uploaded <t:${Math.floor(r.uploadedAt.getTime() / 1000)}:R>\n`;
      });
    }

    if (postChannel) await postChannel.send(msg);

    // 📢 Send follow-up info to cold-calling-updates channel
    if (followUpSet) {
      const updatesChannel = client.channels.cache.get(config.coldCallingUpdates);
      if (updatesChannel) {
        const followUpInfo = `📞 **New Follow-Up Scheduled**\n\n` +
          `👤 **Name:** ${lead.name}\n` +
          `📞 **Phone:** ${lead.phone}\n` +
          `🔥 **Status:** ${lead.status}\n` +
          (lead.summary ? `📝 **Summary:** ${lead.summary}\n` : '') +
          (lead.requirements ? `📌 **Requirements:** ${lead.requirements}\n` : '') +
          `⏰ **Follow-Up Time:** ${lead.followUp.toLocaleString()}\n` +
          `👤 **Assigned To:** <@${lead.assignedTo}>`;

        await updatesChannel.send(followUpInfo);
      }
    }

    // ✉️ Send client's requirements to dedicated channel
    if (lead.requirements) {
      const clientReqChannel = client.channels.cache.get(config.clientRequirements);
      if (clientReqChannel) {
        const requirementMsg = `📌 **New Client Requirement**\n\n` +
          `👤 **Name:** ${lead.name}\n` +
          `📞 **Phone:** ${lead.phone}\n` +
          `📌 **Requirements:** ${lead.requirements}\n` +
          `🕒 Submitted: <t:${Math.floor(Date.now() / 1000)}:R>\n` +
          `👤 **Assigned To:** <@${lead.assignedTo}>`;
        await clientReqChannel.send(requirementMsg);
      }
    }

    return interaction.reply({
      content: msg,
      ephemeral: true
    });
  }
};
