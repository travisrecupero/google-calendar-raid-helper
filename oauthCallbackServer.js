require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const { insertUser } = require('./db');
const oAuth2Client = require('./oauthClient');

const app = express();
const port = 3000;

app.get('/oauth2/callback', async (req, res) => {
    try {
        const authCode = req.query.code;
        
        const tokens = await getTokens(authCode);

        // Extract user information from tokens or request if available
        const userData = getUserInfoFromTokens(tokens);

        // Insert user information and refresh token into the database
        insertUser(userData.username, userData.email, tokens.refresh_token);

        res.send('Authorization successful. You can close this window now.');
    } catch (error) {
        console.error('Error exchanging authorization code for tokens:', error);
        res.status(500).send('Error exchanging authorization code for tokens.');
    }
});

async function getTokens(authCode) {
    const { tokens } = await oAuth2Client.getToken(authCode);
    // Optionally, validate and process the tokens as needed
    return tokens;
}

// Example function to extract user information from tokens if we add in the future
// Need Google People API
function getUserInfoFromTokens(tokens) {
    // Extract username and email from tokens or request
    return {
        username: 'example_user',
        email: 'user@example.com'
    };
}

app.listen(port, () => {
    console.log(`OAuth callback server listening at http://localhost:${port}/oauth2/callback`);
});