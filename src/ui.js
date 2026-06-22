const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const ROLES = [
  "Tank",
  "Healer",
  "Melee DPS",
  "Ranged DPS",
  "Flex"
];

const SPECS_BY_ROLE = {
  "Tank": ["Guardian Druid", "Protection Warrior", "Blood DK", "Brewmaster Monk", "Protection Paladin", "Vengeance DH"],
  "Healer": ["Holy Paladin", "Restoration Druid", "Mistweaver Monk", "Holy Priest", "Discipline Priest", "Restoration Shaman", "Preservation Evoker"],
  "Melee DPS": ["Fury Warrior", "Arms Warrior", "Retribution Paladin", "Enhancement Shaman", "Havoc DH", "Feral Druid", "Windwalker Monk", "Unholy DK", "Frost DK", "Subtlety Rogue", "Assassination Rogue", "Outlaw Rogue", "Survival Hunter"],
  "Ranged DPS": ["Fire Mage", "Frost Mage", "Arcane Mage", "Balance Druid", "Elemental Shaman", "Shadow Priest", "Affliction Warlock", "Demonology Warlock", "Destruction Warlock", "Marksmanship Hunter", "Beast Mastery Hunter", "Devastation Evoker"],
  "Flex": ["Flexible / Multiple Specs"]
};

function buildRaidEmbed(raid) {
  const signups = raid.signups || [];

  const going = signups.filter(s => s.status === "GOING");
  const late = signups.filter(s => s.status === "LATE");
  const maybe = signups.filter(s => s.status === "MAYBE");
  const absent = signups.filter(s => s.status === "ABSENT");

  const groupByRole = (items) => {
    const grouped = {
      "Tank": [],
      "Healer": [],
      "Melee DPS": [],
      "Ranged DPS": [],
      "Flex": [],
      "Unassigned": []
    };

    for (const s of items) {
      if (!s.role) grouped["Unassigned"].push(s);
      else grouped[s.role]?.push(s);
    }

    return grouped;
  };

  const goingByRole = groupByRole(going);

  const roleBlock = Object.entries(goingByRole)
    .filter(([, arr]) => arr.length > 0)
    .map(([role, arr]) => {
      const lines = arr.map(s => `• ${s.username}${s.spec ? ` — ${s.spec}` : ""}`);
      return `**${role} (${arr.length})**\n${lines.join("\n")}`;
    })
    .join("\n\n") || "Nobody yet.";

  const lateBlock = late.length
    ? late.map(s => `• ${s.username}${s.spec ? ` — ${s.spec}` : ""}`).join("\n")
    : "Nobody";

  const maybeBlock = maybe.length
    ? maybe.map(s => `• ${s.username}${s.spec ? ` — ${s.spec}` : ""}`).join("\n")
    : "Nobody";

  const absentBlock = absent.length
    ? absent.map(s => `• ${s.username}`).join("\n")
    : "Nobody";

  return new EmbedBuilder()
    .setTitle(`Raid: ${raid.title}`)
    .setDescription(
      `**Starts:** ${raid.starts}\n` +
      (raid.note ? `**Note:** ${raid.note}\n` : "") +
      `\nNo signup limits.`
    )
    .addFields(
      { name: `Going (${going.length})`, value: roleBlock },
      { name: `Late (${late.length})`, value: lateBlock },
      { name: `Maybe (${maybe.length})`, value: maybeBlock },
      { name: `Absent (${absent.length})`, value: absentBlock }
    )
    .setFooter({ text: `Raid ID: ${raid.id}` });
}

function buildSignupButtons(raidId) {
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

function buildRoleSelect(raidId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`role:${raidId}`)
      .setPlaceholder("Choose your role")
      .addOptions(
        ROLES.map(role => ({
          label: role,
          value: role
        }))
      )
  );
}

function buildSpecSelect(raidId, role) {
  const specs = SPECS_BY_ROLE[role] || ["Flexible / Unknown"];

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`spec:${raidId}:${role}`)
      .setPlaceholder(`Choose your spec (${role})`)
      .addOptions(
        specs.map(spec => ({
          label: spec,
          value: spec
        }))
      )
  );
}

module.exports = {
  buildRaidEmbed,
  buildSignupButtons,
  buildRoleSelect,
  buildSpecSelect
};
