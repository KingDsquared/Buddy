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
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  initDb,
  createRaid,
  setRaidMessageId,
  upsertSignup,
  removeSignup
} = require("./db");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATABASE_URL = process.env.DATABASE_URL;

console.log("Env check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DISCORD_TOKEN:", !!TOKEN);
console.log("DISCORD_CLIENT_ID:", !!CLIENT_ID);
console.log("DISCORD_GUILD_ID:", !!GUILD_ID);
console.log("DATABASE_URL:", !!DATABASE_URL);
console.log(
  "Discord/db keys present:",
  Object.keys(process.env).filter(k =>
    ["DISCORD", "DATABASE", "PG", "NODE_ENV"].some(prefix => k.startsWith(prefix))
  )
);

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !DATABASE_URL) {
  console.error("Missing Railway variables.");
  console.error("Need DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, DATABASE_URL");
  process.exit(1);
}

const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Flex"];

const specs = {
  Tank: ["Blood DK", "Vengeance DH", "Guardian Druid", "Brewmaster Monk", "Protection Paladin", "Protection Warrior"],
  Healer: ["Holy Paladin", "Restoration Druid", "Mistweaver Monk", "Holy Priest", "Discipline Priest", "Restoration Shaman", "Preservation Evoker"],
  "Melee DPS": ["Arms Warrior", "Fury Warrior", "Frost DK", "Unholy DK", "Havoc DH", "Feral Druid", "Windwalker Monk", "Retribution Paladin", "Assassination Rogue", "Outlaw Rogue", "Subtlety Rogue", "Enhancement Shaman", "Survival Hunter"],
  "Ranged DPS": ["Arcane Mage", "Fire Mage", "Frost Mage", "Balance Druid", "Beast Mastery Hunter", "Marksmanship Hunter", "Devastation Evoker", "Shadow Priest", "Elemental Shaman", "Affliction Warlock", "Demonology Warlock", "Destruction Warlock"],
  Flex: ["Flexible"]
};

const commands = [
  new SlashCommandBuilder()
    .setName("raid-create")
    .setDescription("Create a raid signup")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Raid title")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("time")
        .setDescription("Raid time, example: Friday 20:00")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("note")
        .setDescription("Optional note")
        .setRequired(false)
    )
].map(c => c.toJSON());

function buttons(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:join:${raidId}`)
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

function roleMenu(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`role:${raidId}`)
        .setPlaceholder("Choose your raid role")
        .addOptions(roles.map(r => ({ label: r, value: r })))
    )
  ];
}

function specMenu(raidId, role) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spec:${raidId}:${role}`)
        .setPlaceholder("Choose your spec")
        .addOptions(specs[role].map(s => ({ label: s, value: s })))
    )
  ];
}

function embed(raid) {
  const signups = raid.signups || [];

  const byStatus = status => signups.filter(s => s.status === status);

  const going = byStatus("Going");
  const late = byStatus("Late");
  const maybe = byStatus("Maybe");
  const absent = byStatus("Absent");

  const goingText = roles.map(role => {
    const people = going.filter(s => s.role === role);
    if (!people.length) return null;

    return `**${role} (${people.length})**\n${people
      .map(p => `• ${p.username}${p.spec ? ` — ${p.spec}` : ""}`)
      .join("\n")}`;
  }).filter(Boolean).join("\n\n") || "Nobody";

  const list = arr => arr.length
    ? arr.map(p => `• ${p.username}${p.spec ? ` — ${p.spec}` : ""}`).join("\n")
    : "Nobody";

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `**Time:** ${raid.time}\n` +
      `**Note:** ${raid.note || "None"}\n\n` +
      `No signup limits.`
    )
    .addFields(
      { name: `Going (${going.length})`, value: goingText },
      { name: `Late (${late.length})`, value: list(late) },
      { name: `Maybe (${maybe.length})`, value: list(maybe) },
      { name: `Absent (${absent.length})`, value: list(absent) }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);

  await initDb();
  console.log("Database ready.");

  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "raid-create") {
      const raid = {
        id: Date.now().toString(),
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        title: interaction.options.getString("title", true),
        time: interaction.options.getString("time", true),
        note: interaction.options.getString("note") || "",
        createdBy: interaction.user.id,
        signups: []
      };

      await createRaid(raid);

      const msg = await interaction.reply({
        embeds: [embed(raid)],
        components: buttons(raid.id),
        fetchReply: true
      });

      await setRaidMessageId(raid.id, msg.id);
      return;
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");

      if (type !== "raid") return;

      if (action === "join") {
        await interaction.reply({
          content: "Choose your role:",
          components: roleMenu(raidId),
          ephemeral: true
        });
        return;
      }

      const statusMap = {
        late: "Late",
        maybe: "Maybe",
        absent: "Absent"
      };

      let raid;

      if (action === "withdraw") {
        raid = await removeSignup(raidId, interaction.user.id);
      } else {
        raid = await upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: statusMap[action],
          role: null,
          spec: null
        });
      }

      if (!raid) {
        await interaction.reply({
          content: "Raid not found.",
          ephemeral: true
        });
        return;
      }

      await interaction.update({
        embeds: [embed(raid)],
        components: buttons(raid.id)
      });

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("role:")) {
        const [, raidId] = interaction.customId.split(":");
        const role = interaction.values[0];

        await interaction.update({
          content: `Role selected: **${role}**. Now choose spec:`,
          components: specMenu(raidId, role)
        });

        return;
      }

      if (interaction.customId.startsWith("spec:")) {
        const [, raidId, role] = interaction.customId.split(":");
        const spec = interaction.values[0];

        const raid = await upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: "Going",
          role,
          spec
        });

        if (!raid) {
          await interaction.reply({
            content: "Raid not found.",
            ephemeral: true
          });
          return;
        }

        const channel = await client.channels.fetch(raid.channelId);
        const message = await channel.messages.fetch(raid.messageId);

        await message.edit({
          embeds: [embed(raid)],
          components: buttons(raid.id)
        });

        await interaction.update({
          content: `Signed up as **${spec}**.`,
          components: []
        });

        return;
      }
    }
  } catch (err) {
    console.error("Interaction error:");
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong.",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
