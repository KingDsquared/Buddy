const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const { wowClasses, classEmoji, specs } = require("./config");

function raidButtons(raidId, closed = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid:bench:${raidId}`)
        .setLabel("Bench")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:late:${raidId}`)
        .setLabel("Late")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:maybe:${raidId}`)
        .setLabel("Tentative")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:absent:${raidId}`)
        .setLabel("Absence")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(closed),

      new ButtonBuilder()
        .setCustomId(`raid:change:${raidId}`)
        .setLabel("Change")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(closed)
    )
  ];
}

function classMenu(raidId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`class:${raidId}`)
        .setPlaceholder("Select your class")
        .addOptions(
          wowClasses.map(cls => ({
            label: cls,
            value: cls,
            emoji: classEmoji[cls]
          }))
        )
    )
  ];
}

function specMenu(raidId, className) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spec:${raidId}:${className}`)
        .setPlaceholder(`Select your ${className} spec`)
        .addOptions(
          specs[className].map(row => ({
            label: row.spec,
            value: `${row.spec}|${row.role}`
          }))
        )
    )
  ];
}

function roleCounts(signups = []) {
  const going = signups.filter(s => s.status === "Going");

  return {
    tanks: going.filter(s => s.role === "Tank").length,
    healers: going.filter(s => s.role === "Healer").length,
    melee: going.filter(s => s.role === "Melee DPS").length,
    ranged: going.filter(s => s.role === "Ranged DPS").length,
    total: going.length
  };
}

function groupByClass(signups = []) {
  const going = signups.filter(s => s.status === "Going");
  const grouped = {};

  for (const cls of wowClasses) grouped[cls] = [];

  for (const signup of going) {
    const className = signup.className || signup.class_name || guessClassFromSpec(signup.spec);
    if (!grouped[className]) grouped[className] = [];
    grouped[className].push(signup);
  }

  return grouped;
}

function guessClassFromSpec(specText) {
  if (!specText) return "Unknown";

  for (const [className, rows] of Object.entries(specs)) {
    if (rows.some(r => r.spec === specText || `${r.spec} ${className}` === specText)) {
      return className;
    }
  }

  return "Unknown";
}

function renderClassGroups(signups = []) {
  const grouped = groupByClass(signups);
  const blocks = [];

  for (const cls of Object.keys(grouped)) {
    const players = grouped[cls];
    if (!players.length) continue;

    const lines = players.map(p => {
      let line = `• ${p.username}`;
      if (p.spec) line += ` — ${p.spec}`;
      if (p.note) line += ` (${p.note})`;
      return line;
    });

    blocks.push(`**${classEmoji[cls] || "•"} ${cls} (${players.length})**\n${lines.join("\n")}`);
  }

  return blocks.length ? blocks.join("\n\n") : "Nobody";
}

function renderStatus(signups = [], status) {
  const rows = signups.filter(s => s.status === status);

  if (!rows.length) return "Nobody";

  return rows.map(p => {
    let line = `• ${p.username}`;
    if (p.spec) line += ` — ${p.spec}`;
    if (p.note) line += ` (${p.note})`;
    return line;
  }).join("\n");
}

function buildRaidEmbed(raid) {
  const signups = raid.signups || [];
  const counts = roleCounts(signups);

  return new EmbedBuilder()
    .setTitle("Raid")
    .setDescription(
      `**${raid.title}**\n` +
      `🗓️ ${raid.time}\n` +
      `👥 ${counts.total} signed\n\n` +
      `🛡️ Tanks **${counts.tanks}**   ⚔️ Melee **${counts.melee}**   🏹 Ranged **${counts.ranged}**   ✚ Healers **${counts.healers}**\n\n` +
      `**Roster by Class**\n${renderClassGroups(signups)}`
    )
    .addFields(
      {
        name: `Bench (${signups.filter(s => s.status === "Bench").length})`,
        value: renderStatus(signups, "Bench")
      },
      {
        name: `Late (${signups.filter(s => s.status === "Late").length})`,
        value: renderStatus(signups, "Late")
      },
      {
        name: `Tentative (${signups.filter(s => s.status === "Maybe").length})`,
        value: renderStatus(signups, "Maybe")
      },
      {
        name: `Absence (${signups.filter(s => s.status === "Absent").length})`,
        value: renderStatus(signups, "Absent")
      }
    )
    .setFooter({ text: `Raid ID: ${raid.id} • Status: ${raid.status}` });
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

  return reminders.map(r => `• ${r.minutes_before} minutes before`).join("\n");
}

function buildAttendanceText(rows) {
  if (!rows.length) return "No attendance marked yet.";

  return rows.map(r => `${r.attended ? "✅" : "❌"} ${r.username}`).join("\n");
}

function buildRaidExportText(exportData) {
  const { raid, attendance } = exportData;

  if (!raid) return "Raid not found.";

  const signupLines = (raid.signups || []).map(s => {
    let line = `${s.username} | ${s.status}`;
    if (s.className) line += ` | ${s.className}`;
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
  classMenu,
  specMenu,
  buildRaidEmbed,
  buildRaidListText,
  buildTemplateListText,
  buildRecurringListText,
  buildCharacterListText,
  buildReminderListText,
  buildAttendanceText,
  buildRaidExportText
};
