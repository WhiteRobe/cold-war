-- 玩家上传的自定义剧本
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT,
  data TEXT NOT NULL, -- JSON（Scenario）
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scenarios_created ON scenarios(created_at);
