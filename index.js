// index.js
require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const mongoose = require("mongoose");
const scheduleFollowUps = require("./utils/scheduler");
const processRetryCalls = require('./cron/retryProcessor');
const generateNotConnectedReport = require('./cron/salesReport');
const scheduleReminders = require("./cron/reminderScheduler");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load command files
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    }
}

client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    scheduleFollowUps(client);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (err) {
            console.error('Autocomplete error:', err);
        }
        return;
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Error executing command.', ephemeral: true });
        }
    }
});



client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  scheduleReminders(client); // Start reminder checks
});

// Example: Every 15 minutes
setInterval(() => {
  processRetryCalls(client);
}, 10000);

// Example: Report once daily
setInterval(async () => {
  const report = await generateNotConnectedReport();
  console.log("📊 Daily Report:", report);
}, 24 * 60 * 60 * 1000);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("🔗 Connected to MongoDB");
        client.login(process.env.TOKEN);
    })
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
