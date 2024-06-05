const axios = require('axios');

async function fetchRaidEvent(eventId) {
    try {
        const response = await axios.get(`https://api.raidhelper.com/event/${eventId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching event:', error);
        return null;
    }
}

module.exports = { fetchRaidEvent };
