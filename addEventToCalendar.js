const { google } = require('googleapis');
const { googleCalendar } = require('./config.json');

const { OAuth2 } = google.auth;
const calendar = google.calendar('v3');

const oAuth2Client = new OAuth2(
    googleCalendar.clientId,
    googleCalendar.clientSecret,
    googleCalendar.redirectUri
);

oAuth2Client.setCredentials({
    refresh_token: googleCalendar.refreshToken,
});

async function addEventToCalendar(event) {
    const eventStartTime = new Date(event.startTime * 1000);
    const eventEndTime = new Date(event.endTime * 1000);

    const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
            dateTime: eventStartTime.toISOString(),
            timeZone: 'America/New_York', // Set your time zone
        },
        end: {
            dateTime: eventEndTime.toISOString(),
            timeZone: 'America/New_York',
        },
    };

    try {
        const response = await calendar.events.insert({
            auth: oAuth2Client,
            calendarId: 'primary',
            resource: calendarEvent,
        });
        console.log('Event created: %s', response.data.htmlLink);
    } catch (error) {
        console.error('Error creating event:', error);
    }
}

function getAuthorizationUrl() {
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
    return `https://accounts.google.com/o/oauth2/v2/auth` +
        `?response_type=code` +
        `&client_id=${googleCalendar.clientId}` +
        `&redirect_uri=${encodeURIComponent(googleCalendar.redirectUri)}` +
        `&scope=${scopes}`;
}

console.log(getAuthorizationUrl);
module.exports = { addEventToCalendar, getAuthorizationUrl };
