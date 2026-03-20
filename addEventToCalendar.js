const { google } = require('googleapis');

const calendar = google.calendar('v3');

async function addEventToCalendar(oAuth2Client, event) {
    const eventStartTime = new Date(event.startTime * 1000);
    const eventEndTime = new Date(event.endTime * 1000);

    const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
            dateTime: eventStartTime.toISOString(),
        },
        end: {
            dateTime: eventEndTime.toISOString(),
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
        throw error;
    }
}

module.exports = { addEventToCalendar };
