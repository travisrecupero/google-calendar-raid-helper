require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');
const { fetchRaidEvent } = require('./fetchRaidEvent');
const { addEventToCalendar } = require('./addEventToCalendar');
const { getUser, deleteToken, updateExpiry, getServer, setServer } = require('./db');
const { decrypt, encrypt, createState } = require('./crypto-utils');
const oauthRoutes = require('./oauthCallbackServer');

// Express server for OAuth callbacks
const app = express();
app.use(oauthRoutes);

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`OAuth callback server listening on port ${PORT}`);
});

// Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function buildAuthReply(message, userId) {
    const state = createState(userId);
    const baseUrl = process.env.GOOGLE_REDIRECT_URI.replace('/auth/google/callback', '');
    const authLink = `${baseUrl}/auth/google?state=${state}`;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Connect Google Calendar')
            .setStyle(ButtonStyle.Link)
            .setURL(authLink)
    );
    return { content: message, components: [row] };
}

// Proactively refresh access token if it expires within 5 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function getReadyOAuth2Client(userId) {
    const user = getUser(userId);
    if (!user) return { client: null, needsAuth: true };

    let refreshToken;
    try {
        refreshToken = decrypt(user.encrypted_refresh_token);
    } catch (err) {
        console.error('Failed to decrypt token for user', userId, err);
        deleteToken(userId);
        return { client: null, needsAuth: true, corrupted: true };
    }

    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    // Proactively refresh if token is expired or expiring soon
    const expiresAt = user.token_expires_at;
    if (!expiresAt || expiresAt - Date.now() < REFRESH_BUFFER_MS) {
        try {
            const { credentials } = await oAuth2Client.refreshAccessToken();
            if (credentials.expiry_date) {
                updateExpiry(userId, credentials.expiry_date);
            }
        } catch (err) {
            // If refresh fails, the token is likely revoked
            if (err.message?.includes('invalid_grant') || err.response?.status === 401) {
                deleteToken(userId);
                return { client: null, needsAuth: true, expired: true };
            }
            throw err;
        }
    }

    return { client: oAuth2Client };
}

client.on('interactionCreate', async interaction => {
    // Handle autocomplete for raid_id
    if (interaction.isAutocomplete() && interaction.commandName === 'addevent') {
        const focused = interaction.options.getFocused();
        const guildId = interaction.guildId;

        if (!guildId) return interaction.respond([]);

        const server = getServer(guildId);
        if (!server) return interaction.respond([]);

        let apiKey;
        try {
            apiKey = decrypt(server.encrypted_api_key);
        } catch {
            return interaction.respond([]);
        }

        try {
            const response = await axios.get(
                `https://raid-helper.dev/api/v3/servers/${guildId}/events`,
                {
                    headers: {
                        'Authorization': apiKey,
                    },
                }
            );

            const events = (response.data.postedEvents || [])
                .sort((a, b) => b.startTime - a.startTime)
                .filter(e => {
                    const label = `${e.title} — ${new Date(e.startTime * 1000).toLocaleDateString()}`;
                    return label.toLowerCase().includes(focused.toLowerCase()) || e.id.includes(focused);
                })
                .slice(0, 25)
                .map(e => ({
                    name: `${e.title} — ${new Date(e.startTime * 1000).toLocaleDateString()}`.slice(0, 100),
                    value: e.id,
                }));

            return interaction.respond(events);
        } catch (err) {
            console.error('Autocomplete fetch error:', err.message);
            return interaction.respond([]);
        }
    }

    if (!interaction.isChatInputCommand()) return;

    // Handle /setup command
    if (interaction.commandName === 'setup') {
        const apiKey = interaction.options.getString('raid_helper_api_key');
        await interaction.deferReply({ ephemeral: true });

        // Verify the API key works by making a test call
        try {
            await axios.get(
                `https://raid-helper.dev/api/v3/servers/${interaction.guildId}/events`,
                { headers: { 'Authorization': apiKey } }
            );
        } catch (err) {
            return interaction.editReply('That API key didn\'t work. Make sure you used `/apikey refresh` with the Raid Helper bot in this server, then copy the key from `/apikey show`.');
        }

        const encryptedKey = encrypt(apiKey);
        setServer(interaction.guildId, encryptedKey, interaction.user.id);
        return interaction.editReply('Raid Helper API key saved! Members can now use `/addevent` to add events to their Google Calendar.');
    }

    if (interaction.commandName !== 'addevent') return;

    const raidId = interaction.options.getString('raid_id');
    await interaction.deferReply({ ephemeral: true });

    // Check if server has been set up
    if (interaction.guildId && !getServer(interaction.guildId)) {
        return interaction.editReply(
            'This server hasn\'t been set up yet! A server admin needs to run `/setup` first.\n\n' +
            '**How to get a Raid Helper API key:**\n' +
            '1. Use `/apikey refresh` with the Raid Helper bot in this server\n' +
            '2. Use `/apikey show` to copy your key\n' +
            '3. Run `/setup raid_helper_api_key:<your key>`'
        );
    }

    // Get an authenticated OAuth2 client for this user
    let result;
    try {
        result = await getReadyOAuth2Client(interaction.user.id);
    } catch (err) {
        console.error('Error preparing OAuth client:', err);
        return interaction.editReply('Something went wrong preparing your Google connection. Please try again.');
    }

    if (result.needsAuth) {
        const message = result.corrupted
            ? 'Your stored token is corrupted. Please re-link your Google Calendar:'
            : result.expired
                ? 'Your Google authorization has expired. Please re-link:'
                : 'You need to link your Google Calendar first:';
        return interaction.editReply(buildAuthReply(message, interaction.user.id));
    }

    // Fetch the raid event
    const event = await fetchRaidEvent(raidId);
    if (!event) {
        return interaction.editReply('Could not fetch that Raid Helper event. Check the event ID and try again.');
    }

    // Add to calendar
    try {
        await addEventToCalendar(result.client, event);
        await interaction.editReply(`Event **${event.title}** added to your Google Calendar!`);
    } catch (error) {
        console.error('Error adding event to calendar:', error);

        // Handle expired/revoked tokens that slipped past the proactive refresh
        if (error.code === 401 || error.message?.includes('invalid_grant')) {
            deleteToken(interaction.user.id);
            return interaction.editReply(
                buildAuthReply('Your Google authorization has expired. Please re-link:', interaction.user.id)
            );
        }

        await interaction.editReply('Failed to add the event to Google Calendar. Please try again later.');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
