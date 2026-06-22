const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      officer_role_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

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
      class_name TEXT,
      role TEXT,
      spec TEXT,
      note TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (raid_id, user_id)
    );
  `);

  await pool.query(`ALTER TABLE signups ADD COLUMN IF NOT EXISTS class_name TEXT;`);
  await pool.query(`ALTER TABLE signups ADD COLUMN IF NOT EXISTS note TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      raid_id TEXT NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
      minutes_before INTEGER NOT NULL,
      sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
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
    CREATE TABLE IF NOT EXISTS recurring_raids (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      created_by TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      last_created_key TEXT,
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

async function setOfficerRole(guildId, roleId) {
  await pool.query(
    `
    INSERT INTO guild_settings (guild_id, officer_role_id, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (guild_id)
    DO UPDATE SET officer_role_id=$2, updated_at=NOW()
    `,
    [guildId, roleId]
  );
}

async function getGuildSettings(guildId) {
  const res = await pool.query(`SELECT * FROM guild_settings WHERE guild_id=$1`, [guildId]);
  return res.rows[0] || null;
}

async function createRaid(raid) {
  await pool.query(
    `
    INSERT INTO raids
    (id, guild_id, channel_id, title, raid_time, note, created_by, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN')
    `,
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
      className: s.class_name,
      role: s.role,
      spec: s.spec,
      note: s.note
    }))
  };
}

async function listRaids(guildId) {
  const res = await pool.query(
    `
    SELECT id, title, raid_time, status, created_at
    FROM raids
    WHERE guild_id=$1
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [guildId]
  );
  return res.rows;
}

async function updateRaid(raidId, fields) {
  const current = await getRaid(raidId);
  if (!current) return null;

  await pool.query(
    `
    UPDATE raids
    SET title=$1, raid_time=$2, note=$3
    WHERE id=$4
    `,
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

async function upsertSignup({ raidId, userId, username, status, className, role, spec, note }) {
  await pool.query(
    `
    INSERT INTO signups
    (raid_id, user_id, username, status, class_name, role, spec, note, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT (raid_id, user_id)
    DO UPDATE SET
      username=$3,
      status=$4,
      class_name=COALESCE($5, signups.class_name),
      role=COALESCE($6, signups.role),
      spec=COALESCE($7, signups.spec),
      note=COALESCE($8, signups.note),
      updated_at=NOW()
    `,
    [raidId, userId, username, status, className || null, role || null, spec || null, note || null]
  );

  return getRaid(raidId);
}

async function removeSignup(raidId, userId) {
  await pool.query(`DELETE FROM signups WHERE raid_id=$1 AND user_id=$2`, [raidId, userId]);
  return getRaid(raidId);
}

module.exports = {
  initDb,
  setOfficerRole,
  getGuildSettings,
  createRaid,
  setRaidMessageId,
  getRaid,
  listRaids,
  updateRaid,
  deleteRaid,
  setRaidStatus,
  upsertSignup,
  removeSignup
};
