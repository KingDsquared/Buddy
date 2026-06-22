const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const { roles, specs } = require("./config");

function raidButtons(raidId, closed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:join:${raidId}`)
        .setLabel("Join")
        .setStyle(ButtonStyle.Success)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:change:${raidId}`)
        .setLabel("Change Role/Spec")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:late:${raidId}`)
        .setLabel("Late")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:maybe:${raidId}`)
        .setLabel("Maybe")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:withdraw:${raidId}`)
        .setLabel("Withdraw")
        .setStyle(ButtonStyle.Danger)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:absent:${raidId}`)
        .setLabel("Absent")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed)
    )
  ];
}

function roleMenu(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`role:${raidId}`)
        .setPlaceholder("Choose your raid role")
        .addOptions(roles.map(role => ({
          label: role,
          value: role
        })))
    )
  ];
}

function specMenu(raidId, role) {
  const roleSpecs = specs[role] || ["Flexible"];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spec:${raidId}:${role}`)
        .setPlaceholder("Choose your spec")
        .addOptions(roleSpecs.map(spec => ({
          label: spec,
          value: spec
        })))
    )
  ];
}

function groupSignups(signups = []) {
  const byStatus = status => signups.filter(s => s.status === status);

  return {
    going: byStatus("Going"),
    late: byStatus("Late"),
    maybe: byStatus("Maybe"),
    bench: byStatus("Bench"),
    absent: byStatus("Absent")
  };
}

function renderGroupedGoing(going) {
  const grouped = roles.map(role => {
    const people = going.filter(s => s.role === role);
    if (!people.length) return null;

    return `**${role} (${people.length})**\n${people
      .map(p => {
        let line = `• ${p.username}`;
        if (p.spec) line += ` — ${p.spec}`;
        if (p.note) line += ` (${p.note})`;
        return line;
      })
      .join("\n")}`;
  }).filter(Boolean);

  return grouped.length ? grouped.join("\n\n") : "Nobody";
}

function renderFlatList(items) {
  if (!items.length) return "Nobody";

  return items.map(p => {
    let line = `• ${p.username}`;
    if (p.spec) line += ` — ${p.spec}`;
    if (p.note) line += ` (${p.note})`;
    return line;
  }).join("\n");
}

function buildRaidEmbed(raid) {
  const signups = raid.signups || [];
  const { going, late, maybe, bench, absent } = groupSignups(signups);

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `**Time:** ${raid.time}\n` +
      `**Status:** ${raid.status}\n` +
      `**Note:** ${raid.note || "None"}\n\n` +
      `No signup limits.`
    )
    .addFields(
      {
        name: `Going (${going.length})`,
        value: renderGroupedGoing(going)
      },
      {
        name: `Late (${late.length})`,
        value: renderFlatList(late)
      },
      {
        name: `Maybe (${maybe.length})`,
        value: renderFlatList(maybe)
      },
      {
        name: `Bench (${bench.length})`,
        value: renderFlatList(bench)
      },
      {
        name: `Absent (${absent.length})`,
        value: renderFlatList(absent)
      }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

function buildAttendanceText(rows) {
  if (!rows.length) return "No attendance marked yet.";

  return rows
    .map(r => `${r.attended ? "✅" : "❌"} ${r.username}`)
    .join("\n");
}

function buildRaidListText(raids) {
  if (!raids.length) return "No raids found.";

  return raids.map(r =>
    `**${r.title}** — ${r.raid_time}\nStatus: ${r.status} | ID: \`${r.id}\``
  ).join("\n\n");
}

function buildTemplateListText(templates) {
  if (!templates.length) return "No templates found.";

  return templates.map(t =>
    `**${t.name}** → ${t.title}${t.note ? `\nNote: ${t.note}` : ""}`
  ).join("\n\n");
}

function buildRecurringListText(rows) {
  if (!rows.length) return "No recurring raids found.";

  return rows.map(r =>
    `**${r.template_name}** — ${r.day_of_week} ${r.time_of_day}\nID: \`${r.id}\``
  ).join("\n\n");
}

function buildCharacterListText(characters) {
  if (!characters.length) return "No characters linked.";

  return characters.map(c =>
    `${c.is_main ? "⭐ " : ""}${c.name}-${c.realm} (${c.region})${c.class_name ? ` — ${c.class_name}` : ""}`
  ).join("\n");
}

function buildReminderListText(reminders) {
  if (!reminders.length) return "No reminders set.";

  return reminders
    .map(r => `• ${r.minutes_before} minutes before`)
    .join("\n");
}

function buildRaidExportText(exportData) {
  const { raid, attendance } = exportData;

  if (!raid) return "Raid not found.";

  const signupLines = (raid.signups || []).map(s => {
    let line = `${s.username} | ${s.status}`;
    if (s.role) line += ` | ${s.role}`;
    if (s.spec) line += ` | ${s.spec}`;
    if (s.note) line += ` | ${s.note}`;
    return line;
  });

  const attendanceLines = (attendance || []).map(a =>
    `${a.username} | ${a.attended ? "Attended" : "Missed"}`
  );

  return [
    `Raid Export`,
    `Raid ID: ${raid.id}`,
    `Title: ${raid.title}`,
    `Time: ${raid.time}`,
    `Status: ${raid.status}`,
    `Note: ${raid.note || "None"}`,
    ``,
    `--- Signups ---`,
    signupLines.length ? signupLines.join("\n") : "No signups.",
    ``,
    `--- Attendance ---`,
    attendanceLines.length ? attendanceLines.join("\n") : "No attendance."
  ].join("\n");
}

module.exports = {
  raidButtons,
  roleMenu,
  specMenu,
  buildRaidEmbed,
  buildAttendanceText,
  buildRaidListText,
  buildTemplateListText,
  buildRecurringListText,
  buildCharacterListText,
  buildReminderListText,
  buildRaidExportText
};
