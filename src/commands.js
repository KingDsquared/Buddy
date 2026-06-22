const { SlashCommandBuilder } = require("discord.js");

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
    .setName("raid-edit")
    .setDescription("Edit raid title, time, or note")
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
    .setDescription("Delete a raid")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-ping")
    .setDescription("Ping signed-up players")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("Message").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-reminder-add")
    .setDescription("Add a reminder")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Minutes before raid").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-reminder-list")
    .setDescription("List raid reminders")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-reminder-clear")
    .setDescription("Clear raid reminders")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-template-create")
    .setDescription("Create a raid template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("Raid title").setRequired(true))
    .addStringOption(o => o.setName("note").setDescription("Template note").setRequired(false)),

  new SlashCommandBuilder()
    .setName("raid-template-use")
    .setDescription("Create raid from template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Raid time").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-template-list")
    .setDescription("List templates"),

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
    .setDescription("Link a WoW character")
    .addStringOption(o => o.setName("name").setDescription("Character name").setRequired(true))
    .addStringOption(o => o.setName("realm").setDescription("Realm").setRequired(true))
    .addStringOption(o => o.setName("region").setDescription("Region").setRequired(true))
    .addStringOption(o => o.setName("class").setDescription("Class").setRequired(false))
    .addBooleanOption(o => o.setName("main").setDescription("Main?").setRequired(false)),

  new SlashCommandBuilder()
    .setName("character-list")
    .setDescription("List your characters"),

  new SlashCommandBuilder()
    .setName("officer-role-set")
    .setDescription("Set officer role")
    .addRoleOption(o => o.setName("role").setDescription("Officer role").setRequired(true)),

  new SlashCommandBuilder()
    .setName("raid-export")
    .setDescription("Export raid data")
    .addStringOption(o => o.setName("id").setDescription("Raid ID").setRequired(true))
].map(c => c.toJSON());

module.exports = { commands };
