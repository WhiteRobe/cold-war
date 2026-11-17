# 冷战热斗（Twilight Struggle）网页复刻 · 开发计划

> 2026-11-17 起草，同日用户确认决策（见第 1 节）。自用、非商业。
> 调研：`research-rules.md`（规则 + 84 国 / 110 卡完整表）、`research-cloudflare.md`（平台）。参考数据：`ref/`。

---

## 1. 已确认决策

| 项 | 决定 |
|---|---|
| 游戏名 / Worker 名 | 冷战热斗 / `cold-war` |
| 规则基线 | 20 周年版基础规则（= Deluxe + #104–110 默认加入 + 回合末持有计分卡判负） |
| 美术 | 不用 GMT 素材；地图、卡面、插画全部手写 SVG，**low poly 风格**，意思到位即可 |
| 远端仓库 | 暂不配置，用户之后单独提供 |
| 离线模式 | 要：纯前端人机对战，不联网可玩 |
| 部署 | Cloudflare 免费计划，先用 Cloudflare 默认子域 |
| 界面语言 | 全中文 |

---

## 2. 范围

### 2.1 首版包含
- 完整基础游戏：84 国、110 张卡、10 回合、全部轨道、全部胜负条件。
- 三种模式：**在线双人**、**在线人机**（GameDO 里跑 AI）、**离线人机**（引擎和 AI 全在浏览器里跑）。
- 开房选项：
  - 可选卡 #104–110：默认包含
  - 美方额外影响力：0 / +2（默认）/ 竞价
  - 阵营：自选 / 随机
  - 悔棋：双方同意才可悔；仅限本行动轮内、掷骰前
  - 计时：不计时（默认）/ 每方总时长
- 断线重连、随时离开再继续、观战、复盘、战绩。

### 2.2 首版不做（架构预留）
Turn Zero、Red Sun Rising、促销卡 P1–P18、替代太空轨、语音聊天。

---

## 3. 技术栈

| 层 | 选型 |
|---|---|
| 语言 | TypeScript（strict），前后端共用引擎 |
| 前端 | Vite 8 + Preact + @preact/signals，SVG 渲染，CSS 变量主题 |
| 开发 | @cloudflare/vite-plugin（前端 HMR 和 Worker/DO/D1 同进程），项目内 wrangler ^4.160 |
| 服务端 | Worker 入口（路由、HMAC cookie 鉴权、限流、WS 升级校验） |
| 房间 | `GameDO`：每局一个，作为权威状态；SQLite 存快照和动作日志；WS Hibernation；Alarm 负责计时、AI 回合、空房清理 |
| 大厅 | `LobbyDO`：单例，管房间列表、邀请码、限流 |
| 数据库 | D1 `cold-war-db`：users、match_results |
| 离线 | 引擎和 AI 打包进前端；存档存 IndexedDB；PWA（Service Worker 缓存静态资源，断网也能打开） |
| 测试 | vitest（引擎单测、卡牌用例、AI 冒烟） |
| 配置 | `wrangler.jsonc` 提交（D1 id 用占位符），`wrangler.local.jsonc` 放真实 id、不提交，部署用 `npm run deploy` |

---

## 4. 目录结构

```
cold-war/
  index.html
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  wrangler.jsonc  wrangler.local.jsonc(不提交)
  migrations/0001_init.sql
  public/                      manifest、图标
  src/
    shared/
      protocol.ts              C↔S 消息类型
      types.ts                 公共类型
    data/
      countries.ts             84 国 + 2 超级大国：id、中英文名、区域、稳定度、战场国、邻接、地图坐标
      cards.ts                 110 卡：id、中英文名、阵营、Ops、时期、★、持续/计分/战争/可选标记、中文文本
      setup.ts                 开局影响力
    engine/
      state.ts                 GameState
      rng.ts                   确定性随机数（seed + counter）
      flow.ts                  回合 / 阶段状态机
      decisions.ts             待决选择栈（PendingDecision）
      ops.ts                   Ops 修正统一计算
      actions/                 influence.ts、coup.ts、realign.ts、space.ts
      scoring.ts               区域计分、东南亚计分、终局计分
      victory.ts               自动胜负（20 VP、DEFCON 1、欧洲控制、Wargames、持有计分卡）
      effects/                 early.ts、mid.ts、late.ts（110 张卡的事件实现）
      legal.ts                 合法动作生成
      view.ts                  viewFor(state, side|spectator)：过滤隐藏信息
      log.ts                   结构化日志条目
      index.ts                 对外 API：newGame / step / legalChoices / view
    ai/
      heuristic.ts             启发式评估
      policy.ts                按 PendingDecision 类型选择
      levels.ts                三档难度
    art/
      kit/                     low poly 素材库（见第 6 节）
      cards/                   110 张卡的插画场景描述
      map/                     地图底图（大陆多边形）
    worker/
      index.ts                 路由、静态资源、/api、/ws
      env.ts                   Env 类型
      auth.ts                  PBKDF2 + HMAC 会话
      lobby.ts                 LobbyDO
      game.ts                  GameDO
    client/
      main.tsx  app.tsx  router.ts
      net.ts                   WS 连接、重连、seq 补发
      local.ts                 离线对局驱动（本地引擎 + AI，IndexedDB 存档）
      pages/                   首页、登录、大厅、房间、对局、复盘、战绩
      game/                    地图、手牌、卡牌详情、轨道、计分预览、选择面板、日志、掷骰、头条、结算
      styles/
  scripts/
    gen-data.ts                从 docs/ref 生成 src/data 并交叉校验
    check-bundle.ts            扫描构建产物有无秘密（种子、对手手牌）
    preview-art.ts             生成全部卡面的预览页，方便人工过目
  test/
    data.test.ts  engine/*.test.ts  cards/*.test.ts  ai.test.ts  view.test.ts
  docs/
```

---

## 5. 规则引擎设计

1. **纯函数接口**：`step(state, side, choice) -> { state, events }`。`legalChoices(state, side)` 返回当前可选项。前端、DO、离线模式、AI、测试共用同一份代码。
2. **决策栈**：所有需要玩家输入的地方都表示为 `PendingDecision { side, kind, options, ctx }`。kind 包括：选牌、事件还是 Ops、选国家、分配影响力、选区域、是否执行可选效果、弃牌等。事件实现写成可以暂停、恢复的步骤序列，以支持多层嵌套（Grain Sales 抽到的牌再打、Star Wars 从弃牌堆取牌、Che 连续两次政变、Missile Envy 等）。嵌套上限 3 层。
3. **确定性随机数**：洗牌和掷骰都从 `seed + counter` 派生。在线模式种子只在 DO 里，客户端只收到掷骰结果；离线模式种子在本地。对局可以从“初始种子 + 动作日志”完整重建，复盘和测试都靠这一点。
4. **状态字段**：
   - 地图：影响力 `inf[86][2]`
   - 轨道：DEFCON、VP、回合、行动轮、军事行动 ×2、太空竞赛 ×2、本回合太空尝试次数 ×2
   - 中国牌：持有者、正面 / 背面
   - 牌区：牌库、弃牌堆、移出区、手牌 ×2、头条槽
   - 效果标记：持续 / 本回合 / 下一行动轮三类
   - 行动轮开始时的影响力快照（用于邻接判断）
   - 计时器、悔棋点
5. **Ops 修正**：中国牌（亚洲 +1）、Vietnam Revolts（东南亚 +1）、Containment / Brezhnev（+1，上限 4）、Red Scare/Purge（-1，下限 1）全部走 `ops.ts`。用规则书的例子做黄金测试。
6. **合法性检查**：DEFCON 地区限制；NATO / 美日安保 / The Reformer / Willy Brandt 的保护；CMC 期间政变即输；Quagmire / Bear Trap 的强制弃牌和掷骰；Nuclear Subs；太空竞赛第 2/4/6/8 格的特权；头条结算顺序（Ops 高者先，平局美方先）；UN Intervention、Defectors 的特殊时机。
7. **隐藏信息**：只有 `view.ts` 一个出口。会公开手牌的事件（Aldrich Ames、Lone Gunman、CIA Created、Grain Sales、Five Year Plan、Ask Not、Our Man in Tehran、Cambridge Five、Terrorism、Brush War 等）产生“定向可见”事件，只推送给有权看到的一方。
8. **规则裁定**：以 DeepStruggle `ref/deepstruggle/engine-rulings.md` 和官方 FAQ 为准，自己的裁定记在 `docs/rulings.md`。当前待核 3 处：
   - Shuttle Diplomacy 是否作用于终局计分（暂按不作用）
   - UN Intervention 取消对手带 ★ 的事件后，该牌是否移出游戏（暂按不移出，进弃牌堆）
   - 替代太空轨不做，所以第三处不影响首版

---

## 6. 美术：手写 SVG，low poly 风格

### 6.1 视觉风格
- 冷战档案主题：米色纸底、炭灰描线；美方蓝 `#2f5d8a`，苏方红 `#b23a2e`，中立灰褐。
- low poly 做法：所有图形用 3–8 边形拼成；同一形状用 2–3 个相邻色阶分面，模拟光照；不用渐变和滤镜，体积小、渲染快。
- 字体：标题用系统衬线字体，正文用系统无衬线字体，不加载网络字体（保证离线可用、体积小）。

### 6.2 素材库 `src/art/kit/`
写一套可复用的 low poly 图元，每个都是一个返回 SVG 片段的 TS 函数，可以传颜色、缩放、朝向：
- 人物：领导人剪影（正面 / 侧面）、士兵、人群、科学家、宇航员
- 军事：导弹、潜艇、坦克、战机、核爆蘑菇云、雷达、卫星
- 政治：旗帜（按国家配色）、讲台、握手、文件和印章、锤子镰刀、星条、铁幕、柏林墙
- 地理：地球、大陆块、山脉、油井、棕榈树、城市天际线、港口
- 太空：火箭、空间站、月面
- 背景：多边形天空、地面、放射光、地图格网

### 6.3 卡牌插画 `src/art/cards/`
- 110 张卡每张写一段场景描述：选哪些图元、怎么摆位、用什么配色、背景是什么。例如 #48 Kitchen Debates = 厨房台面 + 两个对话剪影；#17 De Gaulle = 侧面剪影 + 三色旗；#106 NORAD = 雷达 + 北极圈网格。
- 卡面布局：插画区 + 编号 + 标题 + Ops 星章 + 阵营色带 + ★ 标记 + 持续 / 计分 / 战争标识 + 中文事件文本。计分卡用统一的区域地图样式。
- 先做 10 张样板定风格，让用户看过后再铺满 110 张。
- `scripts/preview-art.ts` 生成一个总览页，方便检查。

### 6.4 地图
- 底图：low poly 的世界大陆轮廓，以示意为主，不追求地理精确。
- 国家：方块节点，排布参照原版棋盘的相对位置（坐标参考 DeepStruggle 的 MIT 布局后自行调整）。
- 节点上显示：中英文名、稳定度、战场国标识（底色区分）、双方影响力数、控制态（实心或描边）。
- 邻接线：区域内实线，跨区域虚线，与超级大国相连的线用双方颜色。
- 轨道（DEFCON、VP、回合、行动轮、军事行动、太空竞赛）放在地图四周或侧栏，样式与原版对应位置一致。
- 交互：缩放、拖动、悬停显示邻接和计分预览，可选国家高亮，并带调整 / 政变的胜率提示。

---

## 7. AI 对手

- **第一档“新兵”**：在合法选项中随机，带简单规则过滤（例如不在 DEFCON 2 时在战场国发动政变）。
- **第二档“参谋”**：启发式评分，考虑区域控制价值、战场国权重、计分卡时机、手里对手事件的伤害、DEFCON 风险、军事行动缺口、太空竞赛甩牌。
- **第三档“将军”**：在第二档基础上做浅层前瞻，即对候选动作做若干次随机模拟后择优，带时间预算。离线模式在 Web Worker 里跑，避免卡界面；在线模式在 DO 里只用第二档，避免占 CPU。
- AI 只通过 `view` 看到自己应知的信息，不作弊。

---

## 8. 在线服务端

### 8.1 协议（`shared/protocol.ts`）
- 客户端发：`hello{roomId, lastSeq}`、`choose{decisionId, choice}`、`undoRequest` / `undoAnswer`、`chat`、`ping`
- 服务端发：`snapshot{view, seq}`、`events{seq, list}`、`decision{...}`、`reveal{...}`（定向可见）、`error`、`presence`
- 每条消息带 seq，断线重连时从 `lastSeq` 补发，差距太大就直接下发快照。

### 8.2 GameDO
- 存储：SQLite 两张表。`meta`（种子、配置、座位、当前快照）+ `log`（动作日志）。每步追加一行日志；快照按行动轮覆盖写一次，以节省写入额度。
- WS：`acceptWebSocket(ws, [userId])`，attachment 记录 `{userId, side}`；收到消息后用引擎推进，再按每个连接各自的视角推送。
- Alarm：计时超时、AI 回合（短延迟，让动画能播完）、终局后 7 天清理。
- 终局：写一次 D1 的 match_results，并保留完整日志供复盘。

### 8.3 Worker / LobbyDO / D1
- 接口：
  - `/api/auth/*`：游客、注册、登录
  - `/api/rooms`：建房、列表、加入
  - `/api/matches`：战绩
  - `/api/replay/:id`：复盘数据，只在终局后可取
  - `/ws/game/:roomId`：对局 WS
- 鉴权：复用 ghost 的 auth（PBKDF2 2 万次 + HMAC 签名 cookie），LobbyDO 做限流。
- D1 表：
  - `users(id, name, pass_hash, created_at)`
  - `match_results(id, room_id, us_user, ussr_user, winner, reason, turn, vp, options, ended_at)`

---

## 9. 前端

- **页面**：首页（在线 / 离线入口、规则速查）→ 登录 / 游客 → 大厅 → 房间（选阵营、选项、AI 补位、邀请链接）→ 对局 → 结算 → 复盘 / 战绩。
- **对局界面**：
  - 中央地图，侧栏放轨道，底部放手牌，右侧放日志和选择面板
  - 打牌流程：选牌 → 选“事件 / Ops / 太空”（预览双方受到的影响）→ 按决策栈逐步选择
  - 头条阶段：双方同时盖牌，然后同时翻开
  - 掷骰动画、影响力增减的飘字、DEFCON 变化提示
  - 计分预览：悬停区域显示当前 Presence / Domination / Control 和分差
  - 常驻效果区：显示当前生效的持续效果卡
  - 卡牌查询：弃牌堆、移出区、剩余牌库（按时期统计，不显示顺序）
- **适配**：以桌面为主，移动端横屏可玩（地图缩放 + 手牌抽屉）。
- **离线模式**：在本地跑引擎，AI 在 Web Worker 里；自动存档到 IndexedDB，可以开多个存档；PWA 断网也能打开。

---

## 10. 里程碑与任务

### M0 脚手架
- [ ] npm 初始化、TS / Vite / Preact / vitest 配置，项目内装 wrangler ^4.160
- [ ] wrangler.jsonc（静态资源 SPA、`run_worker_first: ["/api/*","/ws/*"]`、GameDO / LobbyDO sqlite 迁移、D1、vars、observability）
- [ ] 创建 D1 `cold-war-db`，写 `wrangler.local.jsonc`，写 0001 迁移
- [ ] 空页面 + `/api/health` + WS 回显，部署到 Cloudflare 默认子域
- [ ] 写 .gitignore 和 README（含非商业声明）
- **验收**：线上能打开页面，WS 能连通。

### M1 数据层
- [ ] `scripts/gen-data.ts`：读 ref 下两份开源数据，生成 `src/data/*.ts`，两份数据逐项交叉比对
- [ ] 中文名和中文事件文本：以 DeepStruggle zh-CN 为底稿，对照英文原文校订；补上 #27 的持续标记
- [ ] 数据单测：84 国、29 个战场国、邻接对称、各区域数量、110 卡 Ops 总和与时期分布、开局影响力
- **验收**：`npm test` 数据部分全部通过。

### M2 核心引擎
- [ ] state / rng / log / decisions 基础设施
- [ ] 开局：苏方 15 点 + 东欧自由放 6 点；美方 25 点 + 西欧自由放 7 点；+2 / 竞价选项
- [ ] 回合流程：DEFCON 提升 → 发牌（第 4、8 回合加入中期 / 晚期牌）→ 头条 → 行动轮（第 1–3 回合 6 轮，之后 7 轮）→ 军事行动检查 → 持有计分卡检查 → 翻正中国牌 → 回合推进 → 第 10 回合终局计分
- [ ] 四种行动：放影响力（邻接快照、进入对手控制国要花 2 点）、调整（修正值）、政变（DEFCON 地区限制、战场国降 DEFCON、计入军事行动）、太空竞赛（Ops 门槛、每回合次数、各格 VP 与特权）
- [ ] Ops 修正、中国牌（交接、翻面、亚洲 +1、终局 +1 VP）
- [ ] 计分：6 个区域 + 东南亚 + 终局；自动胜负全部条件
- [ ] 打出对手事件的规则：选择先后、事件 / Ops 顺序
- [ ] legalChoices 全覆盖，只用 Ops 打法也能完整走完 10 回合
- **验收**：引擎单测 + 规则书例子的黄金测试全部通过；随机 Ops 自对弈 10 回合不报错。

### M3 卡牌事件（110 张）
- [ ] 早期 35 张（#1–35，含 #103–106）
- [ ] 中期 46 张（#36–81，含 #107–110）
- [ ] 晚期 22 张（#82–102）
- [ ] 每张卡至少 1 个单测；交互用例移植自 DeepStruggle `engine/tests`（CMC、Quagmire / Bear Trap、Red Scare、NORAD、Missile Envy、Star Wars、Grain Sales、UN Intervention、Wargames、Defectors 等）
- [ ] 写 `docs/rulings.md`
- [ ] 不变量检查：影响力 ≥0、DEFCON ∈ [1,5]、手牌数合法、决策栈不会卡死、牌总数守恒
- **验收**：卡牌测试全部通过；第一档 AI 自对弈数局都能正常终局。

### M4 美术
- [ ] 主题色和卡面模板
- [ ] low poly 素材库，约 40 个图元
- [ ] 10 张样板卡插画 → **请用户过目定风格**
- [ ] 其余 100 张卡插画
- [ ] 地图底图、国家节点、邻接线、轨道样式
- [ ] 图标（Ops 星章、★、持续 / 计分 / 战争标识、DEFCON、太空格）、应用图标
- [ ] preview-art 总览页
- **验收**：总览页里 110 张卡都有插画，地图完整可读；控制产物体积（目标：全部 SVG gzip 后 < 500 KB）。

### M5 前端与离线模式
- [ ] 应用框架、路由、主题
- [ ] 地图组件（缩放、拖动、高亮、悬停预览）
- [ ] 手牌、卡牌详情、打法选择与预览
- [ ] 选择面板：每种 PendingDecision 一个交互
- [ ] 轨道面板、常驻效果区、牌区查询
- [ ] 头条阶段、掷骰动画、事件动画
- [ ] 日志（可点击定位到地图）
- [ ] 结算页
- [ ] 离线模式：本地驱动、Web Worker 跑 AI、IndexedDB 存档、PWA
- **验收**：离线模式下能和第一档 AI 完整打完一局。

### M6 AI
- [ ] 第二档启发式评分
- [ ] 第三档浅层前瞻（Web Worker，带时间预算）
- [ ] AI 只看 view 的单测
- **验收**：第二档稳定胜过第一档（跑几局即可）；任何局面下都不卡死。

### M7 在线服务端
- [ ] 协议定义、GameDO（引擎接入、视角推送、日志与快照、Alarm）
- [ ] LobbyDO、鉴权、房间接口
- [ ] 重连补发、悔棋请求、计时、观战
- [ ] 在线人机（AI 补位）
- [ ] D1 战绩、复盘接口
- [ ] check-bundle 接入构建
- [ ] view 泄露测试：任意局面下，一方的 view 都不含对方手牌和牌库顺序
- **验收**：两个浏览器在线对战，刷新 / 断网后能恢复；部署后线上跑通一局人机对战的前几回合。

### M8 打磨上线
- [ ] 复盘播放器（逐步、跳转到指定回合）
- [ ] 战绩页
- [ ] 移动端横屏适配
- [ ] 规则速查页、卡牌图鉴
- [ ] 新手提示（可关闭）
- [ ] 额度用尽时的友好提示
- [ ] README、部署说明
- **验收**：正式上线。

> 顺序说明：M1–M3 只用测试验证，不依赖 UI。M4 美术可以和 M2/M3 交替做。离线模式（M5）先于在线（M7），因为它只用到引擎，能尽早端到端可玩。

---

## 11. 测试策略

- **数据**：拓扑和卡表的完整性与对称性。
- **引擎**：每条规则都有单测；规则书例子做黄金测试。
- **卡牌**：每张卡至少 1 个测试；重点交互移植 DeepStruggle 的用例。
- **不变量**：在 AI 自对弈中每一步都检查。只跑少量对局，不做大规模模拟。
- **视图**：隐藏信息不泄露。
- **线上**：部署后手动冒烟测试。

---

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| 110 张卡的交互复杂，最容易出 bug | 用决策栈统一建模；参考 DeepStruggle 的裁定和测试；每张卡都有单测 |
| 免费计划 CPU 限制 | 引擎单步保持轻量；在线 AI 只用第二档；前瞻搜索只在浏览器里跑 |
| DO 写入额度 | 日志追加写，快照按行动轮覆盖写，少调 setAlarm |
| 隐藏信息泄露 | view 是唯一出口；种子只在服务端；check-bundle 扫描产物；专门写泄露测试 |
| 一局约 3 小时，可能断线或中途离开 | DO 持久化，随时继续；离线存档；重连按 seq 补发 |
| 110 张手绘插画的工作量 | 先建素材库再组合场景；先做 10 张样板确认风格，避免返工 |
| 版权 | 不用任何 GMT 美术；自用；README 声明规则和卡牌文本版权归 GMT |

---

## 13. 参考
- 规则：`ref/rules-20th-anniversary.txt`、`ref/rules-deluxe.txt`
- 数据：`ref/data/*.json`（tomjefferys/twilight-struggle-rs，MIT）
- 裁定与中文：`ref/deepstruggle/`（mihaild/DeepStruggle，MIT）
- 架构模板：同作者的其他 Cloudflare 在线桌游项目
