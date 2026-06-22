const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "raids.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ raids: [] }, null, 2), "utf8");
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function createRaid({ title, starts, note, createdBy, guildId, channelId }) {
  const db = readStore();

  const raid = {
    id: String(Date.now()),
    title,
    starts,
    note: note || "",
    createdBy,
    guildId,
    channelId,
    messageId: null,
    signups: []
  };

  db.raids.push(raid);
  writeStore(db);
  return raid;
}

function getRaid(raidId) {
  const db = readStore();
  return db.raids.find(r => r.id === raidId) || null;
}

function getRaidByMessageId(messageId) {
  const db = readStore();
  return db.raids.find(r => r.messageId === messageId) || null;
}

function setRaidMessageId(raidId, messageId) {
  const db = readStore();
  const raid = db.raids.find(r => r.id === raidId);
  if (!raid) return null;
  raid.messageId = messageId;
  writeStore(db);
  return raid;
}

function upsertSignup({ raidId, userId, username, status, role = null, spec = null }) {
  const db = readStore();
  const raid = db.raids.find(r => r.id === raidId);
  if (!raid) return null;

  const existing = raid.signups.find(s => s.userId === userId);

  if (existing) {
    existing.username = username;
    existing.status = status;
    if (role !== null) existing.role = role;
    if (spec !== null) existing.spec = spec;
  } else {
    raid.signups.push({
      userId,
      username,
      status,
      role,
      spec
    });
  }

  writeStore(db);
  return raid;
}

function removeSignup({ raidId, userId }) {
  const db = readStore();
  const raid = db.raids.find(r => r.id === raidId);
  if (!raid) return null;

  raid.signups = raid.signups.filter(s => s.userId !== userId);
  writeStore(db);
  return raid;
}

module.exports = {
  createRaid,
  getRaid,
  getRaidByMessageId,
  setRaidMessageId,
  upsertSignup,
  removeSignup
};
