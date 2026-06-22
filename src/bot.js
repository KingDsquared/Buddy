const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");

const {
  createRaid,
  setRaidMessageId,
  upsertSignup,
  removeSignup
} = require("./store");

const {
  buildRaidEmbed,
  buildSignupButtons,
  buildRoleSelect,
  buildSpecSelect
} = require("./ui");

// TEMP RAILWAY DEBUG
console.log("Railway env check:");
console.log("Has DISCORD_TOKEN?", Boolean(process.env.DISCORD_TOKEN));
console.log(
  "Discord env keys found:",
  Object.keys(process.env).filter((key) => key.includes("DISCORD"))
);

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN");
  console.error("Make sure DISCORD_TOKEN is added to the same Railway service that runs this bot.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "raid-create") {
        const title = interaction.options.getString("title", true);
        const starts = interaction.options.getString("starts", true);
        const note = interaction.options.getString("note") || "";

        const raid = createRaid({
          title,
          starts,
          note,
          createdBy: interaction.user.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId
        });

        const msg = await interaction.reply({
          embeds: [buildRaidEmbed(raid)],
          components: buildSignupButtons(raid.id),
          fetchReply: true
        });

        setRaidMessageId(raid.id, msg.id);
        return;
      }
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");

      if (type !== "raid") return;

      if (action === "join") {
        await interaction.reply({
          content: "Choose your role:",
          components: [buildRoleSelect(raidId)],
          ephemeral: true
        });
        return;
      }

      const statusMap = {
        late: "LATE",
        maybe: "MAYBE",
        absent: "ABSENT"
      };

      if (statusMap[action]) {
        const raid = upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.user.displayName || interaction.user.username,
          status: statusMap[action]
        });

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await interaction.update({
          embeds: [buildRaidEmbed(raid)],
          components: buildSignupButtons(raidId)
        });
        return;
      }

      if (action === "withdraw") {
        const raid = removeSignup({
          raidId,
          userId: interaction.user.id
        });

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await interaction.update({
          embeds: [buildRaidEmbed(raid)],
          components: buildSignupButtons(raidId)
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("role:")) {
        const [, raidId] = interaction.customId.split(":");
        const role = interaction.values[0];

        await interaction.update({
          content: `Role selected: **${role}**. Now choose your spec:`,
          embeds: [],
          components: [buildSpecSelect(raidId, role)]
        });
        return;
      }

      if (interaction.customId.startsWith("spec:")) {
        const [, raidId, role] = interaction.customId.split(":");
        const spec = interaction.values[0];

        const raid = upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.user.displayName || interaction.user.username,
          status: "GOING",
          role,
          spec
        });

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        const channel = interaction.channel;
        const message = await channel.messages.fetch(raid.messageId);

        await message.edit({
          embeds: [buildRaidEmbed(raid)],
          components: buildSignupButtons(raid.id)
        });

        await interaction.update({
          content: `You're signed up as **${spec}** (${role}).`,
          embeds: [],
          components: []
        });

        return;
      }
    }
  } catch (err) {
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong.",
        ephemeral: true
      });
    }
  }
});

client.login(token);
