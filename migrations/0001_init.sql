CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  us_name TEXT NOT NULL,
  ussr_name TEXT NOT NULL,
  us_user TEXT,
  ussr_user TEXT,
  winner TEXT, -- 'US' | 'USSR' | NULL(平局)
  reason TEXT NOT NULL,
  turn INTEGER NOT NULL,
  vp INTEGER NOT NULL,
  options TEXT NOT NULL, -- JSON
  finished_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_match_finished ON match_results(finished_at);
CREATE INDEX IF NOT EXISTS idx_match_us ON match_results(us_user);
CREATE INDEX IF NOT EXISTS idx_match_ussr ON match_results(ussr_user);
