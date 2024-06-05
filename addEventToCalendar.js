const { google } = require('googleapis');
const config = require('./config.json');

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar('v3');

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
        throw error;
    }
}

module.exports = { addEventToCalendar };
