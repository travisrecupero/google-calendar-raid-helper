const { google } = require('googleapis');
require('dotenv').config();
const config = require('./config.json');

const { OAuth2 } = google.auth;
const calendar = google.calendar('v3');

const oAuth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

async function addEventToCalendar(event) {
    const eventStartTime = new Date(event.startTime * 1000);
    const eventEndTime = new Date(event.endTime * 1000);

    const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
            dateTime: eventStartTime.toISOString(),
            timeZone: config.calendar.timezone,
        },
        end: {
            dateTime: eventEndTime.toISOString(),
            timeZone: config.calendar.timezone,
        },
    };

    try {
        const response = await calendar.events.insert({
            auth: oAuth2Client,
            calendarId: config.calendar.calendarId,
            resource: calendarEvent,
        });
        console.log('Event created: %s', response.data.htmlLink);
    } catch (error) {
        console.error('Error creating event:', error);
    }
}

module.exports = { addEventToCalendar };
