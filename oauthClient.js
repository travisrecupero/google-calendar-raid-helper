const { google } = require('googleapis');

// Initialize the OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Export the initialized OAuth2 client
module.exports = oAuth2Client;
