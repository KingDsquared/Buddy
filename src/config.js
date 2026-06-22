const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Flex"];

const wowClasses = [
  "Death Knight",
  "Demon Hunter",
  "Druid",
  "Evoker",
  "Hunter",
  "Mage",
  "Monk",
  "Paladin",
  "Priest",
  "Rogue",
  "Shaman",
  "Warlock",
  "Warrior"
];

const classEmoji = {
  "Death Knight": "🦴",
  "Demon Hunter": "😈",
  "Druid": "🌿",
  "Evoker": "🐉",
  "Hunter": "🏹",
  "Mage": "❄️",
  "Monk": "🍃",
  "Paladin": "✨",
  "Priest": "☀️",
  "Rogue": "🗡️",
  "Shaman": "⚡",
  "Warlock": "🔥",
  "Warrior": "⚔️"
};

const specs = {
  "Death Knight": [
    { spec: "Blood", role: "Tank" },
    { spec: "Frost", role: "Melee DPS" },
    { spec: "Unholy", role: "Melee DPS" }
  ],
  "Demon Hunter": [
    { spec: "Vengeance", role: "Tank" },
    { spec: "Havoc", role: "Melee DPS" }
  ],
  Druid: [
    { spec: "Guardian", role: "Tank" },
    { spec: "Restoration", role: "Healer" },
    { spec: "Balance", role: "Ranged DPS" },
    { spec: "Feral", role: "Melee DPS" }
  ],
  Evoker: [
    { spec: "Preservation", role: "Healer" },
    { spec: "Devastation", role: "Ranged DPS" },
    { spec: "Augmentation", role: "Ranged DPS" }
  ],
  Hunter: [
    { spec: "Beast Mastery", role: "Ranged DPS" },
    { spec: "Marksmanship", role: "Ranged DPS" },
    { spec: "Survival", role: "Melee DPS" }
  ],
  Mage: [
    { spec: "Arcane", role: "Ranged DPS" },
    { spec: "Fire", role: "Ranged DPS" },
    { spec: "Frost", role: "Ranged DPS" }
  ],
  Monk: [
    { spec: "Brewmaster", role: "Tank" },
    { spec: "Mistweaver", role: "Healer" },
    { spec: "Windwalker", role: "Melee DPS" }
  ],
  Paladin: [
    { spec: "Protection", role: "Tank" },
    { spec: "Holy", role: "Healer" },
    { spec: "Retribution", role: "Melee DPS" }
  ],
  Priest: [
    { spec: "Holy", role: "Healer" },
    { spec: "Discipline", role: "Healer" },
    { spec: "Shadow", role: "Ranged DPS" }
  ],
  Rogue: [
    { spec: "Assassination", role: "Melee DPS" },
    { spec: "Outlaw", role: "Melee DPS" },
    { spec: "Subtlety", role: "Melee DPS" }
  ],
  Shaman: [
    { spec: "Restoration", role: "Healer" },
    { spec: "Elemental", role: "Ranged DPS" },
    { spec: "Enhancement", role: "Melee DPS" }
  ],
  Warlock: [
    { spec: "Affliction", role: "Ranged DPS" },
    { spec: "Demonology", role: "Ranged DPS" },
    { spec: "Destruction", role: "Ranged DPS" }
  ],
  Warrior: [
    { spec: "Protection", role: "Tank" },
    { spec: "Arms", role: "Melee DPS" },
    { spec: "Fury", role: "Melee DPS" }
  ]
};

module.exports = {
  roles,
  wowClasses,
  classEmoji,
  specs
};
