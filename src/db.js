const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS raids (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      title TEXT NOT NULL,
      raid_time TEXT NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signups (
      raid_id TEXT NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL,
      role TEXT,
      spec TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (raid_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS raid_templates (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      raid_id TEXT NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      attended BOOLEAN NOT NULL,
      marked_by TEXT NOT NULL,
      marked_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (raid_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      region TEXT NOT NULL,
      realm TEXT NOT NULL,
      name TEXT NOT NULL,
      class_name TEXT,
      is_main BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function createRaid(raid) {
  await pool.query(
    `INSERT INTO raids 
    (id, guild_id, channel_id, title, raid_time, note, created_by, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN')`,
    [raid.id, raid.guildId, raid.channelId, raid.title, raid.time, raid.note, raid.createdBy]
  );
}

async function setRaidMessageId(raidId, messageId) {
  await pool.query(`UPDATE raids SET message_id=$1 WHERE id=$2`, [messageId, raidId]);
}

async function getRaid(raidId) {
  const raidRes = await pool.query(`SELECT * FROM raids WHERE id=$1`, [raidId]);
  if (!raidRes.rows.length) return null;

  const signupRes = await pool.query(
    `SELECT * FROM signups WHERE raid_id=$1 ORDER BY updated_at ASC`,
    [raidId]
  );

  const r = raidRes.rows[0];

  return {
    id: r.id,
    guildId: r.guild_id,
    channelId: r.channel_id,
    messageId: r.message_id,
    title: r.title,
    time: r.raid_time,
    note: r.note,
    createdBy: r.created_by,
    status: r.status || "OPEN",
    signups: signupRes.rows.map(s => ({
      userId: s.user_id,
      username: s.username,
      status: s.status,
      role: s.role,
      spec: s.spec
    }))
  };
}

async function listRaids(guildId) {
  const res = await pool.query(
    `SELECT id, title, raid_time, status, created_at
     FROM raids
     WHERE guild_id=$1
     ORDER BY created_at DESC
     LIMIT 15`,
    [guildId]
  );
  return res.rows;
}

async function updateRaid(raidId, fields) {
  const current = await getRaid(raidId);
  if (!current) return null;

  await pool.query(
    `UPDATE raids SET title=$1, raid_time=$2, note=$3 WHERE id=$4`,
    [
      fields.title || current.title,
      fields.time || current.time,
      fields.note !== undefined ? fields.note : current.note,
      raidId
    ]
  );

  return getRaid(raidId);
}

async function deleteRaid(raidId) {
  await pool.query(`DELETE FROM raids WHERE id=$1`, [raidId]);
}

async function setRaidStatus(raidId, status) {
  await pool.query(`UPDATE raids SET status=$1 WHERE id=$2`, [status, raidId]);
  return getRaid(raidId);
}

async function upsertSignup({ raidId, userId, username, status, role, spec }) {
  await pool.query(
    `
    INSERT INTO signups (raid_id, user_id, username, status, role, spec, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (raid_id, user_id)
    DO UPDATE SET
      username=$3,
      status=$4,
      role=COALESCE($5, signups.role),
      spec=COALESCE($6, signups.spec),
      updated_at=NOW()
    `,
    [raidId, userId, username, status, role || null, spec || null]
  );

  return getRaid(raidId);
}

async function removeSignup(raidId, userId) {
  await pool.query(`DELETE FROM signups WHERE raid_id=$1 AND user_id=$2`, [raidId, userId]);
  return getRaid(raidId);
}

async function createTemplate(t) {
  const id = Date.now().toString();

  await pool.query(
    `INSERT INTO raid_templates (id, guild_id, name, title, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, t.guildId, t.name, t.title, t.note, t.createdBy]
  );

  return id;
}

async function getTemplate(guildId, name) {
  const res = await pool.query(
    `SELECT * FROM raid_templates WHERE guild_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
    [guildId, name]
  );

  return res.rows[0] || null;
}

async function listTemplates(guildId) {
  const res = await pool.query(
    `SELECT * FROM raid_templates WHERE guild_id=$1 ORDER BY created_at DESC LIMIT 20`,
    [guildId]
  );

  return res.rows;
}

async function markAttendance({ raidId, userId, username, attended, markedBy }) {
  await pool.query(
    `
    INSERT INTO attendance (raid_id, user_id, username, attended, marked_by, marked_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (raid_id, user_id)
    DO UPDATE SET username=$3, attended=$4, marked_by=$5, marked_at=NOW()
    `,
    [raidId, userId, username, attended, markedBy]
  );
}

async function getAttendance(raidId) {
  const res = await pool.query(
    `SELECT * FROM attendance WHERE raid_id=$1 ORDER BY username ASC`,
    [raidId]
  );

  return res.rows;
}

async function linkCharacter(c) {
  const id = Date.now().toString();

  await pool.query(
    `INSERT INTO characters (id, guild_id, user_id, region, realm, name, class_name, is_main)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, c.guildId, c.userId, c.region, c.realm, c.name, c.className, c.isMain]
  );

  return id;
}

async function listCharacters(guildId, userId) {
  const res = await pool.query(
    `SELECT * FROM characters WHERE guild_id=$1 AND user_id=$2 ORDER BY is_main DESC, created_at DESC`,
    [guildId, userId]
  );

  return res.rows;
}

module.exports = {
  initDb,
  createRaid,
  setRaidMessageId,
  getRaid,
  listRaids,
  updateRaid,
  deleteRaid,
  setRaidStatus,
  upsertSignup,
  removeSignup,
  createTemplate,
  getTemplate,
  listTemplates,
  markAttendance,
  getAttendance,
  linkCharacter,
  listCharacters
};
