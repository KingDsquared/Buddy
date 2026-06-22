const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

console.log("Starting RaidForge...");
console.log("Has token:", Boolean(TOKEN));
console.log("Has client id:", Boolean(CLIENT_ID));
console.log("Has guild id:", Boolean(GUILD_ID));

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Missing one or more Railway variables:");
  console.error("DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID");
  process.exit(1);
}

const raids = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Test if the bot is alive"),

  new SlashCommandBuilder()
    .setName("raid-create")
    .setDescription("Create a raid signup")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Raid title")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("time")
        .setDescription("Raid time, example: Friday 20:00")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("note")
        .setDescription("Optional note")
        .setRequired(false)
    )
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered.");
}

function makeRaidEmbed(raid) {
  const going = raid.signups.filter(s => s.status === "Going");
  const late = raid.signups.filter(s => s.status === "Late");
  const maybe = raid.signups.filter(s => s.status === "Maybe");
  const absent = raid.signups.filter(s => s.status === "Absent");

  const list = arr => arr.length
    ? arr.map(s => `• ${s.name}`).join("\n")
    : "Nobody";

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `**Time:** ${raid.time}\n` +
      `**Note:** ${raid.note || "None"}\n\n` +
      `No signup limits.`
    )
    .addFields(
      { name: `Going (${going.length})`, value: list(going) },
      { name: `Late (${late.length})`, value: list(late) },
      { name: `Maybe (${maybe.length})`, value: list(maybe) },
      { name: `Absent (${absent.length})`, value: list(absent) }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

function makeButtons(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:going:${raidId}`)
        .setLabel("Join")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`raid:late:${raidId}`)
        .setLabel("Late")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`raid:maybe:${raidId}`)
        .setLabel("Maybe")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`raid:absent:${raidId}`)
        .setLabel("Absent")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`raid:withdraw:${raidId}`)
        .setLabel("Withdraw")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function updateSignup(raid, user, status) {
  raid.signups = raid.signups.filter(s => s.userId !== user.id);

  if (status !== "Withdraw") {
    raid.signups.push({
      userId: user.id,
      name: user.displayName || user.username,
      status
    });
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);

  try {
    await registerCommands();
  } catch (err) {
    console.error("Command registration failed:");
    console.error(err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ping") {
        await interaction.reply("Pong. RaidForge is online.");
        return;
      }

      if (interaction.commandName === "raid-create") {
        const raid = {
          id: Date.now().toString(),
          title: interaction.options.getString("title", true),
          time: interaction.options.getString("time", true),
          note: interaction.options.getString("note") || "",
          signups: []
        };

        raids.set(raid.id, raid);

        await interaction.reply({
          embeds: [makeRaidEmbed(raid)],
          components: makeButtons(raid.id)
        });

        return;
      }
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");

      if (type !== "raid") return;

      const raid = raids.get(raidId);

      if (!raid) {
        await interaction.reply({
          content: "Raid not found. Railway may have restarted, so the test data was cleared.",
          ephemeral: true
        });
        return;
      }

      const statusMap = {
        going: "Going",
        late: "Late",
        maybe: "Maybe",
        absent: "Absent",
        withdraw: "Withdraw"
      };

      updateSignup(raid, interaction.user, statusMap[action]);

      await interaction.update({
        embeds: [makeRaidEmbed(raid)],
        components: makeButtons(raid.id)
      });
    }
  } catch (err) {
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: "Something went wrong.",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
