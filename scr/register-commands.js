const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("raid-create")
    .setDescription("Create a raid signup post")
    .addStringOption(opt =>
      opt.setName("title")
        .setDescription("Raid title")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("starts")
        .setDescription("Start time text, e.g. Friday 20:00")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("note")
        .setDescription("Optional raid note")
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
