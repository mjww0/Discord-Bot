import Database from "better-sqlite3";
const db = new Database("orbital.sqlite");
db.pragma("journal_mode = wal");

db.prepare(`
CREATE TABLE IF NOT EXISTS guild_config (
  guild_id TEXT PRIMARY KEY,
  welcome_enabled INTEGER DEFAULT 0,
  welcome_channel_id TEXT,
  welcome_message TEXT DEFAULT 'Welcome {member} to {server}!',
  tickets_enabled INTEGER DEFAULT 1,
  tickets_category_id TEXT,
  tickets_support_role_id TEXT,
  tickets_transcript_channel_id TEXT,
  tickets_user_open_limit INTEGER DEFAULT 1,
  automod_enabled INTEGER DEFAULT 1,
  automod_block_invites INTEGER DEFAULT 1,
  automod_block_links INTEGER DEFAULT 0,
  automod_badwords TEXT DEFAULT '["badword"]',
  music_enabled INTEGER DEFAULT 1
)` ).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS ticket_panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  category_id TEXT,
  support_role_id TEXT,
  transcript_channel_id TEXT,
  user_open_limit INTEGER DEFAULT 1
)` ).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS open_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  panel_id INTEGER,
  status TEXT DEFAULT 'open'
)` ).run();

export const getConfig = (gid) => {
  const row = db.prepare("SELECT * FROM guild_config WHERE guild_id=?").get(gid);
  if (row) return row;
  db.prepare("INSERT INTO guild_config (guild_id) VALUES (?)").run(gid);
  return db.prepare("SELECT * FROM guild_config WHERE guild_id=?").get(gid);
};

export const setConfig = (gid, patch) => {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const setClause = keys.map(k => `${k}=@${k}`).join(", ");
  db.prepare(`UPDATE guild_config SET ${setClause} WHERE guild_id=@guild_id`).run({ guild_id: gid, ...patch });
};

export default db;
