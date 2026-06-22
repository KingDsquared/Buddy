const db = require("./db");

const DAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

function parseRaidTime(text) {
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getNextDateForDay(dayName, timeOfDay) {
  const targetDay = DAYS[String(dayName).toLowerCase()];
  if (targetDay === undefined) return null;

  const [hourRaw, minuteRaw] = String(timeOfDay).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const now = new Date();
  const next = new Date(now);

  next.setHours(hour, minute, 0, 0);

  let diff = targetDay - next.getDay();

  if (diff < 0 || (diff === 0 && next <= now)) {
    diff += 7;
  }

  next.setDate(next.getDate() + diff);
  return next;
}

async function createRaidFromRecurring(client, recurring) {
  const template = await db.getTemplate(recurring.guild_id, recurring.template_name);
  if (!template) return;

  const nextDate = getNextDateForDay(recurring.day_of_week, recurring.time_of_day);
  if (!nextDate) return;

  const dateKey = getDateKey(nextDate);

  if (recurring.last_created_key === dateKey) return;

  const channel = await client.channels.fetch(recurring.channel_id);

  const raid = {
    id: Date.now().toString(),
    guildId: recurring.guild_id,
    channelId: recurring.channel_id,
    title: template.title,
    time: nextDate.toISOString(),
    note: template.note || "",
    createdBy: recurring.created_by,
    status: "OPEN",
    signups: []
  };

  await db.createRaid(raid);

  const ui = require("./ui");

  const msg = await channel.send({
    embeds: [ui.buildRaidEmbed(raid)],
    components: ui.raidButtons(raid.id)
  });

  await db.setRaidMessageId(raid.id, msg.id);
  await db.markRecurringCreated(recurring.id, dateKey);
}

async function checkRecurringRaids(client) {
  const rows = await db.getActiveRecurringRaids();

  for (const row of rows) {
    try {
      await createRaidFromRecurring(client, row);
    } catch (err) {
      console.error("Recurring raid failed:", err);
    }
  }
}

async function checkReminders(client) {
  const reminders = await db.getPendingReminders();
  const now = Date.now();

  for (const reminder of reminders) {
    const raidTime = parseRaidTime(reminder.raid_time);
    if (!raidTime) continue;

    const remindAt = raidTime.getTime() - reminder.minutes_before * 60 * 1000;

    if (now >= remindAt) {
      const raid = await db.getRaid(reminder.raid_id);
      if (!raid) continue;

      const signed = raid.signups.filter(s => s.status !== "Absent");

      try {
        const channel = await client.channels.fetch(raid.channelId);

        await channel.send({
          content:
            `**Raid Reminder: ${raid.title}**\n` +
            `Starts: ${raid.time}\n` +
            `Reminder: ${reminder.minutes_before} minutes before.\n\n` +
            signed.map(s => `<@${s.userId}>`).join(" "),
          allowedMentions: { users: signed.map(s => s.userId) }
        });

        await db.markReminderSent(reminder.id);
      } catch (err) {
        console.error("Reminder failed:", err);
      }
    }
  }
}

function startReminderLoop(client) {
  setInterval(() => {
    checkReminders(client).catch(console.error);
    checkRecurringRaids(client).catch(console.error);
  }, 60 * 1000);

  console.log("Reminder + recurring loop started.");
}

module.exports = {
  startReminderLoop,
  getNextDateForDay
};
