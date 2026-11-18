# 冷战热斗 · Twilight Struggle 网页复刻

双人冷战策略桌游《Twilight Struggle》（冷战热斗）的网页版复刻，整套跑在 Cloudflare Workers 免费计划上。

> **非商业项目，仅供个人学习与自娱。** 游戏规则与卡牌文本版权归 GMT Games；本项目不使用任何 GMT 美术素材。如果你喜欢这个游戏，请购买正版。

![对局界面](docs/images/screenshot.jpg)

*对局界面：变形后的真实世界底图、区域计分后的阵营雾气、顶栏轨道、手牌与已知对手手牌、右侧决策面板与对局记录。*

## 特性

- **规则完整**：按 20 周年纪念版基础规则实现（= Deluxe 规则 + 可选卡 #104–110 默认加入 + 回合末持有计分卡判负）。84 个国家、110 张卡全部实现，每张卡都有单元测试，规则争议点的裁定记录在 [`docs/rulings.md`](docs/rulings.md)
- **三种玩法**
  - 离线人机：引擎与 AI 都在浏览器里运行，存档保存在本机，断网也能玩，可随时撤销
  - 在线人机：建房时选择 AI 对手
  - 在线双人：6 位房间码或邀请链接加入；断线重连、悔棋请求、认输、聊天、观战、战绩、复盘
- **开局选项**：美方额外影响力（0 ～ +3）、是否加入可选卡、自选或随机阵营
- **AI 三档**：新兵（随机但不自杀）、参谋（启发式评估）、将军（参谋 + 前瞻）
- **原创美术**：世界地图由 Natural Earth 国界按棋盘布局变形生成；110 张卡牌插画全部是手写 SVG（low poly 风格），无任何图片文件
- **声音**：背景音乐与音效全部用 Web Audio 实时合成，无音频文件
- **体验细节**：悬停国家显示政变 / 调整成功率、区域计分预览、对手已知手牌、牌库剩余牌推算、手机横屏布局与双指缩放、PWA 离线缓存

## 技术架构

| 层 | 选型 |
|---|---|
| 前端 | Vite + Preact + @preact/signals，SVG 地图与卡面 |
| 规则引擎 | TypeScript，生成器描述流程，所有输入都是“选择”。对局 = 随机种子 + 选择序列，可完整回放 |
| 隐藏信息 | 视图过滤 `viewFor(game, side)` 是唯一出口，对手手牌与牌库顺序不会下发 |
| 在线服务 | Cloudflare Worker 入口 + Durable Objects（每局一个 `GameDO`，单例 `LobbyDO`）+ D1（用户、战绩） |
| 离线 | Web Worker 跑引擎与 AI，存档存 localStorage，Service Worker 缓存静态资源 |

```
src/
  data/     地图与卡牌数据（由 scripts/gen-data.ts 从开源数据生成）
  engine/   规则引擎：game.ts（流程与行动）、effects/（110 张卡事件）、scoring.ts、view.ts
  ai/       AI：局面评估、行动点规划、事件估值
  art/      卡牌插画：kit/（low poly 图元）、cards/（逐卡场景）
  client/   前端：game/（棋盘、地图、手牌、离线 Worker、在线会话）、pages/、audio.ts
  worker/   服务端：index.ts（路由与鉴权）、game.ts（GameDO）、lobby.ts（LobbyDO）
  shared/   前后端协议
test/       单元测试（规则、逐卡、AI、插画）
scripts/    数据生成、地图生成、随机对局冒烟、AI 对战、插画预览
docs/       开发计划、规则与平台调研、规则裁定、参考数据
```

## 本地开发

需要 Node.js 22+。

```bash
npm install
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .dev.vars
cp wrangler.jsonc wrangler.local.jsonc        # 本地也读这个文件
npm run db:migrate:local                      # 本地 D1
npm run dev                                   # Vite + workerd，前端与 Worker / DO / D1 同一个开发服务器
```

常用脚本：

```bash
npm test                                  # 全部单元测试
npx tsx scripts/sim.ts 100                # 随机对局冒烟（检查不变量）
npx tsx scripts/ai-match.ts 2 1 10        # AI 对战：美方档位 苏方档位 局数
npx tsx scripts/preview-art.ts            # 生成 dist-art/preview.html，预览全部卡牌插画
npm run gen:data                          # 重新生成 src/data/*.gen.ts
npx tsx scripts/gen-worldmap.ts <ne_110m_admin_0_countries.geojson>   # 重新生成地图底图
```

## 部署到自己的 Cloudflare 账号

免费计划即可（Durable Objects 使用 SQLite 后端）。

```bash
npx wrangler login
npx wrangler d1 create cold-war-db
# 把输出的 database_id 填进 wrangler.local.jsonc（该文件已被 .gitignore 忽略，不要提交）
npm run db:migrate
npx wrangler secret put SESSION_SECRET -c wrangler.local.jsonc
npm run deploy
```

部署后访问 Cloudflare 分配的默认子域即可；需要自定义域名时，在 `wrangler.local.jsonc` 里加 `routes: [{ "pattern": "你的域名", "custom_domain": true }]`。

免费额度说明：静态资源不计请求数；每局对战只在一个 Durable Object 里运行，按“每个选择写一行”持久化，个人使用远低于每日额度。额度在 UTC 0 点重置。

## 规则说明

游戏内有「规则摘要」页和对局侧栏的「速查」。实现上的取舍：

- 基础规则以 20 周年版为准，地图与卡牌数据使用 Deluxe 版
- 不包含 Turn Zero、Red Sun Rising、促销卡与替代太空轨
- 有争议或规则未写明的地方（如 Shuttle Diplomacy 是否作用于终局计分、UN Intervention 取消的带星卡去向等），统一记录在 [`docs/rulings.md`](docs/rulings.md)，主要参考 GMT FAQ 与 DeepStruggle 的规则审计

## 数据来源与致谢

- 地图拓扑与卡牌数据：[tomjefferys/twilight-struggle-rs](https://github.com/tomjefferys/twilight-struggle-rs)（MIT）
- 规则裁定、中文译名与卡牌说明底稿：[mihaild/DeepStruggle](https://github.com/mihaild/DeepStruggle)（MIT）
- 世界地图国界：[Natural Earth](https://www.naturalearthdata.com/) 1:110m（公有领域）
- 架构参考：Cloudflare Durable Objects、WebSocket Hibernation 官方文档

## 版权

源代码与原创美术以 MIT 许可发布（见 [LICENSE](LICENSE)）。《Twilight Struggle》的游戏规则、卡牌名称与卡牌文本版权归 GMT Games 所有，不在 MIT 许可范围内；本仓库仅出于个人非商业目的使用，如权利方有异议请联系删除。
