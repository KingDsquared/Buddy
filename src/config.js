const roles = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Flex"];

const specs = {
  Tank: [
    "Blood DK",
    "Vengeance DH",
    "Guardian Druid",
    "Brewmaster Monk",
    "Protection Paladin",
    "Protection Warrior"
  ],
  Healer: [
    "Holy Paladin",
    "Restoration Druid",
    "Mistweaver Monk",
    "Holy Priest",
    "Discipline Priest",
    "Restoration Shaman",
    "Preservation Evoker"
  ],
  "Melee DPS": [
    "Arms Warrior",
    "Fury Warrior",
    "Frost DK",
    "Unholy DK",
    "Havoc DH",
    "Feral Druid",
    "Windwalker Monk",
    "Retribution Paladin",
    "Assassination Rogue",
    "Outlaw Rogue",
    "Subtlety Rogue",
    "Enhancement Shaman",
    "Survival Hunter"
  ],
  "Ranged DPS": [
    "Arcane Mage",
    "Fire Mage",
    "Frost Mage",
    "Balance Druid",
    "Beast Mastery Hunter",
    "Marksmanship Hunter",
    "Devastation Evoker",
    "Shadow Priest",
    "Elemental Shaman",
    "Affliction Warlock",
    "Demonology Warlock",
    "Destruction Warlock"
  ],
  Flex: ["Flexible"]
};

module.exports = {
  roles,
  specs
};
