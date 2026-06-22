const { SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("raid-create")
    .setDescription("Create a raid signup")
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Optional note").setRequired(false)),

  new SlashCommandBuilder().setName("raid-list").setDescription("Show recent raids"),

  new SlashCommandBuilder()
    .setName("raid-roster")
    .setDescription("Show a raid roster")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-edit")
    .setDescription("Edit raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("New title").setRequired(false))
    .addStringOption(o => o.setName("time").setDescription("New time").setRequired(false))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-note")
    .setDescription("Update raid note")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("New note").setRequired(true)),

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
    .setDescription("Delete raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-ping")
    .setDescription("Ping signed-up players")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Message").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-reminder-add")
    .setDescription("Add reminder")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Minutes before raid").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-reminder-list")
    .setDescription("List reminders")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-reminder-clear")
    .setDescription("Clear reminders")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-template-create")
    .setDescription("Create raid template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Template note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-template-use")
    .setDescription("Create raid from template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true)),

  new SlashCommandBuilder().setName("raid-template-list").setDescription("List templates"),

  new SlashCommandBuilder()
    .setName("raid-recurring-create")
    .setDescription("Auto-create raids from a template")
    .addStringOption(o => o.setName("template").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("day").setDescription("monday/tuesday/etc").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("HH:MM, example 20:00").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-recurring-list")
    .setDescription("List recurring raids"),

  new SlashCommandBuilder()
    .setName("raid-recurring-delete")
    .setDescription("Delete recurring raid")
    .addStringOption(o => o.setName("id").setDescription("Recurring ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("roster-move")
    .setDescription("Officer: move user to a roster status")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true))
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o =>
      o.setName("status")
        .setDescription("New status")
        .setRequired(true)
        .addChoices(
          { name: "Going", value: "Going" },
          { name: "Late", value: "Late" },
          { name: "Maybe", value: "Maybe" },
          { name: "Absent", value: "Absent" },
          { name: "Bench", value: "Bench" }
        )
    )
    .addStringOption(o => o.setName("role").setDescription("Optional role").setRequired(false))
    .addStringOption(o => o.setName("spec").setDescription("Optional spec").setRequired(false)),

  new SlashCommandBuilder()
    .setName("roster-note")
    .setDescription("Officer: add note to user signup")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true))
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Note").setRequired(true)),

  new SlashCommandBuilder()
    .setName("attendance-mark")
    .setDescription("Mark attendance")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true))
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addBooleanOption(o => o.setName("attended").setDescription("Attended?").setRequired(true)),

  new SlashCommandBuilder()
    .setName("attendance-view")
    .setDescription("View attendance")
    .addStringOption(o => o.setName("raid_id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("character-link")
    .setDescription("Link WoW character")
    .addStringOption(o => o.setName("name").setDescription("Character name").setRequired(true))
    .addStringOption(o => o.setName("realm").setDescription("Realm").setRequired(true))
    .addStringOption(o => o.setName("region").setDescription("Region").setRequired(true))
    .addStringOption(o => o.setName("class").setDescription("Class").setRequired(false))
    .addBooleanOption(o => o.setName("main").setDescription("Main?").setRequired(false)),

  new SlashCommandBuilder().setName("character-list").setDescription("List your characters"),

  new SlashCommandBuilder()
    .setName("officer-role-set")
    .setDescription("Set officer role")
    .addRoleOption(o => o.setName("role").setDescription("Officer role").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-export")
    .setDescription("Export raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
].map(c => c.toJSON());

module.exports = { commands };
