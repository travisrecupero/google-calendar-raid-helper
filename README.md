# google-calendar-raid-helper

A Discord bot that fetches [Raid Helper](https://raid-helper.dev/) events and adds them to your Google Calendar. Each user links their own Google account via OAuth — no shared tokens, no manual setup.

## Add to Your Server

**If someone is already hosting this bot**, just use the invite link they provide. Then:

1. A server admin runs `/setup` to connect the bot to Raid Helper (see [Server Setup](#server-setup))
2. Members use `/addevent` to add events to their personal Google Calendar

## Self-Hosting

If you want to run your own instance of this bot, follow the steps below.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- A server or VM to run the bot 24/7 (e.g., [GCP free tier e2-micro](https://cloud.google.com/free))
- A [Discord application](https://discord.com/developers/applications)
- A [Google Cloud project](https://console.cloud.google.com/) with the Calendar API enabled

### 1. Create a Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, copy the bot token.
3. Note the **Application ID** (Client ID) from the General Information page.
4. Generate an invite link: **OAuth2 → URL Generator** → select `bot` and `applications.commands` scopes, `Send Messages` permission.

### 2. Create Google OAuth credentials

1. In the [Google Cloud Console](https://console.cloud.google.com/), enable the **Google Calendar API**.
2. Under **Credentials**, create an **OAuth 2.0 Client ID** (type: **Web application**).
3. Add your redirect URI: `http://<YOUR_SERVER_IP>/auth/google/callback`

### 3. Configure environment

```bash
git clone https://github.com/travisrecupero/google-calendar-raid-helper.git
cd google-calendar-raid-helper
cp .env.example .env
```

Fill in `.env` with your Discord and Google credentials. Generate encryption keys:

```bash
docker run --rm node:20-slim node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that twice — once for `TOKEN_ENCRYPTION_KEY`, once for `STATE_SECRET`.

### 4. Build, register commands, and run

```bash
docker build -t raid-helper .
docker run --rm --env-file .env raid-helper node deploy-commands.js
docker run -d --name raid-helper --env-file .env -p 80:80 -v raid-helper-data:/app/data --restart unless-stopped raid-helper
```

View logs:
```bash
docker logs -f raid-helper
```

## Server Setup

After the bot is added to a Discord server, an admin needs to connect it to Raid Helper:

1. Make sure the [Raid Helper bot](https://raid-helper.dev/) is in your server
2. Run `/apikey refresh` with Raid Helper to generate an API key
3. Run `/apikey show` to copy the key
4. Run `/setup raid_helper_api_key:<your key>` with this bot

That's it — members can now use `/addevent`.

## Usage

```
/addevent raid_id:<event>
```

- Start typing in the `raid_id` field to see a list of your server's Raid Helper events
- The first time, the bot sends a private link to authorize your Google Calendar
- After authorizing, events are added directly to your calendar

## Project Structure

- **index.js** — Entry point: Express server + Discord client
- **deploy-commands.js** — Registers `/addevent` and `/setup` slash commands
- **fetchRaidEvent.js** — Fetches event details from Raid Helper API
- **addEventToCalendar.js** — Adds events to Google Calendar
- **db.js** — SQLite database for per-user tokens and per-server config
- **oauthCallbackServer.js** — Express routes for Google OAuth flow
- **crypto-utils.js** — AES-256-GCM encryption and HMAC state signing
- **Dockerfile** — Container setup

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
