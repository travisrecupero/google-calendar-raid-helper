require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { addEventToCalendar } = require('./addEventToCalendar');
const { fetchRaidEvent } = require('./fetchRaidEvent');
const { google } = require('googleapis');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content.startsWith('!addevent')) {
        const eventId = message.content.split(' ')[1];
        const event = await fetchRaidEvent(eventId);
        if (event) {
            await addEventToCalendar(event);
            message.reply('Event added to Google Calendar!');
        } else {
            message.reply('Error fetching event.');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);

function getAuthorizationUrl() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    return url;
}

console.log(getAuthorizationUrl());
