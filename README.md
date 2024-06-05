# google-calendar-raid-helper

This project is a Discord bot that integrates with Raid Helper to fetch event details and add them to Google Calendar. It helps manage WoW raid events efficiently.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [Discord account](https://discord.com/)
- [Google account](https://accounts.google.com/)

## Installation

1. **Clone the Repository**:

    ```bash
    git clone https://github.com/yourusername/discord-raidhelper-bot.git
    cd discord-raidhelper-bot
    ```

2. **Install Dependencies**:

    ```bash
    npm install
    ```

3. **Create Google API Credentials**:
    - Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project if you don’t have one.
    - Enable the Google Calendar API.
    - Create OAuth 2.0 credentials (client ID and client secret).
    - Obtain a refresh token.

4. **Create and Populate Configuration Files**:
    - Create a `config.json` file in the root directory with your Google API credentials:

        ```json
        {
            "googleCalendar": {
                "clientId": "YOUR_CLIENT_ID",
                "clientSecret": "YOUR_CLIENT_SECRET",
                "redirectUri": "YOUR_REDIRECT_URI",
                "refreshToken": "YOUR_REFRESH_TOKEN"
            }
        }
        ```

    - Create a `.env` file in the root directory with your Discord bot token:

        ```plaintext
        DISCORD_BOT_TOKEN=your_discord_bot_token
        ```

5. **Run the Bot**:

    ```bash
    node index.js
    ```

## Configuration

- **Google API Credentials**: Follow the steps in the [Installation](#installation) section to obtain these credentials and populate the `config.json` file.
- **Discord Bot Token**: Create a Discord bot, invite it to your server, and get the token. Populate the `.env` file with this token.

## Usage

- **Add Event Command**:
  - Use the `!addevent <eventID>` command in your Discord server to fetch event details from Raidhelper and add them to Google Calendar.
  - Example:
        `!addevent 1234567890`

## Project Structures

- **index.js**: The main entry point of the bot. Initializes the bot and handles commands.
- **config.json**: Contains Google API credentials.
- **fetchRaidEvent.js**: Module to fetch event details from Raidhelper.
- **addEventToCalendar.js**: Module to add events to Google Calendar.
- **.env**: Contains environment variables like the Discord bot token.
- **.gitignore**: Specifies files and directories to ignore in version control.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
