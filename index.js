const { Client, GatewayIntentBits } = require('discord.js');
const { fetchRaidEvent } = require('./fetchRaidEvent');
const { addEventToCalendar } = require('./addEventToCalendar');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content.startsWith('!addevent')) {
        const args = message.content.split(' ');
        const eventId = args[1];

        if (!eventId) {
            return message.channel.send('Please provide an event ID.');
        }

        const eventDetails = await fetchRaidEvent(eventId);
        if (eventDetails) {
            await addEventToCalendar(eventDetails);
            message.channel.send('Event added to Google Calendar!');
        } else {
            message.channel.send('Failed to fetch event details.');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
