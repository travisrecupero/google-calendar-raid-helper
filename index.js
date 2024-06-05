require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');
const readline = require('readline');
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

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

function getAuthorizationUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    return url;
}

async function getTokens(authCode) {
    const { tokens } = await oAuth2Client.getToken(authCode);
    oAuth2Client.setCredentials(tokens);
    return tokens;
}

function promptForAuthCode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the authorization code from the URL: ', async (authCode) => {
        try {
            const tokens = await getTokens(authCode);
            console.log('Tokens:', tokens);
            console.log('Please update your .env file with the new GOOGLE_REFRESH_TOKEN.');
            rl.close();
        } catch (error) {
            console.error('Error getting tokens:', error);
            rl.close();
        }
    });
}

async function main() {
    if (!process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN === 'your_google_refresh_token') {
        console.log('No refresh token found. Please visit the following URL to authorize the application:');
        console.log(getAuthorizationUrl());
        promptForAuthCode();
    } else {
        oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        try {
            // Test if the refresh token is valid by making a simple API call
            await oAuth2Client.getAccessToken();
            console.log('Refresh token found and is valid, proceeding with bot operations.');
        } catch (error) {
            console.error('Invalid refresh token, please re-authorize the application.');
            console.log(getAuthorizationUrl());
            promptForAuthCode();
        }
    }
}

main();
