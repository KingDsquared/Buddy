import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'raids.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ raids: [] }, null, 2));
}

export function loadStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

export function saveStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export function createRaid({ guildId, channelId, messageId, title, starts, note, createdBy }) {
  const store = loadStore();
  const raid = {
    id: crypto.randomUUID(),
    guildId,
    channelId,
    messageId,
    title,
    starts,
    note: note || '',
    createdBy,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    signups: []
  };
  store.raids.push(raid);
  saveStore(store);
  return raid;
}

export function attachMessage(raidId, messageId) {
  const store = loadStore();
  const raid = store.raids.find(r => r.id === raidId);
  if (!raid) return null;
  raid.messageId = messageId;
  saveStore(store);
  return raid;
}

export function getRaid(raidId) {
  const store = loadStore();
  return store.raids.find(r => r.id === raidId) || null;
}

export function upsertSignup(raidId, signup) {
  const store = loadStore();
  const raid = store.raids.find(r => r.id === raidId);
  if (!raid) return null;

  const existing = raid.signups.find(s => s.userId === signup.userId);
  if (existing) {
    Object.assign(existing, signup, { updatedAt: new Date().toISOString() });
  } else {
    raid.signups.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...signup
    });
  }
  saveStore(store);
  return raid;
}

export function withdrawSignup(raidId, userId) {
  const store = loadStore();
  const raid = store.raids.find(r => r.id === raidId);
  if (!raid) return null;
  raid.signups = raid.signups.filter(s => s.userId !== userId);
  saveStore(store);
  return raid;
}
