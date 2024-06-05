const axios = require('axios');

async function fetchRaidEvent(eventId) {
    try {
        const response = await axios.get(`https://raid-helper.dev/api/v2/events/${eventId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching event:', error);
        return null;
    }
}

module.exports = { fetchRaidEvent };
