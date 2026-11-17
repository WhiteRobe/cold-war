# 冷战热斗（Twilight Struggle 网页复刻）

双人冷战策略桌游《Twilight Struggle》的网页复刻，部署在 Cloudflare Workers 免费计划上。**非商业自用。**

- 规则：20 周年纪念版基础规则（= Deluxe + 可选卡 #104–110 默认加入 + 回合末持有计分卡判负），84 国、110 张卡全部实现
- 模式：离线人机（浏览器内跑引擎和 AI，可断网）、在线人机、在线双人；观战、复盘、战绩
- 美术：地图与 110 张卡牌插画全部为手写 SVG（low poly），无外部图片

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite + Preact + @preact/signals，SVG 地图 |
| 规则引擎 | TypeScript 纯逻辑，生成器 + 选择回放（`seed + 选择序列` 即可完整重建对局） |
| 服务端 | Cloudflare Worker + Durable Objects（`GameDO` 每局一个，`LobbyDO` 大厅）+ D1（用户、战绩） |
| 离线 | Web Worker 跑引擎与 AI，存档存 localStorage，Service Worker 缓存静态资源 |

目录：`src/data`（地图与卡牌数据）、`src/engine`（规则引擎）、`src/ai`（AI）、`src/art`（插画）、`src/client`（前端）、`src/worker`（服务端）、`test`（单测）、`docs`（计划、调研、裁定）。

## 开发

```bash
npm install
npm run gen:data          # 从 docs/ref 生成 src/data/*.gen.ts（已提交，一般不用跑）
npm run db:migrate:local  # 本地 D1
npm run dev               # 本地开发（Vite + workerd）
npm test                  # 单测
npx tsx scripts/sim.ts 50 # 随机对局冒烟
npx tsx scripts/preview-art.ts  # 生成 dist-art/preview.html 预览全部插画
```

本地需要 `.dev.vars`：`SESSION_SECRET=<随机串>`。

## 部署

1. `npx wrangler d1 create cold-war-db`，把 `wrangler.jsonc` 复制为 `wrangler.local.jsonc` 并填入 `database_id`（该文件不提交）
2. `npm run db:migrate`
3. `npx wrangler secret put SESSION_SECRET -c wrangler.local.jsonc`
4. `npm run deploy`

## 数据来源与版权

- 地图拓扑、卡牌数据：[tomjefferys/twilight-struggle-rs](https://github.com/tomjefferys/twilight-struggle-rs)、[mihaild/DeepStruggle](https://github.com/mihaild/DeepStruggle)（均 MIT），中文文本以 DeepStruggle zh-CN 为底稿校订
- 《Twilight Struggle》的规则与卡牌文本版权归 GMT Games。本项目仅供个人非商业使用，不使用任何 GMT 美术素材
