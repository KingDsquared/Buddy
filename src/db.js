const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
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
}

async function createRaid(raid) {
  await pool.query(
    `INSERT INTO raids 
     (id, guild_id, channel_id, title, raid_time, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      raid.id,
      raid.guildId,
      raid.channelId,
      raid.title,
      raid.time,
      raid.note,
      raid.createdBy
    ]
  );
}

async function setRaidMessageId(raidId, messageId) {
  await pool.query(
    `UPDATE raids SET message_id=$1 WHERE id=$2`,
    [messageId, raidId]
  );
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
    signups: signupRes.rows.map(s => ({
      userId: s.user_id,
      username: s.username,
      status: s.status,
      role: s.role,
      spec: s.spec
    }))
  };
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
  await pool.query(
    `DELETE FROM signups WHERE raid_id=$1 AND user_id=$2`,
    [raidId, userId]
  );

  return getRaid(raidId);
}

module.exports = {
  initDb,
  createRaid,
  setRaidMessageId,
  getRaid,
  upsertSignup,
  removeSignup
};
