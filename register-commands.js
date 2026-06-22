import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('raid-create')
    .setDescription('Create an unlimited WoW raid signup')
    .addStringOption(option => option.setName('title').setDescription('Raid title').setRequired(true))
    .addStringOption(option => option.setName('starts').setDescription('Start time, e.g. Friday 20:00').setRequired(true))
    .addStringOption(option => option.setName('note').setDescription('Optional raid note').setRequired(false))
].map(command => command.toJSON());

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  throw new Error('Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID in .env');
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands });
console.log('Registered guild slash commands.');
