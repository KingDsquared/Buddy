const db = require("./db");

function parseRaidTime(text) {
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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
  }, 60 * 1000);

  console.log("Reminder loop started.");
}

module.exports = {
  startReminderLoop
};
