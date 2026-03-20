const express = require('express');
const { google } = require('googleapis');
const { verifyState, encrypt, generateCodeVerifier, generateCodeChallenge } = require('./crypto-utils');
const { setToken, setCodeVerifier, getCodeVerifier, cleanExpiredVerifiers } = require('./db');

const router = express.Router();

function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// Step 1: User clicks the auth link — verify state, generate PKCE, redirect to Google
router.get('/auth/google', (req, res) => {
    const { state } = req.query;
    if (!state) {
        return res.status(400).send('Missing state parameter.');
    }

    const discordUserId = verifyState(state);
    if (!discordUserId) {
        return res.status(403).send('Invalid or expired authorization link. Please run /addevent again in Discord to get a new link.');
    }

    // Generate PKCE verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store verifier keyed by state for retrieval in callback
    cleanExpiredVerifiers();
    setCodeVerifier(state, codeVerifier);

    const oAuth2Client = createOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    res.redirect(authUrl);
});

// Step 2: Google redirects back with auth code
router.get('/auth/google/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`Authorization denied: ${error}`);
    }

    if (!code || !state) {
        return res.status(400).send('Missing code or state parameter.');
    }

    const discordUserId = verifyState(state);
    if (!discordUserId) {
        return res.status(403).send('Invalid or expired authorization link. Please run /addevent again in Discord to get a new link.');
    }

    // Retrieve PKCE verifier
    const codeVerifier = getCodeVerifier(state);
    if (!codeVerifier) {
        return res.status(400).send('PKCE verification failed. Please run /addevent again in Discord to get a new link.');
    }

    try {
        const oAuth2Client = createOAuth2Client();
        const { tokens } = await oAuth2Client.getToken({
            code,
            codeVerifier,
        });

        if (!tokens.refresh_token) {
            return res.status(400).send('No refresh token received. Please try again — Google may require you to revoke access first at https://myaccount.google.com/permissions');
        }

        const encryptedToken = encrypt(tokens.refresh_token);
        const expiresAt = tokens.expiry_date || null;
        setToken(discordUserId, encryptedToken, expiresAt);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Success!</title></head>
            <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #36393f; color: #fff;">
                <div style="text-align: center;">
                    <h1>Google Calendar linked!</h1>
                    <p>You can close this tab and go back to Discord.</p>
                    <p>Run <code>/addevent</code> again to add your event.</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('OAuth callback error:', err);
        res.status(500).send('Failed to complete authorization. Please try again.');
    }
});

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

module.exports = router;
