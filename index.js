require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const connectDB = require('./config/database');
const cronJobs = require('./cron/summaryCron');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();

// Load Commands
const dailyReport = require('./commands/dailyReport');
const updateLead = require('./commands/updateLead');
const conversionSummary = require('./commands/conversionSummary');
const setReminder = require('./commands/setReminder');

client.commands.set('daily_report', dailyReport);
client.commands.set('update_lead', updateLead);
client.commands.set('conversion_summary', conversionSummary);
client.commands.set('set_reminder', setReminder);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    connectDB();
    cronJobs(client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (command) {
        await command.execute(interaction);
    }
});

client.login(process.env.DISCORD_TOKEN);
