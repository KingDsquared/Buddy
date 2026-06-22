const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Flex"];

const wowClasses = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid"
];

const classEmoji = {
  Warrior: "⚔️",
  Paladin: "✨",
  Hunter: "🏹",
  Rogue: "🗡️",
  Priest: "☀️",
  Shaman: "⚡",
  Mage: "❄️",
  Warlock: "🔥",
  Druid: "🌿"
};

const specs = {
  Warrior: [
    { spec: "Protection", role: "Tank" },
    { spec: "Arms", role: "Melee DPS" },
    { spec: "Fury", role: "Melee DPS" }
  ],

  Paladin: [
    { spec: "Protection", role: "Tank" },
    { spec: "Holy", role: "Healer" },
    { spec: "Retribution", role: "Melee DPS" }
  ],

  Hunter: [
    { spec: "Beast Mastery", role: "Ranged DPS" },
    { spec: "Marksmanship", role: "Ranged DPS" },
    { spec: "Survival", role: "Ranged DPS" }
  ],

  Rogue: [
    { spec: "Assassination", role: "Melee DPS" },
    { spec: "Combat", role: "Melee DPS" },
    { spec: "Subtlety", role: "Melee DPS" }
  ],

  Priest: [
    { spec: "Discipline", role: "Healer" },
    { spec: "Holy", role: "Healer" },
    { spec: "Shadow", role: "Ranged DPS" }
  ],

  Shaman: [
    { spec: "Restoration", role: "Healer" },
    { spec: "Elemental", role: "Ranged DPS" },
    { spec: "Enhancement", role: "Melee DPS" }
  ],

  Mage: [
    { spec: "Arcane", role: "Ranged DPS" },
    { spec: "Fire", role: "Ranged DPS" },
    { spec: "Frost", role: "Ranged DPS" }
  ],

  Warlock: [
    { spec: "Affliction", role: "Ranged DPS" },
    { spec: "Demonology", role: "Ranged DPS" },
    { spec: "Destruction", role: "Ranged DPS" }
  ],

  Druid: [
    { spec: "Feral Tank", role: "Tank" },
    { spec: "Feral DPS", role: "Melee DPS" },
    { spec: "Restoration", role: "Healer" },
    { spec: "Balance", role: "Ranged DPS" }
  ]
};

module.exports = {
  roles,
  wowClasses,
  classEmoji,
  specs
};
