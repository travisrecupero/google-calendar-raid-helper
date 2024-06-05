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
            timeZone: 'America/Los_Angeles', // Set your time zone
        },
        end: {
            dateTime: eventEndTime.toISOString(),
            timeZone: 'America/Los_Angeles',
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

module.exports = { addEventToCalendar };
