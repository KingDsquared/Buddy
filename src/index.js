const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  AttachmentBuilder,
  PermissionsBitField
} = require("discord.js");

const db = require("./db");
const ui = require("./ui");
const { commands } = require("./commands");
const { startReminderLoop } = require("./reminders");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATABASE_URL = process.env.DATABASE_URL;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !DATABASE_URL) {
  console.error("Missing variables.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
  console.log("Slash commands registered.");
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
}

async function isOfficer(interaction) {
  if (isAdmin(interaction)) return true;

  const settings = await db.getGuildSettings(interaction.guildId);
  if (!settings?.officer_role_id) return false;

  return interaction.member?.roles?.cache?.has(settings.officer_role_id);
}

async function requireOfficer(interaction) {
  if (await isOfficer(interaction)) return true;

  await interaction.reply({
    content: "You need officer permission for this command.",
    ephemeral: true
  });

  return false;
}

async function refreshRaidMessage(raid) {
  if (!raid?.messageId) return;

  const channel = await client.channels.fetch(raid.channelId);
  const message = await channel.messages.fetch(raid.messageId);

  await message.edit({
    embeds: [ui.buildRaidEmbed(raid)],
    components: ui.raidButtons(raid.id, raid.status === "CLOSED")
  });
}

async function createRaidPost(interaction, raid) {
  await db.createRaid(raid);

  const msg = await interaction.reply({
    embeds: [ui.buildRaidEmbed(raid)],
    components: ui.raidButtons(raid.id),
    fetchReply: true
  });

  await db.setRaidMessageId(raid.id, msg.id);
}

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  await db.initDb();
  console.log("Database ready.");
  await registerCommands();
  startReminderLoop(client);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      if (name === "raid-create") {
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

        await createRaidPost(interaction, raid);
        return;
      }

      if (name === "raid-list") {
        const raids = await db.listRaids(interaction.guildId);
        await interaction.reply({ content: ui.buildRaidListText(raids), ephemeral: true });
        return;
      }

      if (name === "raid-roster") {
        const raid = await db.getRaid(interaction.options.getString("id", true));
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });
        await interaction.reply({ embeds: [ui.buildRaidEmbed(raid)], ephemeral: true });
        return;
      }

      if (name === "raid-edit") {
        if (!(await requireOfficer(interaction))) return;

        const raid = await db.updateRaid(interaction.options.getString("id", true), {
          title: interaction.options.getString("title"),
          time: interaction.options.getString("time"),
          note: interaction.options.getString("note") ?? undefined
        });

        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(raid);
        await interaction.reply({ content: `Updated raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (name === "raid-note") {
        if (!(await requireOfficer(interaction))) return;

        const raid = await db.updateRaid(interaction.options.getString("id", true), {
          note: interaction.options.getString("note", true)
        });

        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(raid);
        await interaction.reply({ content: "Raid note updated.", ephemeral: true });
        return;
      }

      if (name === "raid-close" || name === "raid-open") {
        if (!(await requireOfficer(interaction))) return;

        const status = name === "raid-close" ? "CLOSED" : "OPEN";
        const raid = await db.setRaidStatus(interaction.options.getString("id", true), status);

        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await refreshRaidMessage(raid);
        await interaction.reply({ content: `Raid is now ${status}.`, ephemeral: true });
        return;
      }

      if (name === "raid-delete") {
        if (!(await requireOfficer(interaction))) return;

        const id = interaction.options.getString("id", true);
        const raid = await db.getRaid(id);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        try {
          const channel = await client.channels.fetch(raid.channelId);
          const message = await channel.messages.fetch(raid.messageId);
          await message.delete();
        } catch {}

        await db.deleteRaid(id);
        await interaction.reply({ content: `Deleted raid: **${raid.title}**`, ephemeral: true });
        return;
      }

      if (name === "raid-ping") {
        if (!(await requireOfficer(interaction))) return;

        const raid = await db.getRaid(interaction.options.getString("id", true));
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        const signed = raid.signups.filter(s => s.status !== "Absent");
        if (!signed.length) {
          return interaction.reply({ content: "Nobody is signed up to ping.", ephemeral: true });
        }

        const message = interaction.options.getString("message") || "Raid reminder.";

        await interaction.reply({
          content: `**${raid.title}**\n${message}\n\n${signed.map(s => `<@${s.userId}>`).join(" ")}`,
          allowedMentions: { users: signed.map(s => s.userId) }
        });
        return;
      }

      if (name === "raid-reminder-add") {
        if (!(await requireOfficer(interaction))) return;

        const id = interaction.options.getString("id", true);
        const minutes = interaction.options.getInteger("minutes", true);

        const raid = await db.getRaid(id);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await db.addReminder(id, minutes);
        await interaction.reply({ content: `Reminder added: ${minutes} minutes before.`, ephemeral: true });
        return;
      }

      if (name === "raid-reminder-list") {
        const reminders = await db.listReminders(interaction.options.getString("id", true));
        await interaction.reply({ content: ui.buildReminderListText(reminders), ephemeral: true });
        return;
      }

      if (name === "raid-reminder-clear") {
        if (!(await requireOfficer(interaction))) return;

        await db.clearReminders(interaction.options.getString("id", true));
        await interaction.reply({ content: "Reminders cleared.", ephemeral: true });
        return;
      }

      if (name === "raid-template-create") {
        if (!(await requireOfficer(interaction))) return;

        const templateId = await db.createTemplate({
          guildId: interaction.guildId,
          name: interaction.options.getString("name", true),
          title: interaction.options.getString("title", true),
          note: interaction.options.getString("note") || "",
          createdBy: interaction.user.id
        });

        await interaction.reply({ content: `Template created. ID: \`${templateId}\``, ephemeral: true });
        return;
      }

      if (name === "raid-template-list") {
        const templates = await db.listTemplates(interaction.guildId);
        await interaction.reply({ content: ui.buildTemplateListText(templates), ephemeral: true });
        return;
      }

      if (name === "raid-template-use") {
        if (!(await requireOfficer(interaction))) return;

        const templateName = interaction.options.getString("name", true);
        const template = await db.getTemplate(interaction.guildId, templateName);

        if (!template) return interaction.reply({ content: "Template not found.", ephemeral: true });

        const raid = {
          id: Date.now().toString(),
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          title: template.title,
          time: interaction.options.getString("time", true),
          note: template.note || "",
          createdBy: interaction.user.id,
          status: "OPEN",
          signups: []
        };

        await createRaidPost(interaction, raid);
        return;
      }

      if (name === "raid-recurring-create") {
        if (!(await requireOfficer(interaction))) return;

        const id = await db.createRecurringRaid({
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          templateName: interaction.options.getString("template", true),
          dayOfWeek: interaction.options.getString("day", true).toLowerCase(),
          timeOfDay: interaction.options.getString("time", true),
          createdBy: interaction.user.id
        });

        await interaction.reply({ content: `Recurring raid created. ID: \`${id}\``, ephemeral: true });
        return;
      }

      if (name === "raid-recurring-list") {
        const rows = await db.listRecurringRaids(interaction.guildId);
        await interaction.reply({ content: ui.buildRecurringListText(rows), ephemeral: true });
        return;
      }

      if (name === "raid-recurring-delete") {
        if (!(await requireOfficer(interaction))) return;

        await db.deleteRecurringRaid(interaction.options.getString("id", true));
        await interaction.reply({ content: "Recurring raid deleted.", ephemeral: true });
        return;
      }

      if (name === "roster-move") {
        if (!(await requireOfficer(interaction))) return;

        const raidId = interaction.options.getString("raid_id", true);
        const user = interaction.options.getUser("user", true);
        const status = interaction.options.getString("status", true);

        const raid = await db.getRaid(raidId);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        const existing = raid.signups.find(s => s.userId === user.id);

        const updatedRaid = await db.upsertSignup({
          raidId,
          userId: user.id,
          username: existing?.username || user.username,
          status,
          className: existing?.className || null,
          role: interaction.options.getString("role") || existing?.role || null,
          spec: interaction.options.getString("spec") || existing?.spec || null,
          note: existing?.note || null
        });

        await refreshRaidMessage(updatedRaid);
        await interaction.reply({ content: `Moved ${user} to **${status}**.`, ephemeral: true });
        return;
      }

      if (name === "roster-note") {
        if (!(await requireOfficer(interaction))) return;

        const raidId = interaction.options.getString("raid_id", true);
        const user = interaction.options.getUser("user", true);
        const note = interaction.options.getString("note", true);

        const raid = await db.getRaid(raidId);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        const existing = raid.signups.find(s => s.userId === user.id);

        const updatedRaid = await db.upsertSignup({
          raidId,
          userId: user.id,
          username: existing?.username || user.username,
          status: existing?.status || "Maybe",
          className: existing?.className || null,
          role: existing?.role || null,
          spec: existing?.spec || null,
          note
        });

        await refreshRaidMessage(updatedRaid);
        await interaction.reply({ content: `Added note for ${user}.`, ephemeral: true });
        return;
      }

      if (name === "attendance-mark") {
        if (!(await requireOfficer(interaction))) return;

        const raidId = interaction.options.getString("raid_id", true);
        const user = interaction.options.getUser("user", true);
        const attended = interaction.options.getBoolean("attended", true);

        const raid = await db.getRaid(raidId);
        if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

        await db.markAttendance({
          raidId,
          userId: user.id,
          username: user.username,
          attended,
          markedBy: interaction.user.id
        });

        await interaction.reply({
          content: `Attendance marked for ${user}: ${attended ? "attended" : "missed"}.`,
          ephemeral: true
        });
        return;
      }

      if (name === "attendance-view") {
        const rows = await db.getAttendance(interaction.options.getString("raid_id", true));
        await interaction.reply({ content: ui.buildAttendanceText(rows), ephemeral: true });
        return;
      }

      if (name === "character-link") {
        const id = await db.linkCharacter({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          name: interaction.options.getString("name", true),
          realm: interaction.options.getString("realm", true),
          region: interaction.options.getString("region", true),
          className: interaction.options.getString("class") || null,
          isMain: interaction.options.getBoolean("main") || false
        });

        await interaction.reply({ content: `Character linked. ID: \`${id}\``, ephemeral: true });
        return;
      }

      if (name === "character-list") {
        const chars = await db.listCharacters(interaction.guildId, interaction.user.id);
        await interaction.reply({ content: ui.buildCharacterListText(chars), ephemeral: true });
        return;
      }

      if (name === "officer-role-set") {
        if (!isAdmin(interaction)) {
          return interaction.reply({
            content: "Only server admins can set the officer role.",
            ephemeral: true
          });
        }

        const role = interaction.options.getRole("role", true);
        await db.setOfficerRole(interaction.guildId, role.id);

        await interaction.reply({ content: `Officer role set to ${role}.`, ephemeral: true });
        return;
      }

      if (name === "raid-export") {
        if (!(await requireOfficer(interaction))) return;

        const id = interaction.options.getString("id", true);
        const exportData = await db.getRaidExportData(id);
        const text = ui.buildRaidExportText(exportData);

        const file = new AttachmentBuilder(Buffer.from(text, "utf8"), {
          name: `raid-export-${id}.txt`
        });

        await interaction.reply({
          content: "Raid export:",
          files: [file],
          ephemeral: true
        });
        return;
      }
    }

    if (interaction.isButton()) {
      const [type, action, raidId] = interaction.customId.split(":");
      if (type !== "raid") return;

      const raid = await db.getRaid(raidId);
      if (!raid) return interaction.reply({ content: "Raid not found.", ephemeral: true });

      if (raid.status === "CLOSED" && action !== "withdraw") {
        return interaction.reply({ content: "This raid is closed.", ephemeral: true });
      }

      if (action === "join" || action === "change") {
        await interaction.reply({
          content: action === "join" ? "Select your Horde TBC class:" : "Change your Horde TBC class/spec:",
          components: ui.classMenu(raidId),
          ephemeral: true
        });
        return;
      }

      const statusMap = {
        bench: "Bench",
        late: "Late",
        maybe: "Maybe",
        absent: "Absent"
      };

      let updatedRaid;

      if (action === "withdraw") {
        updatedRaid = await db.removeSignup(raidId, interaction.user.id);
      } else {
        const existing = raid.signups.find(s => s.userId === interaction.user.id);

        updatedRaid = await db.upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: statusMap[action],
          className: existing?.className || null,
          role: existing?.role || null,
          spec: existing?.spec || null,
          note: existing?.note || null
        });
      }

      await interaction.update({
        embeds: [ui.buildRaidEmbed(updatedRaid)],
        components: ui.raidButtons(updatedRaid.id, updatedRaid.status === "CLOSED")
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("class:")) {
        const [, raidId] = interaction.customId.split(":");
        const className = interaction.values[0];

        await interaction.update({
          content: `Class selected: **${className}**. Now choose spec:`,
          components: ui.specMenu(raidId, className)
        });
        return;
      }

      if (interaction.customId.startsWith("spec:")) {
        const [, raidId, className] = interaction.customId.split(":");
        const [spec, role] = interaction.values[0].split("|");

        const raid = await db.getRaid(raidId);
        if (!raid || raid.status === "CLOSED") {
          return interaction.update({ content: "This raid is closed or missing.", components: [] });
        }

        const existing = raid.signups.find(s => s.userId === interaction.user.id);

        const updatedRaid = await db.upsertSignup({
          raidId,
          userId: interaction.user.id,
          username: interaction.member?.displayName || interaction.user.username,
          status: existing?.status && existing.status !== "Absent" ? existing.status : "Going",
          className,
          role,
          spec,
          note: existing?.note || null
        });

        await refreshRaidMessage(updatedRaid);

        await interaction.update({
          content: `Signed up as **${spec} ${className}**.`,
          components: []
        });
        return;
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  }
});

client.login(TOKEN);
