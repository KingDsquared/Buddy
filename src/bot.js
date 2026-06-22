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
  updateRaid,
  deleteRaid,
  setRaidStatus,
  listRaids,
  getRaid,
  upsertSignup,
  removeSignup
} = require("./db");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATABASE_URL = process.env.DATABASE_URL;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !DATABASE_URL) {
  console.error("Missing Railway variables.");
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
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Optional note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-list")
    .setDescription("Show recent raids"),

  new SlashCommandBuilder()
    .setName("raid-roster")
    .setDescription("Show a raid roster")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-close")
    .setDescription("Close raid signups")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-open")
    .setDescription("Open raid signups")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-delete")
    .setDescription("Delete a raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-edit")
    .setDescription("Edit raid title, time, or note")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("New title").setRequired(false))
    .addStringOption(o => o.setName("time").setDescription("New time").setRequired(false))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-note")
    .setDescription("Update only the raid note")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-ping")
    .setDescription("Ping everyone signed up to a raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Optional ping message").setRequired(false))
].map(c => c.toJSON());

function buttons(raidId, closed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`raid:join:${raidId}`).setLabel("Join").setStyle(ButtonStyle.Success).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:late:${raidId}`).setLabel("Late").setStyle(ButtonStyle.Primary).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:maybe:${raidId}`).setLabel("Maybe").setStyle(ButtonStyle.Secondary).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:absent:${raidId}`).setLabel("Absent").setStyle(ButtonStyle.Danger).setDisabled(closed),
      new ButtonBuilder().setCustomId(`raid:withdraw:${raidId}`).setLabel("Withdraw").setStyle(ButtonStyle.Secondary)
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

function raidEmbed(raid) {
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
      `**Status:** ${raid.status}\n` +
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

async function refreshRaidMessage(client, raid) {
  if (!raid || !raid.messageId) return;

  const channel = await client.channels.fetch(raid.channelId);
  const message = await channel.messages.fetch(raid.messageId);

  await message.edit({
    embeds: [raidEmbed(raid)],
    components: buttons(raid.id, raid.status === "CLOSED")
  });
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Slash commands registered.");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  await initDb();
  console.log("Database ready.");
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "raid-create") {
        const raid = {
          id: Date.now().toString(),
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          title: interaction.options.getString("title", true),
          time: interaction.options.getString("time", true),
          note: interaction.options.getString("note") || "",
          createdBy: interaction.user.id,
          status: "OPEN",
          signups: []
        };

        await createRaid(raid);

        const msg = await interaction.reply({
          embeds: [raidEmbed(raid)],
          components: buttons(raid.id),
          fetchReply: true
        });

        await setRaidMessageId(raid.id, msg.id);
        return;
      }

      if (interaction.commandName === "raid-list") {
        const raids = await listRaids(interaction.guildId);

        if (!raids.length) {
          await interaction.reply({ content: "No raids found.", ephemeral: true });
          return;
        }

        const text = raids.map(r =>
          `**${r.title}** — ${r.raid_time}\nStatus: ${r.status} | ID: \`${r.id}\``
        ).join("\n\n");

        await interaction.reply({ content: text, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-roster") {
        const id = interaction.options.getString("id", true);
        const raid = await getRaid(id);

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await interaction.reply({ embeds: [raidEmbed(raid)], ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-close") {
        const id = interaction.options.getString("id", true);
        const raid = await setRaidStatus(id, "CLOSED");

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Closed raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-open") {
        const id = interaction.options.getString("id", true);
        const raid = await setRaidStatus(id, "OPEN");

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Opened raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-delete") {
        const id = interaction.options.getString("id", true);
        const raid = await getRaid(id);

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        try {
          const channel = await client.channels.fetch(raid.channelId);
          const message = await channel.messages.fetch(raid.messageId);
          await message.delete();
        } catch {}

        await deleteRaid(id);
        await interaction.reply({ content: `Deleted raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-edit") {
        const id = interaction.options.getString("id", true);
        const title = interaction.options.getString("title");
        const time = interaction.options.getString("time");
        const note = interaction.options.getString("note");

        if (!title && !time && note === null) {
          await interaction.reply({
            content: "Give me at least one thing to edit: title, time, or note.",
            ephemeral: true
          });
          return;
        }

        const raid = await updateRaid(id, {
          title,
          time,
          note: note === null ? undefined : note
        });

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Updated raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-note") {
        const id = interaction.options.getString("id", true);
        const note = interaction.options.getString("note", true);

        const raid = await updateRaid(id, { note });

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        await refreshRaidMessage(client, raid);
        await interaction.reply({ content: `Updated note for **${raid.title}**`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "raid-ping") {
        const id = interaction.options.getString("id", true);
        const message = interaction.options.getString("message") || "Raid reminder.";

        const raid = await getRaid(id);

        if (!raid) {
          await interaction.reply({ content: "Raid not found.", ephemeral: true });
          return;
        }

        const signed = raid.signups.filter(s => s.status !== "Absent");

        if (!signed.length) {
          await interaction.reply({ content: "Nobody is signed up to ping.", ephemeral: true });
          return;
        }

        const mentions = signed.map(s => `<@${s.userId}>`).join(" ");

        await interaction.reply({
          content: `**${raid.title}**\n${message}\n\n${mentions}`,
          allowedMentions: { users: signed.map(s => s.userId) }
        });

        return;
      }
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");
      if (type !== "raid") return;

      const existingRaid = await getRaid(raidId);
      if (!existingRaid) {
        await interaction.reply({ content: "Raid not found.", ephemeral: true });
        return;
      }

      if (existingRaid.status === "CLOSED" && action !== "withdraw") {
        await interaction.reply({ content: "This raid is closed.", ephemeral: true });
        return;
      }

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

      await interaction.update({
        embeds: [raidEmbed(raid)],
        components: buttons(raid.id, raid.status === "CLOSED")
      });

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("role:")) {
        const [, raidId] = interaction.customId.split(":");
        const raid = await getRaid(raidId);

        if (!raid || raid.status === "CLOSED") {
          await interaction.update({ content: "This raid is closed or missing.", components: [] });
          return;
        }

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

        const oldRaid = await getRaid(raidId);
        if (!oldRaid || oldRaid.status === "CLOSED") {
          await interaction.update({ content: "This raid is closed or missing.", components: [] });
          return;
        }

        const raid = await upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: "Going",
          role,
          spec
        });

        await refreshRaidMessage(client, raid);

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
      await interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  }
});

client.login(TOKEN);
