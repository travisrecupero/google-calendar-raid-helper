require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');
const { fetchRaidEvent } = require('./fetchRaidEvent');
const { addEventToCalendar } = require('./addEventToCalendar');

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
            try {
                // Send the authorization link immediately after processing the !addevent command
                const authUrl = getAuthorizationUrl();
                message.author.send(`Click the following link to authorize the bot: ${authUrl}`)
                    .then(() => message.reply('Authorization link sent via DM.'))
                    .catch(error => {
                        console.error(`Could not send DM to ${message.author.tag}.`, error);
                        message.reply('Failed to send authorization link. Make sure your DMs are open.');
                    });
                
                // Proceed with adding event to Google Calendar
                await addEventToCalendar(event);
                message.reply('Event added to Google Calendar!');
            } catch (error) {
                console.error('Error adding event to calendar:', error);
                message.reply('Error adding event to Google Calendar. Please ensure you have authorized the application.');
            }
        } else {
            message.reply('Error fetching event.');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);

const oAuth2Client = require('./oauthClient');

// Function to get authorization URL
function getAuthorizationUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    return url;
}

async function main() {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
        console.log('No refresh token found. Please visit the following URL to authorize the application:');
        console.log(getAuthorizationUrl());
    } else {
        oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        try {
            // Test if the refresh token is valid by making a simple API call
            await oAuth2Client.getAccessToken();
            console.log('Refresh token found and is valid, proceeding with bot operations.');
        } catch (error) {
            console.error('Invalid refresh token, please re-authorize the application.');
            console.log(getAuthorizationUrl());
        }
    }
}

main();
