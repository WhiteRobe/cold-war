# Cloudflare / Wrangler 调研摘要（2026-11-17）

详细调研结论与 ghost 项目 docs/research-cloudflare.md 基本一致，本文件只列与本项目相关的要点。

## 免费计划限额（关键）
| 资源 | 免费额度 | 对本项目的影响 |
|---|---|---|
| Workers 请求 | 10 万/天 | 只让 /api/* /ws/* 进 Worker，静态资源免费不限量 |
| Workers CPU | 10 ms/请求 | 入口只做路由/鉴权/转发；PBKDF2 迭代数要低（ghost 用 2 万） |
| DO 请求 | 10 万/天（WS 收消息 20:1 折算） | 一局约几百条消息，绰绰有余 |
| DO SQLite 行写 | 10 万/天（setAlarm/delete 也算） | 一局约 500 写，按回合/快照覆盖写节流 |
| DO CPU | 文档有歧义，按 10 ms 保守设计 | 规则引擎单步要轻；AI 搜索放客户端或限预算 |
| D1 | 读 500 万/写 10 万/天，单库 500 MB | users / match_results / 存档索引 |
| Workers AI | 1 万 Neurons/天 | 只用于离线生成插画（约 140–170 张/天），不用于对局 AI |
| KV / R2 | — | 不需要 |

额度在 UTC 0 点（北京时间 8:00）重置；超额时 Worker 返回 1027/429，前端要友好提示。

## 关键能力
- **Static Assets**：`not_found_handling: "single-page-application"` + `run_worker_first: ["/api/*", "/ws/*"]`。
- **Durable Objects（SQLite 后端，免费可用）**：迁移用 `new_sqlite_classes`；WebSocket Hibernation（`ctx.acceptWebSocket`、`serializeAttachment` ≤16KB、`setWebSocketAutoResponse` 心跳）；Alarms 每对象一个；`ctx.storage.sql` + `transactionSync`。代码更新默认 deferred（≤300s），客户端必须能按 seq 重连补发。
- **wrangler**：项目内安装 ^4.160（全局 4.135 太旧，@cloudflare/vite-plugin 1.69 需要 ^4.160），统一用 `npx wrangler`。常用：`d1 create`、`d1 migrations apply --local/--remote`、`types`、`secret put`、`tail`、`deploy -c`。
- **@cloudflare/vite-plugin**：前端 HMR 与 Worker（含 DO、D1）同一个 dev server；`vite build` 产出 `dist/client` + `dist/<name>/wrangler.json`。
- **不用**：Agents SDK（状态全量广播，和手牌隐藏冲突）、partyserver（0.x，收益小）、`cf` CLI（beta）。
- **域名**：先用 Cloudflare 默认子域；之后 `routes: [{ pattern, custom_domain: true }]`。

## 来源
developers.cloudflare.com：workers/platform/limits、workers/static-assets/*、durable-objects/platform/{pricing,limits}、durable-objects/best-practices/websockets、durable-objects/api/alarms、d1/platform/*、workers-ai/platform/pricing、workers/vite-plugin。
