-- 离线人机对局的战绩（每个浏览器按对局 id 只记一个结果，撤销后会被覆盖），用于首页的全局军力对比
CREATE TABLE IF NOT EXISTS offline_results (
  id TEXT PRIMARY KEY,
  outcome TEXT NOT NULL, -- 'US' | 'USSR' | 'draw' | 'pending'
  updated_at INTEGER NOT NULL
);
