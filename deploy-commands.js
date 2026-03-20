require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('addevent')
        .setDescription('Add a Raid Helper event to your Google Calendar')
        .addStringOption(option =>
            option
                .setName('raid_id')
                .setDescription('The Raid Helper event ID')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the bot for this server (admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option
                .setName('raid_helper_api_key')
                .setDescription('Your Raid Helper API key (use /apikey refresh with Raid Helper bot)')
                .setRequired(true)
        ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );
        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error('Error registering commands:', error);
        process.exit(1);
    }
})();
