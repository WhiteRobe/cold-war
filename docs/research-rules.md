# Twilight Struggle（冷战热斗）规则调研报告：网页版一比一复刻用

> 调研日期 2026-11-17。正文用中文，规则术语保留英文原词方便对照官方文本。
> 文末附表 A/B/C 是完整原始数据：84 国、110 张卡、英文卡牌原文。数据取自两个独立的 MIT 开源实现，已用脚本逐项交叉比对。

---

## 0. 版本与权威来源

| 版本 | 年份 | 关键差异 | 规则书 |
|---|---|---|---|
| 初版 (1st) | 2005 | 美方开局 20 点影响力（不含加拿大），太空竞赛第 6 格是 "Space Walk"，第 8 格是 Eagle Landed | [1j1ju 镜像 PDF](https://cdn.1j1ju.com/medias/96/ab/a4-twilight-struggle-rulebook.pdf) |
| 2nd / Deluxe | 2007 / 2009 | 美方 25 点（加拿大 2、澳大利亚 4）。加入 #103 Defectors 和可选卡 #104–110，换了新地图和新太空轨 | [GMT living rules：TS_Rules_Deluxe.pdf](https://www.gmtgames.com/living_rules/TS_Rules_Deluxe.pdf)（"2nd Edition © 2007"，与 Deluxe 正文相同） |
| 数字版 Playdek | 2016– | 按 Deluxe 规则实现，社区和比赛标准是“含可选卡 + 美方 +2 影响力” | — |
| **20th Anniversary Hall of Fame Edition** | ©2026 | **核心规则与 Deluxe 相同**。#104–110 改为**默认加入**；“持有计分卡即判负”从锦标赛规则变成正式阶段 F；另外收录 Turn Zero、Red Sun Rising、18 张促销卡 P1–P18、替代太空轨、竞价规则 | [GMT 官方 PDF](https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/Twilight+Struggle+20th+Anniversary+HOF+Edition/Twilight+Struggle+20th+Ann_Rule+Book_WEB.pdf) |

**结论**：用户说的“v2/2025 版”实际对应 **20th Anniversary HOF Edition（GMT，规则书 ©2026）**，没有单独的 2025 规则版本。它的基础规则与 Deluxe 一致，网页版直接按 “Deluxe = 20 周年版基础规则 + 110 张卡” 实现即可。
- 关于“可选卡 3 张”：这个说法不准确。Deluxe 的可选卡是 **7 张（#104–110）**：Cambridge Five、Special Relationship、NORAD、Che、Our Man in Tehran、Yuri and Samantha、AWACS Sale to Saudis。#103 Defectors 在 Deluxe 里已经是基础牌。20 周年版规则书 2.2.1 写明 104–110 默认加入，想去掉时“remove cards 104-110”。
- 本报告的规则条文主要依据 20 周年版官方 PDF（已下载并抽取全文），并用 Deluxe living rules 核对。卡牌文本用 Deluxe/Playdek 版。

---

## 1. 组件与地图

### 1.1 组件（基础游戏）
- 双面地图 1 张（经典地图和 20 周年新地图，两面功能相同）、骰子 2 颗（d6）、110 张事件卡（#1–110）、影响力标记若干（规则 6.1.5：影响力像现金一样可以拆分，数量不设上限）。
- 轨道和标记：DEFCON 轨、VP 轨（-20…+20）、回合轨（1–10）、行动轮轨、两条军事行动轨（0–5）、太空竞赛轨（0–8），以及持续事件提示标记。

### 1.2 区域结构（规则 2.1）
- 6 大区域：Europe、Asia、Middle East、Africa、Central America、South America。
- Europe 下分 **Western Europe / Eastern Europe**。**Austria、Finland 同时属于东欧和西欧**。
- Asia 下有子区域 **Southeast Asia**（7 国：Burma、Laos/Cambodia、Thailand、Vietnam、Malaysia、Indonesia、Philippines）。
- 地理上的特例：Canada、Turkey 属于欧洲；Libya、Egypt 属于中东。
- 凡是写“Europe”或“Asia”的规则和卡牌，都包含其子区域（2.1.4）。
- USA、USSR 两个超级大国格**不能放影响力**，但在事件和 Realignment 中算作“相邻的受控国”（2.1.5）。DeepStruggle 按 FAQ 实现：战争事件计算“防守方相邻受控国”时也计入超级大国格（Brush War 的 FAQ 推翻了早期裁定）。
- 邻接分三类：区域内连线、跨区域虚线、与超级大国的连线。**邻接不完全按真实地理**（2.1.6 设计说明）。

### 1.3 统计（由附表 A 计算）
| 区域 | 国家数 | 战场国(BG)数 | 战场国 |
|---|---|---|---|
| 欧洲 | 21 | 5 | France, West Germany, East Germany, Poland, Italy |
| 中东 | 10 | 6 | Egypt, Israel, Iraq, Iran, Saudi Arabia, Libya |
| 亚洲 | 15（含 SEA 7） | 6 | Pakistan, India, Thailand, North Korea, South Korea, Japan（Formosan Resolution 生效时 Taiwan 在亚洲计分中视为 BG） |
| 非洲 | 18 | 5 | Algeria, Nigeria, Zaire, Angola, South Africa |
| 中美洲 | 10 | 3 | Mexico, Panama, Cuba |
| 南美洲 | 10 | 4 | Venezuela, Chile, Argentina, Brazil |
| **合计** | **84** | **29** | |

- **与美国相邻**：Canada、Mexico、Cuba、Japan。
- **与苏联相邻**：Finland、Poland、Romania、Afghanistan、North Korea。
- 完整国家表（稳定度、BG、全部邻接、中文名、开局影响力）见 **附表 A**。

### 1.4 控制判定（2.1.7）
```
controls(p, c) = inf[p][c] >= stab[c]  &&  inf[p][c] - inf[opp][c] >= stab[c]
```

### 1.5 网页版地图素材怎么解决
- 国家拓扑数据（附表 A）可以直接用：两个 MIT 仓库都声明国名、邻接、稳定度属于事实数据。
- **棋盘美术、卡面插画和卡牌文本版权归 GMT**。可以参考的坐标或布局来源：
  - DeepStruggle `web/ui`：Vite + TS 写的 SVG 简化地图，viewBox 1000×650，带国家方框布局，MIT。
  - Saito `node/mods/twilight`：有基于原版棋盘图的坐标，但图片素材受 GMT 许可约束。
  - tomjefferys `data/standard_layout.json`：终端字符布局。
- 商用或公开发布需要 GMT 授权。Saito 的约定是“非商业、开源引擎、每局至少一方购买过实体游戏”。

---

## 2. 轨道

### 2.1 DEFCON（8.1）
| 等级 | 效果 |
|---|---|
| 5 | 无限制 |
| 4 | 欧洲禁止 Coup 和 Realignment |
| 3 | 欧洲、亚洲（含 SEA）禁止 Coup 和 Realignment |
| 2 | 欧洲、亚洲、中东禁止 Coup 和 Realignment |
| 1 | 核战争，**当前行动方（Phasing Player）立即判负**。头条阶段里，打出该头条牌的玩家视为行动方 |

- 上限 5，超过 5 的改善无效。每回合开始时 DEFCON +1（最高 5）。
- **任何在 BG 国的 Coup 都会使 DEFCON -1**，包括事件给的免费 Coup。Nuclear Subs 生效期间美方用 Ops 发动的 BG Coup 例外。
- 事件给的“某区域免费 Coup”（Junta、Tear Down this Wall、Ortega 等）**可以无视 DEFCON 的地区限制**（6.3.5），但打 BG 照样降 DEFCON，**也不计入军事行动**。

### 2.2 军事行动 Military Ops（8.2）
- 每回合每方需要达到的 MilOps 等于**回合末检查时的 DEFCON 值**。每差 1 点，对手 +1 VP；双方都不足时按净差结算。
- 计入 MilOps 的有：用 Ops 发动的 Coup（加该牌的**实际 Ops 值**，也就是修正后的值，例：Red Scare 下 2 点牌只记 1）和战争事件（按卡面数字：Korean / Arab-Israeli / Indo-Pak / Iran-Iraq 记 2，Brush War 记 3）。How I Learned 直接 +5。
- 不计入的有：Realignment，以及事件给的免费 Coup（Junta、TDTW、Ortega）。**Che 的 Coup 计入**：DeepStruggle 根据 Playdek 日志这样实现。
- 对手的战争事件被我方打出（我方用它的 Ops）时，**由对手**推进 MilOps（8.2.4）。
- MilOps 上限 5。检查完毕后清零。

### 2.3 太空竞赛（6.4，Deluxe / 20 周年默认轨道）
| 格 | 名称 | 所需最小 OPS | 成功骰（d6 ≤） | VP 先到/后到 | 先到者特权（后到者到达时特权取消） |
|---|---|---|---|---|---|
| 1 | Earth Satellite | 2 | 3 | 2 / 1 | — |
| 2 | Animal in Space | 2 | 4 | 0 / 0 | 每回合可以做 2 次太空尝试 |
| 3 | Man in Space | 2 | 3 | 2 / 0 | — |
| 4 | Man in Earth Orbit | 2 | 4 | 0 / 0 | 对手先选并公开头条，自己后选 |
| 5 | Lunar Orbit | 3 | 3 | 3 / 1 | — |
| 6 | Eagle/Bear has Landed | 3 | 4 | 0 / 0 | 回合末可以弃掉 1 张保留的手牌 |
| 7 | Space Shuttle | 3 | 3 | 4 / 2 | — |
| 8 | Space Station | 4 | 2 | 2 / 0 | 每回合可进行 8 个行动轮 |

- 数据来自 tomjefferys `src/space.rs`（含单元测试），与规则书 6.4.3 一致：“5 个格子有斜杠 VP，如 Lunar Orbit 3/1”。
- 规则要点：
  - 每回合 1 次尝试（有 Animal 特权时 2 次），这是一个行动轮的全部行动。
  - 牌的 OPS 要 ≥ 目标格的要求。**牌上的事件不发动**，包括对手事件，所以太空竞赛是“甩掉”坏事件的安全阀。
  - 计分卡不能用于太空竞赛。China Card 可以用（DeepStruggle 认为合法，但 Asia +1 无效），用完照样面朝下交给对手。
  - 到达终点格后不能再进行太空尝试。
- 设计者可选规则：甩牌进太空时可以选择不掷骰。
- **Eagle/Bear has Landed 不能用来弃掉计分卡**：持有计分卡时已经先触发判负。DeepStruggle 的实现顺序是“先执行特权弃牌，再检查持有计分卡”，弃牌可选范围里不含计分卡，需要实现方自行定夺。
- 20 周年版替代太空轨（13.1，可选，不平衡）：
  - 格 2 Earth Satellite：每回合 MilOps 检查时 +2。
  - 格 4 Eagle/Bear Landed：每个行动轮 1 次，用 1 Ops 往敌控国放 1 点影响力。
  - 格 6 ABMs：每回合 1 次重掷 Coup。
  - 格 7 Neutron Bomb：对手 Coup 骰 -1。
  - 该轨的 OPS 和骰值要求原 PDF 只有图，需要看实物。

### 2.4 VP 轨（10.2）
- 范围 -20（苏方自动胜）… +20（美方自动胜），0 为起点格。
- 双方同时得分（计分卡、事件）时只移动差值，**结算完毕后**再判定 20 VP 自动胜利。

### 2.5 回合轨与行动轮
| 回合 | 时期 | 抽到手牌数 | 行动轮数 | 牌堆变化 |
|---|---|---|---|---|
| 1–3 | Early War | 8 | 6 | 开局只有早期牌（不含 China Card），共 38 张 |
| 4–7 | Mid War | 9 | 7 | 第 3 回合结束（第 4 回合发牌前）把 48 张中期牌洗入**当前抽牌堆**，弃牌堆不并入 |
| 8–10 | Late War | 9 | 7 | 第 7 回合结束时把 23 张晚期牌洗入当前抽牌堆 |

- 按时期分：早期 39（含 China）、中期 48、晚期 23，合计 110。
- 特权或事件可以带来第 8 个行动轮：Space Station（每回合），North Sea Oil（美方仅当回合）。DeepStruggle 把第 8 轮实现为可放弃。
- China Card 不计入手牌上限。

---

## 3. 开局与回合流程

### 3.1 开局（3.0）
1. 洗早期牌，**从苏方开始交替发牌**，每人 8 张。China Card 正面朝上放在苏方面前。双方可以先看手牌，再放初始影响力。
2. **苏方先放 15 点**：Syria 1、Iraq 1、North Korea 3、East Germany 3、Finland 1，另有 **6 点任意放在东欧**。
3. **美方后放 25 点**：Canada 2、Iran 1、Israel 1、Japan 1、Australia 4、Philippines 1、South Korea 1、Panama 1、South Africa 1、UK 5，另有 **7 点任意放在西欧**。
4. 太空标记放在起点（0），MilOps 归 0，回合 1，DEFCON 5，VP 0。
5. **让分和竞价**：
   - 社区、Playdek、ITS/WBC 的常用标准是**含可选卡 + 美方 +2 影响力**。这 2 点在美方完成正常布置后放置，只能放进已有美方影响力的国家。
   - 20 周年规则 13.4 给出正式竞价：双方暗写“阵营 + 数字”。阵营相同时数字大者得到该阵营，对手获得等量额外影响力。额外影响力只能放在开局已有己方影响力的国家，**且不得超过“达到控制所需量 + 2”**。
   - Deluxe 11.1.3 的旧竞价方式是竞 VP，已被新方式取代。建议网页版实现 13.4，默认值设为“US +2”。

### 3.2 每回合流程（4.5）
```
A. Improve DEFCON：DEFCON < 5 时 +1
B. Deal：补到 8 张（T1–3）或 9 张（T4–10），从苏方开始交替发；牌堆抽空时先发完剩余牌，再把弃牌堆洗成新牌堆（★ 卡已移出）
C. Headline Phase（头条）
D. Action Rounds：USSR 先，交替进行 6/7（最多 8）轮
E. Check Military Ops：结算 VP 罚分，MilOps 归零
F. Check for Held Scoring Card：仍持有计分卡者立即判负（20 周年版正式规则；Deluxe 中仅锦标赛使用，网页版应强制执行）
G. Flip China Card：面朝下的 China Card 翻为正面
H. Advance Turn：T3 结束时加入中期牌，T7 结束时加入晚期牌
I. Final Scoring：仅在 T10 之后
```

**头条阶段细节（C）**
- 双方各暗选 1 张牌，同时公开。有 Man in Earth Orbit 特权的一方在对手公开之后再选。
- 头条牌的 **OPS 较高者先结算，相同时美方先**。计分卡视为 0 OPS；双方都出计分卡时美方的先结算。
- 头条必须打出并执行事件。打出对手的事件时，由对手执行该事件，但打出者算作行动方（关系到 DEFCON 1 由谁负责）。
- **China Card 不能做头条**。头条不给 Ops，除非事件文字本身给 Ops（如 Olympic Games 被抵制、ABM Treaty 等）。
- UN Intervention 不能在头条打出。Defectors 可以在头条打出，用来取消苏方的头条事件，被取消的牌进弃牌堆。
- 实现要点：两张头条各自在独立的结算上下文中执行（DeepStruggle §15）。

**行动轮细节（D）**
- 每轮必须打 1 张牌，不能主动 pass。没牌可打时，本回合剩余行动轮全部跳过。
- 不能只靠 China Card 强制行动（9.8）。DeepStruggle 的处理：手里只剩 China Card 时允许 pass。
- 每张牌只能选一种用法：**事件**，或者 **Ops（4 种用途选 1，全部点数用于同一用途）**。

### 3.3 终局记分（10.3.2）
- T10 结束后按 Europe 开始的顺序给**所有区域**记分，SEA 并入 Asia 计算，不单独记分。Europe 先算，是因为控制 Europe 直接获胜。
- 所有区域算完之后才判胜负。**终局记分中达到 ±20 不算自动胜利**（Deluxe 明文规定），只有控制 Europe 例外。
- **持有 China Card 者 +1 VP**（卡面文字）。China Card 面朝下也算持有。
- VP > 0 美方胜，< 0 苏方胜，= 0 平局。

---

## 4. 行动类型（6.0）

### 4.1 放置影响力（6.1）
- 只能放在“**本行动轮开始时**已有己方影响力的国家”或其邻国，也可以放在己方超级大国的邻国。**必须在行动轮开始时拍一张快照**：本轮新放的影响力不能当作继续延伸的跳板。
- 费用：己控国或未受控国每点 1 Ops，**敌控国每点 2 Ops**。如果放置过程中控制状态改变，后续按新费用计（规则 6.1.2 的土耳其例子：先花 2 Ops 打破控制，之后每点 1 Ops）。
- 可以分散到多国、多区域。事件放置的影响力不受邻接限制，除非卡面另有说明。
- China Card 的 +1 和 Vietnam Revolts 的 +1 只在 Ops **全部**用于亚洲 / 东南亚时生效。实现时要动态限制非 Asia 的目标，见 DeepStruggle 的 `budget_if_spent_in`。DeepStruggle 还要求放影响力的 Ops 必须花完，除非已经没有合法目标。

### 4.2 Realignment（6.2）
- 每次掷骰花 1 Ops。目标国必须有对手影响力，我方在该国或邻国有没有影响力都可以。可以逐次掷完再决定下一个目标，同一国可以反复选。
- 双方各掷 1d6，修正如下：
  - +1 / 每个相邻的己控国（**超级大国格算作相邻受控国**，例：USSR 相邻 North Korea，苏方 +1）
  - +1 如果在目标国的影响力多于对方
  - +1 如果目标国与己方超级大国相邻（规则书例子中 NK 就是这样得到 +1）
  - Iran-Contra：美方 -1
- 点数高者移除对方影响力，数量等于差值；平局无效果。**不会增加己方影响力**。
- 受 DEFCON 地区限制，不计 MilOps。NATO、US/Japan Pact 等事件会保护特定国家免受对手 Realignment。

### 4.3 Coup（6.3）
- 目标国必须有对手影响力。受 DEFCON 地区限制。
- 判定：`d6 + 该牌实际 Ops > 2 × 稳定度` 即成功。差值先移除对手影响力，不够移时用己方影响力补足。
- 修正项：SALT 双方 -1；Latin American Death Squads 对中南美 Coup 本方 +1、对方 -1；Yuri & Samantha 美方每次 Coup 给苏 1 VP（不改骰值）。
- 打出 Coup 时 MilOps 加上该牌的 Ops。BG 国 DEFCON -1（成败都降）。
- 禁止情况：
  - NATO：苏方不能 Coup 或 Realign 美控欧洲国，de Gaulle 解除法国、Willy Brandt 解除西德。
  - US/Japan Pact：苏方不能对日本 Coup 或 Realign。
  - The Reformer 之后：苏方不能在欧洲发动 Coup。
  - Cuban Missile Crisis：被针对的一方一旦 Coup 就输掉游戏。
- 顺序建议：宣布目标 → 校验合法性 → 推进 MilOps → 处理 CMC 解除选项 → 掷骰 → 结算 → BG 降 DEFCON → 检查 DEFCON 1。DEFCON 降到 1 时行动方判负。

### 4.4 太空竞赛（6.4）
见 §2.3。

### 4.5 打出带对手事件的牌（5.2）
- 用**对手事件牌**换取 Ops 时，对手事件**一定会发动**，由**对手执行**。行动方决定事件在 Ops **之前还是之后**结算。
- 事件的前提条件没满足（如 NATO 需要先有 Marshall Plan 或 Warsaw Pact），或已被禁止（如 Camp David 之后的 Arab-Israeli War）时，事件不发动，带 ★ 的牌也不移出，进弃牌堆。
- 事件发动但没有效果时（例：Alliance for Progress 打出时美方没有 BG），**仍算已发动**，带 ★ 的照样移出。
- 中立牌（灰星）可由任一方作事件打出，打出者即事件的执行者。用 Ops 打出中立牌时**事件不发动**。
- 被事件强制弃掉的牌不发动事件，计分卡也一样（5.4）。“要求打出或弃掉 X Ops 以上的牌”时，更高 Ops 也算满足（5.3）。
- 卡面文字优先于规则（5.5），10.1.5 除外：事件不能强迫玩家持有计分卡。

### 4.6 China Card（9.0）
- 开局属于苏方，面朝上。4 Ops，**全部用于亚洲（含 SEA）时 +1**。
- 打出后**面朝下交给对手**，对手本回合不能使用，回合末阶段 G 翻面。
- 不能用作头条，不能被事件要求弃掉，不能被强迫打出，**不计入手牌上限**。打出它占用一个行动轮，所以回合末可能留下多张牌。
- 可以被 Ops 修正（Containment、Brezhnev、Red Scare）。
- 相关事件：
  - Nixon Plays the China Card：苏方持有时转给美方，**面朝下**；美方已持有时美方 +2 VP。
  - Cultural Revolution：美方持有时转给苏方，**面朝上**；苏方已持有时苏方 +1 VP。
  - Ussuri River：苏方持有时转给美方，**面朝上**；美方已持有时美方在亚洲加 4 点影响力。
  - Formosan Resolution：美方打出 China Card 后取消。
- 终局持有者 +1 VP。
- **Ops 计算公式**（DeepStruggle `combine_ops`，与规则书示例一致）：
```
ops = base + (Containment/Brezhnev ? 1 : 0) - (Red Scare/Purge ? 1 : 0)
cap = 4; if (China && 全部用于 Asia) { ops += 1; cap = 5 }
if (Containment/Brezhnev) ops = min(ops, max(cap, base))   // “最大 4”，China 在亚洲时为 5
if (USSR && Vietnam Revolts && 全部用于 SEA) ops += 1       // 不受上限约束
ops = max(ops, 1)                                          // Red Scare 最低降到 1
```
  - 规则书 7.4 示例：Red Scare 和 Vietnam Revolts 同时生效时，苏方 China Card 全部用于 SEA，结果是 5 Ops。
  - Ops 修正只作用于修正卡所属的一方。偷来的牌不享受（7.4.1，如 Grain Sales 偷到牌，Brezhnev 不加成）。
  - Ops 修正“适用于一切用途”（7.4.2）：包括 Bear Trap/Quagmire 的弃牌门槛、Coup 骰值、MilOps 记数，以及**事件授予的 Ops**（CIA Created、Lone Gunman、Olympic 抵制后的 4 Ops 等，7.4.3）。

---

## 5. 记分（10.1）

### 5.1 区域计分卡
| 卡 | Presence | Domination | Control | 附加 |
|---|---|---|---|---|
| #2 Europe | 3 | 7 | **自动胜利** | +1/己控 BG；+1/与敌方超级大国相邻的己控国 |
| #1 Asia | 3 | 7 | 9 | 同上（Asia 的计算包含 SEA 国家） |
| #3 Middle East | 3 | 5 | 7 | +1/己控 BG |
| #37 Central America | 1 | 3 | 5 | +1/己控 BG；+1/与敌超级大国相邻的己控国 |
| #81 South America | 2 | 5 | 6 | +1/己控 BG |
| #79 Africa | 1 | 4 | 6 | +1/己控 BG |
| #38 SE Asia（★，唯一会移出的计分卡） | 每控制 Burma、Laos/Cambodia、Vietnam、Malaysia、Indonesia、Philippines 各 1 VP；**Thailand 2 VP** | | | 不计 Presence/Domination/Control |

- **Presence**：至少控制该区域 1 国。
- **Domination**：控制国总数**多于**对手，**且**控制的 BG 数多于对手，**且**至少控制 1 个非 BG 国。
- **Control**：控制国总数多于对手，**且**控制该区域**全部** BG。
- 三档互斥，只取最高档。附加分对所有区域都适用（规则 10.1.2）；中东、非洲、南美没有与超级大国相邻的国家，所以卡面上不写这一项。
- 双方各自算总分，VP 轨按差值移动。
- 修正事件：
  - **Shuttle Diplomacy**：下一次 Middle East 或 Asia 计分时，从苏方的 BG 数中减 1（同时减少国家数），然后弃掉这张牌。SEA 计分不触发。DeepStruggle 按 FAQ 实现为终局记分不适用，建议对照最新 FAQ 再确认。Shuttle Diplomacy 不影响 Summit 的区域判定。
  - **Formosan Resolution**：Taiwan 被美方控制时，**仅在 Asia 计分中**视为 BG。
- 计分卡可以作为头条打出。行动轮中打出计分卡即执行计分，不提供 Ops。

### 5.2 自动胜利 / 失败条件（10.3.1）
1. 一方达到 **20 VP**，立即胜。双方的 VP 先结算完再判定。阶段 E 中达到 20 VP 的一方要先亮手牌，如果持有计分卡则反而判负。
2. 打出 **Europe Scoring** 时某方 Control Europe，该方立即获胜。终局记分中也适用。
3. **DEFCON 降到 1**：行动方判负。头条阶段中，打出该头条的人算作行动方。
4. 阶段 F **持有计分卡**：判负。
5. **Wargames（#100）**：DEFCON 为 2 时可以作为事件打出，先给对手 6 VP，然后游戏**立即结束**，按当前 VP 判胜负，**不进行终局记分**。
6. **Cuban Missile Crisis** 期间被针对方发动 Coup：该方判负。
7. T10 终局记分后比较 VP，0 为平局。

---

## 6. 卡牌
- 完整 110 张卡（编号、英文名、中文名、阵营、OPS、时期、★、持续 / 战争 / 计分 / 可选标记、中文事件说明）见 **附表 B**；英文原文见 **附表 C**。
- **可用的开源结构化卡表**（比手抄可靠）：
  - [tomjefferys/twilight-struggle-rs `data/cards.json`](https://github.com/tomjefferys/twilight-struggle-rs/blob/main/data/cards.json)（MIT）：字段有 id、name、ops、phase、side、optional、removed_after_event、ongoing、scoring、text。**推荐直接拿来用。**
  - [mihaild/DeepStruggle](https://github.com/mihaild/DeepStruggle)（MIT）的几处数据：
    - `rules/cards.json`、`rules/map.json`：JSON 格式。
    - `engine/src/card_data.cpp`、`engine/src/map_data.cpp`：C++ 表，含 starred/scoring/war 标志。
    - `web/ui/src/i18n/locales/zh-CN/game.json`：**110 张卡和 84 国的中文名与中文说明**，可以直接作为网页版的 i18n 起点。
    - `web/ui/src/i18n/locales/zh-CN/effects.json`：持续效果的中文说明。
  - DeepStruggle 的 Release `ever-drawn-20261022` 附有 `cards.csv`（id、name、era、side、ops、starred、scoring）。
  - [twilightstrategy.com/card-list](https://twilightstrategy.com/card-list/)：HTML 卡表，附策略讨论。
  - [spotlight.histmyst.org/chart/ts.html](https://spotlight.histmyst.org/chart/ts.html)：各卡能影响哪些国家 / 区域的速查。
- 已做的交叉校验：tomjefferys 与 DeepStruggle 的 OPS、阵营、★、时期 **110/110 一致**，地图 **84/84 一致**。
- 有一处修正：tomjefferys 的 `ongoing` 字段漏标了 **#27 US/Japan Mutual Defense Pact**。该卡效果持久（苏方永久不能 Coup 或 Realign 日本），附表 B 已补标为“持续”。

### 6.1 按效果类型分类（方便事件引擎建模）
- **持续事件**（标题下划线，放在桌边，直到被取消）：#16 Warsaw Pact（解锁 NATO）、#17 De Gaulle、#21 NATO、#23 Marshall（解锁 NATO）、#27 US/Japan、#35 Formosan、#42 Quagmire、#44 Bear Trap、#55 Willy Brandt、#59 Flower Power、#65 Camp David、#68 John Paul II（解锁 Solidarity）、#73 Shuttle Diplomacy、#82 Iranian Hostage、#83 Iron Lady、#86 North Sea Oil、#87 The Reformer、#96 Tear Down this Wall、#97 Evil Empire、#106 NORAD、#110 AWACS。
- **本回合内有效**：#9 Vietnam Revolts、#25 Containment、#31 Red Scare/Purge、#40 CMC、#41 Nuclear Subs、#43 SALT（Coup -1）、#51 Brezhnev、#60 U-2（本回合内若有 UN Intervention 再 +1）、#69 LADS、#86 North Sea Oil（8 轮）、#93 Iran-Contra、#94 Chernobyl、#98 Aldrich Ames（本回合美方亮手牌）、#109 Yuri & Samantha。
- **只影响下一个行动轮**：#49 Missile Envy（对手下一轮必须把它当 Ops 打出）、#50 We Will Bury You（美方下一轮没打出 UN Intervention 事件，苏方就 +3 VP）。
- **前提 / 禁止关系**（实现为布尔 flag）：
  - NATO ← Marshall / Warsaw；Solidarity ← John Paul II；Glasnost 的额外 Ops ← The Reformer。
  - Arab-Israeli War ✗ Camp David；Socialist Governments ✗ Iron Lady；OPEC ✗ North Sea Oil；Muslim Revolution ✗ AWACS；Willy Brandt ✗ Tear Down this Wall；Flower Power ✗ Evil Empire。
  - NORAD 被 Quagmire 取消；Formosan 在美方打出 China Card 后取消；Cambridge Five 在晚期不能作为事件打出。
  - East European Unrest 在晚期改为每国移除 2 点。
- **战争事件**（5 张）：#11 Korean War、#13 Arab-Israeli War、#24 Indo-Pakistani War、#36 Brush War、#102 Iran-Iraq War。
  - 掷骰时，目标国每有一个相邻的敌控国（含超级大国格）-1；Arab-Israeli War 在以色列本身被美控时再额外 -1。
  - 成功判定：Brush War 需要 ≥3，其余需要 ≥4。
  - 成功后：获得 VP，并把目标国中敌方的影响力全部换成己方影响力。
  - MilOps 按卡面推进。Flower Power 生效期间，美方每打出一张战争牌（作事件或用 Ops）苏方 +2 VP，用于太空竞赛的除外。
  - 打战争牌不需要在任何一方国家有影响力（7.6）。
- **会翻看或抽取手牌、牌堆、弃牌堆的牌**：CIA Created、Lone Gunman、Aldrich Ames、Cambridge Five、Five Year Plan、Grain Sales、Missile Envy、Terrorism、Blockade、LADC、Ask Not、Our Man in Tehran、SALT（从弃牌堆拿牌）、Star Wars（从弃牌堆打事件）。实现时要注意两点：
  - 正在打出的牌和已提交的头条牌**不在手牌里**，这些事件选不到它们（DeepStruggle §7、§10）。
  - 事件内部抽牌把牌堆抽空时，要**当场**把弃牌堆洗成新牌堆（DeepStruggle §13）。

---

## 7. 常见规则细节、FAQ 与易错点

以下内容综合了规则书条文、DeepStruggle 引擎依据 GMT FAQ、struggler 裁定表和 Playdek 日志做的规则审计（`engine/AGENTS.md` §6、§12–15），以及社区常见问题。"[待核]" 表示需要再对照官方 FAQ 确认。

1. **Red Scare/Purge**（中立 4）：打出者的**对手**本回合所有牌 Ops -1，最低 1。作为头条打出时覆盖整个回合。
   - 对 China Card 和事件授予的 Ops 同样生效。
   - 苏方打出时作用于美方，反之亦然。若一方用 Ops 打出这张中立牌，事件不发动。
   - 与 Vietnam Revolts、Brezhnev 等修正叠加，按上面的公式计算。
2. **Containment / Brezhnev Doctrine**：本方 Ops +1，单卡上限 4。China Card 用于亚洲时可达 5。
   - 4 Ops 牌加成后不变。CIA Created 在 Containment 下有 2 Ops（7.4.2 例 3）。
   - Brezhnev 生效时，1 Ops 牌加成为 2，可以满足 Bear Trap 的弃牌要求（7.4.2 例 2）。
3. **Quagmire / Bear Trap**：
   - 被困方之后的每个行动轮都必须弃掉 1 张**实际 Ops ≥2** 的牌（Ops 修正计入），然后掷 1–4 才能脱困。弃掉的牌**不发动事件**，对手事件也不发动。
   - China Card 不能用来弃。
   - 没有符合条件的牌时：先打出所有计分卡，然后跳过本回合剩余行动轮。
   - 计分卡在被困期间可以打出。DeepStruggle 的做法：手里没有可弃的牌，或者计分卡数量等于剩余行动轮数时，允许打计分卡，保证不会因此被迫持有计分卡。
   - Quagmire 打出时会取消 NORAD。
   - 事件跨回合持续，直到骰子成功才解除。
   - We Will Bury You 在美方被困的行动轮里也要结算：该轮美方没有打出 UN Intervention，苏方就 +3。
4. **Cuban Missile Crisis**（中立 3★）：
   - DEFCON 直接**设为 2**，这次设定不受 Nuclear Subs 影响。
   - 本回合内，**打出者的对手**只要发动 Coup 就输掉游戏，事件带来的免费 Coup 也算。
   - 解除方法：苏方从 Cuba 移除自己 2 点影响力，或美方从 West Germany 或 Turkey 移除自己 2 点影响力。
   - DeepStruggle 把解除实现为两个时机：自己行动轮开始时（可以拒绝），以及自己发动 Coup 前（不解除就判负）。
   - 注意：DEFCON 2 时欧洲、亚洲、中东本来就禁止 Coup。
5. **NORAD**（美 3★，可选卡）：
   - 每个行动轮结束时，若 Canada 被美方控制，**且本行动轮内 DEFCON 降到了 2**（是“移动到”2；CMC 或 How I Learned 在 DEFCON 已经是 2 时把它“设为 2”不算），美方在 1 个已有美方影响力的国家加 1 点。
   - Quagmire 取消 NORAD。
6. **Nuclear Subs**：美方本回合用 Ops 在 BG 发动 Coup 不降 DEFCON。只对 Ops Coup 有效，事件本身改变的 DEFCON（CMC 等）照常。
7. **Vietnam Revolts**：在越南加 2 点苏方影响力；本回合苏方 Ops 全部用于 SEA 时 +1，与 China Card 叠加。Olympic 抵制后获得的 4 Ops 全部用于 SEA 时同样 +1（DeepStruggle 审计结论）。
8. **UN Intervention**：
   - 必须和一张**对手事件牌**一起打出。对手事件被取消，打出者使用那张牌的 Ops。
   - 手里没有对手事件牌时不能当作事件打出。不能在头条打出。
   - 可以抵消 We Will Bury You 的 3 VP。打出后会触发 U-2 Incident 的额外 1 VP，经 Grain Sales 打出也算。
   - 被取消的对手事件不算发动，所以带 ★ 的不移出 [待核：Playdek 的实现]。
9. **Missile Envy**：
   - 拿这张牌换对手手里 Ops 最高的一张（并列时对手选）。换到的牌若是己方或中立事件，立即发动；若是对手事件，只用 Ops。
   - 对手在下一个行动轮**必须**把 Missile Envy 当作 Ops 打出。被 Bear Trap 困住时可以用它来弃牌。
10. **Grain Sales to Soviets**：美方随机抽苏方 1 张手牌，要么打出（是苏方事件就照常触发），要么还回去并用 Grain Sales 的 2 Ops 行动。偷来的牌不享受 Brezhnev 加成。
11. **Five Year Plan / Terrorism / Aldrich Ames**：都是随机或指定弃牌，被弃的牌事件不发动。Five Year Plan 抽中美方事件时由美方执行该事件。Terrorism 在 Iranian Hostage Crisis 之后对美方改为弃 2 张。
12. **Defectors**（#103）：美方可以把它作为头条，取消苏方的头条事件，计分卡也能取消。苏方在行动轮打出这张牌时（不管用作 Ops 还是事件）美方 +1 VP。经 Five Year Plan、Grain Sales、Star Wars 等途径进入头条时，同样可以取消苏方的第二张头条（DeepStruggle §14）。
13. **Shuttle Diplomacy / Formosan Resolution**：只影响记分，不影响 Summit 的“支配 / 控制区域数”判定（FAQ #73，DeepStruggle 审计）。
14. **Olympic Games**：对手选择参加时，双方掷骰，主办方 +2，平局重掷，胜者 +2 VP。对手选择抵制时 DEFCON -1，主办方获得 4 Ops 的行动。DEFCON 为 2 时抵制会降到 1，此时行动方（主办方）输，这是规则书举的例子。
15. **How I Learned to Stop Worrying**：可以把 DEFCON 设为 1–5 中任意值，设为 1 则打出者自己输。MilOps 直接 +5。
16. **Wargames**：DEFCON 必须是 2。给对手 6 VP 后立即结束，**不做终局记分**。Late War 剧本中美方不能用它获胜。
17. **Star Wars / SALT**：Star Wars 要求美方在太空竞赛中领先，从弃牌堆选 1 张非计分牌**立即作为事件打出**；SALT 让打出者从弃牌堆拿 1 张非计分牌**加入手牌**。
18. **The Reformer / Glasnost**：Reformer 之后苏方永久不能在欧洲 Coup，Realignment 不受此限制。Glasnost 只有在 Reformer 已打出后才额外给 4 Ops 的放影响力或 Realignment。
19. **Chernobyl**：美方指定一个区域，本回合苏方**不能用 Ops** 在那里放影响力。事件放置的影响力不受限制。
20. **Che**（#107）：在中美、南美或非洲的**非 BG** 国用本卡 Ops 发动 Coup。若第一次移除了美方影响力，可以对另一国再 Coup 一次。按 Playdek 的行为，**计入 MilOps** 并吃 Ops 修正。
21. **Junta / Tear Down this Wall / Ortega**：
    - 免费 Coup 或 Realignment **不计 MilOps**，可以无视 DEFCON 的地区限制，打 BG 照样降 DEFCON。
    - Junta、TDTW 给的 Ops 限定在对应区域内使用。
    - 通过 UN Intervention 借用这两张牌的 Ops 时，是普通 Ops，可以用到任何地方（DeepStruggle 的 `free_action` 注释）。
22. **Brush War**：目标是稳定度 ≤2 的任意国家，NATO 保护的美控欧洲国除外。掷骰 ≥3 成功，+1 VP，MilOps +3。防守方的超级大国格也算一个相邻敌控国（例：苏方打 Mexico 时，美国格算 -1）。
23. **Our Man in Tehran**：美方至少控制 1 个中东国家时，翻看牌堆顶 5 张，可以弃掉其中任意张（需向对手展示），剩下的放回牌堆并重洗。
24. **Ask Not**：美方先宣布弃几张（可以包括计分卡），再抽同样数量的牌。
25. **Kitchen Debates**：比较双方控制的 BG 总数，美方更多时 +2 VP。
26. **Latin American Debt Crisis / Blockade**：要求美方弃一张 ≥3 Ops 的牌，Red Scare 等修正计入。美方不弃时，LADC 让苏方把南美 2 国中的苏方影响力各翻倍；Blockade 则移除西德全部美方影响力。
27. **影响力放置快照**：新放的影响力本轮不能作为延伸跳板，这是数字版实现最常见的 bug 之一。
28. **发牌顺序**：从苏方开始交替发。第 3 回合发牌时牌堆一定会抽空，发牌方式会影响双方拿到哪些牌（DeepStruggle §14）。

更多裁定可以参考 BGG 的 Twilight Struggle 规则论坛和 GMT 的 Deluxe FAQ（BGG Files 区），以及 DeepStruggle 引用的 [mihaild/struggler](https://github.com/mihaild/struggler) “rulings table”。

---

## 8. 现有开源实现评估

| 项目 | 语言 / 形态 | 完成度 | 许可证 | 可参考程度 |
|---|---|---|---|---|
| [mihaild/DeepStruggle](https://github.com/mihaild/DeepStruggle)（及 fork [JamesYouL2](https://github.com/JamesYouL2/DeepStruggle)、artbristol、LingAochuan） | C++20 引擎 + Python + **Vite/TS SVG 网页 UI** + RL | 很高。110 张卡全部实现，用 274 局人类对局（ts-replayer）回放验证，做过 FAQ 审计，有大量回归测试。另有 zh-CN 本地化 | **MIT** | ★★★★★ 规则细节的最佳参考。`engine/AGENTS.md` 记录了几十条裁定和边界情况；`web/ui` 可以作为网页 UI 范本；`rules/*.json` 可直接用作数据 |
| [tomjefferys/twilight-struggle-rs](https://github.com/tomjefferys/twilight-struggle-rs) | Rust 终端版 | 很高。规则完整，含 AI。**数据是干净的 JSON**（map、cards、start、layout、多份测试状态） | **MIT** | ★★★★★ 数据源首选，`data/*.json` 可直接用 |
| [SaitoTech/saito `node/mods/twilight`](https://github.com/SaitoTech/saito/tree/master/node/mods/twilight)（旧仓 trevelyan/ts-blockchain；saito-lite-rust） | JavaScript，浏览器内可玩（saito.io/twilight） | 高，线上可玩，有棋盘坐标 | 代码 MIT（限于 Saito 引擎之上使用）；**GMT 素材单独授权**：非商业、开源引擎、每局至少一人购买过实体游戏 | ★★★★ JS 网页实现的直接参考，尤其是 UI 交互和地图坐标。素材不能直接商用 |
| [emptywalnut/struggle-full](https://github.com/emptywalnut/struggle-full) | 把 Saito 包成无头 RL 环境 | 中 | 见仓库，含 Saito 素材许可 | ★★ |
| [herbix/TwilightStruggle](https://github.com/herbix/TwilightStruggle)（西语 fork Lendherm/TwilightStruggle-ES） | Scala 客户端 + 服务端 | 中高（作者是中国开发者，旧项目） | **GPLv3**（有传染性，只看思路，不要复制代码） | ★★★ |
| [glowsplint/twilight-struggle-py](https://github.com/glowsplint/twilight-struggle-py) / mihaild/struggler | Python 命令行 | 中 | 未见 LICENSE（不能默认可复用） | ★★ struggler 的裁定表有价值 |
| [vrazix/twilight-struggle](https://github.com/vrazix/twilight-struggle) | Python | 低 | 未见 LICENSE | ★ |
| [mindreader/twilight-struggle-server](https://github.com/mindreader/twilight-struggle-server) | Haskell | 未完成，作者称“因法律原因不会完成” | — | ★ |
| VASSAL 模块 | 无规则引擎的电子棋盘 | — | GMT 授权的模块，素材受版权约束 | 可参考棋盘坐标，不能用于规则实现 |
| Playdek 官方数字版（Steam、移动端） | 商业版 | 官方 | 商业 | 交互设计的标杆，也是规则裁定的事实标准 |

**没有找到 boardgame.io 实现。** 本次搜索里也没有找到独立的纯 TS 规则引擎。DeepStruggle 的 UI 是 TS，但引擎是 C++（网页上通过 WASM/ONNX 运行），Saito 是 JS 但依附于 Saito 引擎。

### 8.1 网页版建议架构（据以上资料归纳）
1. **数据层**：直接导入 tomjefferys 的 `standard_map.json`、`cards.json`、`standard_start.json`（MIT，注明出处），中文 i18n 用 DeepStruggle 的 zh-CN `game.json` 和 `effects.json`（MIT）。#27 补上 ongoing 标记。
2. **规则引擎**：纯函数 `(state, action) -> state`，配合确定性随机数（种子 + 计数器），方便回放和联机校验。用决策栈处理事件嵌套，例如 Grain Sales 拿到的牌又触发事件、Star Wars 打出 SALT 等；DeepStruggle 限制嵌套深度 ≤3。
3. **状态字段**：
   - 影响力 `inf[84][2]`、DEFCON、VP、turn、AR、MilOps×2、Space×2、本回合太空尝试次数×2。
   - China Card 的持有者和是否正面。
   - 牌区：deck、discard、removed、hands、headline 槽。
   - 持续 / 回合 / 下一轮三类效果 flag，以及每个行动轮开始时的影响力快照（用于邻接校验）。
4. **合法动作生成**：
   - Ops 预算按目标区域动态计算（China、Vietnam 的加成）。
   - 检查 DEFCON 地区限制和 NATO、US/Japan、Reformer 等保护。
   - 处理 CMC、Bear Trap/Quagmire 的强制分支和 8 轮特权。
5. **测试**：可以把 DeepStruggle `engine/tests/*` 里的用例翻译成 TS 测试，覆盖卡牌交互和边界情况。

---

## 9. 参考来源
- GMT 20th Anniversary HOF Edition 规则书（官方 PDF）：https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/Twilight+Struggle+20th+Anniversary+HOF+Edition/Twilight+Struggle+20th+Ann_Rule+Book_WEB.pdf
- GMT Deluxe（2nd Ed.）living rules：https://www.gmtgames.com/living_rules/TS_Rules_Deluxe.pdf
- 2005 初版规则（镜像）：https://cdn.1j1ju.com/medias/96/ab/a4-twilight-struggle-rulebook.pdf
- BGG 文件区：https://boardgamegeek.com/files/thing/12333/page/1?languageid=2184
- Twilight Strategy 卡表：https://twilightstrategy.com/card-list/ ；新手页：https://twilightstrategy.com/new-to-twilight-struggle/
- 卡牌可达国家速查：https://spotlight.histmyst.org/chart/ts.html
- Wikipedia：https://en.wikipedia.org/wiki/Twilight_Struggle
- Steam 社区关于 +2 让分标准的讨论：https://steamcommunity.com/app/406290/discussions/0/4939856028569579130/
- 中文资料：知乎《宿命之晨昏对峙——如何玩好冷战热斗》https://zhuanlan.zhihu.com/p/150730857 ；桌游圈卡牌历史 https://www.zhuoyou.com/Web/detail?news_id=617 、https://www.zhuoyou.com/Web/detail?news_id=639 ；豆瓣 https://www.douban.com/review/12739975/
- 开源实现：见 §8 表中各链接。

---

## 附录：完整原始数据

### 附表 A：完整国家表（84 国）

来源：[tomjefferys/twilight-struggle-rs `data/standard_map.json`](https://github.com/tomjefferys/twilight-struggle-rs/blob/main/data/standard_map.json)（MIT），已与 [mihaild/DeepStruggle `engine/src/map_data.cpp`](https://github.com/mihaild/DeepStruggle)（MIT）逐国比对：稳定度、战场国、邻接、超级大国邻接 **84/84 完全一致**（仅名称写法 "Dominican Rep" 差异）。中文名取自 DeepStruggle `web/ui/src/i18n/locales/zh-CN/game.json`。

列说明：BG=战场国(Battleground)；子区域 W=西欧，E=东欧，W+E=奥地利/芬兰同属两者，SEA=东南亚；超级大国邻接列出 USA/USSR；初始影响力为固定开局（美/苏），不含自由放置的 7（美，西欧）/6（苏，东欧）点。

| # | 英文名 | 中文名 | 区域 | 子区域 | 稳定度 | BG | 邻接国家 | 超级大国邻接 | 初始影响 美/苏 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Canada | 加拿大 | 欧洲 | W | 4 |  | UK | USA | 2/0 |
| 2 | UK | 英国 | 欧洲 | W | 5 |  | Canada, Norway, Benelux, France |  | 5/0 |
| 3 | Norway | 挪威 | 欧洲 | W | 4 |  | UK, Sweden |  |  |
| 4 | Sweden | 瑞典 | 欧洲 | W | 4 |  | Norway, Denmark, Finland |  |  |
| 5 | Finland | 芬兰 | 欧洲 | W+E | 4 |  | Sweden | USSR | 0/1 |
| 6 | Denmark | 丹麦 | 欧洲 | W | 3 |  | Sweden, West Germany |  |  |
| 7 | Benelux | 比荷卢联盟 | 欧洲 | W | 3 |  | UK, West Germany |  |  |
| 8 | France | 法国 | 欧洲 | W | 3 | **BG** | UK, West Germany, Spain/Portugal, Italy, Algeria |  |  |
| 9 | West Germany | 西德 | 欧洲 | W | 4 | **BG** | Denmark, Benelux, France, East Germany, Austria |  |  |
| 10 | East Germany | 东德 | 欧洲 | E | 3 | **BG** | West Germany, Poland, Czechoslovakia, Austria |  | 0/3 |
| 11 | Poland | 波兰 | 欧洲 | E | 3 | **BG** | East Germany, Czechoslovakia | USSR |  |
| 12 | Czechoslovakia | 捷克斯洛伐克 | 欧洲 | E | 3 |  | East Germany, Poland, Hungary |  |  |
| 13 | Austria | 奥地利 | 欧洲 | W+E | 4 |  | West Germany, East Germany, Hungary, Italy |  |  |
| 14 | Hungary | 匈牙利 | 欧洲 | E | 3 |  | Czechoslovakia, Austria, Yugoslavia, Romania |  |  |
| 15 | Romania | 罗马尼亚 | 欧洲 | E | 3 |  | Hungary, Yugoslavia, Turkey | USSR |  |
| 16 | Yugoslavia | 南斯拉夫 | 欧洲 | E | 3 |  | Hungary, Italy, Romania, Greece |  |  |
| 17 | Bulgaria | 保加利亚 | 欧洲 | E | 3 |  | Greece, Turkey |  |  |
| 18 | Greece | 希腊 | 欧洲 | W | 2 |  | Yugoslavia, Bulgaria, Italy, Turkey |  |  |
| 19 | Turkey | 土耳其 | 欧洲 | W | 2 |  | Bulgaria, Romania, Greece, Syria |  |  |
| 20 | Italy | 意大利 | 欧洲 | W | 2 | **BG** | France, Austria, Yugoslavia, Greece, Spain/Portugal |  |  |
| 21 | Spain/Portugal | 西班牙/葡萄牙 | 欧洲 | W | 2 |  | France, Italy, Morocco |  |  |
| 22 | Egypt | 埃及 | 中东 |  | 2 | **BG** | Libya, Sudan, Israel |  |  |
| 23 | Israel | 以色列 | 中东 |  | 4 | **BG** | Egypt, Jordan, Lebanon, Syria |  | 1/0 |
| 24 | Lebanon | 黎巴嫩 | 中东 |  | 1 |  | Israel, Syria, Jordan |  |  |
| 25 | Jordan | 约旦 | 中东 |  | 2 |  | Israel, Iraq, Saudi Arabia, Lebanon |  |  |
| 26 | Syria | 叙利亚 | 中东 |  | 2 |  | Turkey, Lebanon, Israel |  | 0/1 |
| 27 | Iraq | 伊拉克 | 中东 |  | 3 | **BG** | Jordan, Saudi Arabia, Iran, Gulf States |  | 0/1 |
| 28 | Iran | 伊朗 | 中东 |  | 2 | **BG** | Iraq, Afghanistan, Pakistan |  | 1/0 |
| 29 | Saudi Arabia | 沙特阿拉伯 | 中东 |  | 3 | **BG** | Jordan, Iraq, Gulf States |  |  |
| 30 | Gulf States | 海湾国家 | 中东 |  | 3 |  | Iraq, Saudi Arabia |  |  |
| 31 | Libya | 利比亚 | 中东 |  | 2 | **BG** | Tunisia, Egypt |  |  |
| 32 | Morocco | 摩洛哥 | 非洲 |  | 3 |  | Spain/Portugal, Algeria, West African States |  |  |
| 33 | Algeria | 阿尔及利亚 | 非洲 |  | 2 | **BG** | France, Morocco, Tunisia, Saharan States |  |  |
| 34 | Tunisia | 突尼斯 | 非洲 |  | 2 |  | Algeria, Libya |  |  |
| 35 | West African States | 西非国家 | 非洲 |  | 2 |  | Morocco, Ivory Coast |  |  |
| 36 | Ivory Coast | 科特迪瓦 | 非洲 |  | 2 |  | West African States, Nigeria |  |  |
| 37 | Saharan States | 撒哈拉诸国 | 非洲 |  | 1 |  | Algeria, Nigeria |  |  |
| 38 | Nigeria | 尼日利亚 | 非洲 |  | 1 | **BG** | Ivory Coast, Saharan States, Cameroon |  |  |
| 39 | Cameroon | 喀麦隆 | 非洲 |  | 1 |  | Nigeria, Zaire |  |  |
| 40 | Zaire | 扎伊尔 | 非洲 |  | 1 | **BG** | Cameroon, Angola, Zimbabwe |  |  |
| 41 | Angola | 安哥拉 | 非洲 |  | 1 | **BG** | Zaire, Botswana, South Africa |  |  |
| 42 | Botswana | 博茨瓦纳 | 非洲 |  | 2 |  | Angola, South Africa, Zimbabwe |  |  |
| 43 | Zimbabwe | 津巴布韦 | 非洲 |  | 1 |  | Zaire, Botswana, SE African States |  |  |
| 44 | South Africa | 南非 | 非洲 |  | 3 | **BG** | Angola, Botswana |  | 1/0 |
| 45 | SE African States | 东南非洲诸国 | 非洲 |  | 1 |  | Zimbabwe, Kenya |  |  |
| 46 | Kenya | 肯尼亚 | 非洲 |  | 2 |  | SE African States, Somalia |  |  |
| 47 | Somalia | 索马里 | 非洲 |  | 2 |  | Ethiopia, Kenya |  |  |
| 48 | Ethiopia | 埃塞俄比亚 | 非洲 |  | 1 |  | Sudan, Somalia |  |  |
| 49 | Sudan | 苏丹 | 非洲 |  | 1 |  | Egypt, Ethiopia |  |  |
| 50 | Mexico | 墨西哥 | 中美洲 |  | 2 | **BG** | Guatemala | USA |  |
| 51 | Guatemala | 危地马拉 | 中美洲 |  | 1 |  | Mexico, El Salvador, Honduras |  |  |
| 52 | El Salvador | 萨尔瓦多 | 中美洲 |  | 1 |  | Guatemala, Honduras |  |  |
| 53 | Honduras | 洪都拉斯 | 中美洲 |  | 2 |  | Guatemala, El Salvador, Nicaragua, Costa Rica |  |  |
| 54 | Costa Rica | 哥斯达黎加 | 中美洲 |  | 3 |  | Honduras, Nicaragua, Panama |  |  |
| 55 | Nicaragua | 尼加拉瓜 | 中美洲 |  | 1 |  | Honduras, Costa Rica, Cuba |  |  |
| 56 | Panama | 巴拿马 | 中美洲 |  | 2 | **BG** | Costa Rica, Colombia |  | 1/0 |
| 57 | Cuba | 古巴 | 中美洲 |  | 3 | **BG** | Haiti, Nicaragua | USA |  |
| 58 | Haiti | 海地 | 中美洲 |  | 1 |  | Cuba, Dominican Republic |  |  |
| 59 | Dominican Republic | 多米尼加共和国 | 中美洲 |  | 1 |  | Haiti |  |  |
| 60 | Colombia | 哥伦比亚 | 南美洲 |  | 1 |  | Panama, Venezuela, Ecuador |  |  |
| 61 | Ecuador | 厄瓜多尔 | 南美洲 |  | 2 |  | Colombia, Peru |  |  |
| 62 | Venezuela | 委内瑞拉 | 南美洲 |  | 2 | **BG** | Colombia, Brazil |  |  |
| 63 | Peru | 秘鲁 | 南美洲 |  | 2 |  | Ecuador, Bolivia, Chile |  |  |
| 64 | Bolivia | 玻利维亚 | 南美洲 |  | 2 |  | Peru, Paraguay |  |  |
| 65 | Paraguay | 巴拉圭 | 南美洲 |  | 2 |  | Bolivia, Argentina, Uruguay |  |  |
| 66 | Chile | 智利 | 南美洲 |  | 3 | **BG** | Peru, Argentina |  |  |
| 67 | Argentina | 阿根廷 | 南美洲 |  | 2 | **BG** | Chile, Paraguay, Uruguay |  |  |
| 68 | Uruguay | 乌拉圭 | 南美洲 |  | 2 |  | Argentina, Brazil, Paraguay |  |  |
| 69 | Brazil | 巴西 | 南美洲 |  | 2 | **BG** | Venezuela, Uruguay |  |  |
| 70 | Afghanistan | 阿富汗 | 亚洲 |  | 2 |  | Iran, Pakistan | USSR |  |
| 71 | Pakistan | 巴基斯坦 | 亚洲 |  | 2 | **BG** | Afghanistan, India, Iran |  |  |
| 72 | India | 印度 | 亚洲 |  | 3 | **BG** | Pakistan, Burma |  |  |
| 73 | Burma | 缅甸 | 亚洲 | SEA | 2 |  | India, Laos/Cambodia |  |  |
| 74 | Laos/Cambodia | 老挝/柬埔寨 | 亚洲 | SEA | 1 |  | Burma, Thailand, Vietnam |  |  |
| 75 | Thailand | 泰国 | 亚洲 | SEA | 2 | **BG** | Laos/Cambodia, Vietnam, Malaysia |  |  |
| 76 | Vietnam | 越南 | 亚洲 | SEA | 1 |  | Laos/Cambodia, Thailand |  |  |
| 77 | Malaysia | 马来西亚 | 亚洲 | SEA | 2 |  | Thailand, Indonesia, Australia |  |  |
| 78 | Indonesia | 印度尼西亚 | 亚洲 | SEA | 1 |  | Malaysia, Philippines |  |  |
| 79 | Philippines | 菲律宾 | 亚洲 | SEA | 2 |  | Indonesia, Japan |  | 1/0 |
| 80 | Australia | 澳大利亚 | 亚洲 |  | 4 |  | Malaysia |  | 4/0 |
| 81 | North Korea | 朝鲜 | 亚洲 |  | 3 | **BG** | South Korea | USSR | 0/3 |
| 82 | South Korea | 韩国 | 亚洲 |  | 3 | **BG** | North Korea, Japan, Taiwan |  | 1/0 |
| 83 | Japan | 日本 | 亚洲 |  | 4 | **BG** | South Korea, Taiwan, Philippines | USA | 1/0 |
| 84 | Taiwan | 台湾 | 亚洲 |  | 3 |  | Japan, South Korea |  |  |

各区域国家数/战场国数：欧洲 21 国 / 5 BG；中东 10 国 / 6 BG；非洲 18 国 / 5 BG；中美洲 10 国 / 3 BG；南美洲 10 国 / 4 BG；亚洲 15 国 / 6 BG；合计 84 国 / 29 BG。

- 与美国本土相邻：Canada, Mexico, Cuba, Japan
- 与苏联本土相邻：Finland, Poland, Romania, Afghanistan, North Korea

- 东南亚子区域（7 国）：Burma, Laos/Cambodia, Thailand, Vietnam, Malaysia, Indonesia, Philippines


### 附表 B：完整卡牌表（110 张）

来源：英文数据 [tomjefferys/twilight-struggle-rs `data/cards.json`](https://github.com/tomjefferys/twilight-struggle-rs/blob/main/data/cards.json)（MIT，含 Deluxe/Playdek 风格英文全文），已与 DeepStruggle `engine/src/card_data.cpp` 逐张比对 OPS/阵营/星标/时期 **110/110 一致**。中文事件说明取自 DeepStruggle zh-CN 本地化（`game.json`），中文名在其基础上按中文社区常用译名做了少量替换（括号内为另一译名）。

列说明：★=打出事件后移出游戏（星标/asterisk）；持续=标题带下划线的持久事件（放在桌边直到被取消）；战争=War 事件（计入军事行动）；计分=计分卡；可选=104–110（Deluxe 中为“可选卡”，20 周年版默认加入）。#103 Defectors 在 Deluxe 已是基础牌。

| # | 英文名 | 中文名 | 阵营 | OPS | 时期 | ★ | 标记 | 事件效果（中文） |
|---|---|---|---|---|---|---|---|---|
| 1 | Asia Scoring | 亚洲计分 | 中立 | — | 早期 |  | 计分 | 存在：3；支配：7；控制：9。区域内每控制一个战场国，额外获得 1 点胜利点数；每控制一个与敌方超级大国相邻的国家，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 2 | Europe Scoring | 欧洲计分 | 中立 | — | 早期 |  | 计分 | 存在：3；支配：7；控制：自动获胜。区域内每控制一个战场国，额外获得 1 点胜利点数；每控制一个与敌方超级大国相邻的国家，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 3 | Middle East Scoring | 中东计分 | 中立 | — | 早期 |  | 计分 | 存在：3；支配：5；控制：7。区域内每控制一个战场国，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 4 | Duck and Cover | 卧倒掩护 | 美 | 3 | 早期 |  |  | 核危机等级恶化 1 级。美国获得等于 5 减去当前核危机等级的胜利点数。 |
| 5 | Five Year Plan | 五年计划 | 美 | 3 | 早期 |  |  | 苏联必须随机弃掉一张手牌。若弃掉的是美国事件牌，立即触发该事件；若是苏联事件牌或双方均可触发的事件牌，则直接弃掉，不触发事件。 |
| 6 | The China Card | 中国牌 | 中立 | 4 | 早期 |  |  | 游戏开始时由苏联持有。打出此牌时，若所有行动点数均用于亚洲，则此牌的行动点数增加 1 点。使用后将此牌交给对手。第 10 回合结束时持有此牌的玩家获得 1 点胜利点数。 |
| 7 | Socialist Governments | 社会主义政府 | 苏 | 3 | 早期 |  |  | 从西欧国家中移除合计 3 点美国影响力，每个国家最多移除 2 点。《铁娘子》（#83）事件发生后，不能再使用此事件。 |
| 8 | Fidel | 卡斯特罗（菲德尔） | 苏 | 2 | 早期 | ★ |  | 移除古巴的全部美国影响力。苏联在古巴增加足以控制该国的影响力。 |
| 9 | Vietnam Revolts | 越南起义 | 苏 | 2 | 早期 | ★ |  | 在越南增加 2 点苏联影响力。本回合余下时间，若苏联将一张牌的所有行动点数均用于东南亚，则该牌的行动点数增加 1 点。 |
| 10 | Blockade | 封锁 | 苏 | 1 | 早期 | ★ |  | 美国必须立即弃掉一张行动点数不少于 3 的牌，否则移除西德的全部美国影响力。 |
| 11 | Korean War | 朝鲜战争 | 苏 | 2 | 早期 | ★ | 战争 | 朝鲜入侵韩国。掷一枚骰子；每有一个与韩国相邻、由美国控制的国家，骰子结果减 1。修正后的结果为 4～6 时，苏联获得 2 点胜利点数，并将韩国的全部美国影响力替换为等量苏联影响力。苏联的军事行动值增加 2。 |
| 12 | Romanian Abdication | 罗马尼亚国王退位 | 苏 | 1 | 早期 | ★ |  | 移除罗马尼亚的全部美国影响力。苏联在罗马尼亚增加足以控制该国的影响力。 |
| 13 | Arab-Israeli War | 阿拉伯—以色列战争 | 苏 | 2 | 早期 |  | 战争 | 泛阿拉伯联盟入侵以色列。掷一枚骰子；若以色列由美国控制，骰子结果减 1；以色列每有一个由美国控制的邻国，结果再减 1。修正后的结果为 4～6 时，苏联获得 2 点胜利点数，并将以色列的全部美国影响力替换为等量苏联影响力。苏联的军事行动值增加 2。《戴维营协议》（#65）事件发生后，不能再使用此事件。 |
| 14 | Comecon | 经济互助委员会 | 苏 | 3 | 早期 | ★ |  | 在东欧选择 4 个未被美国控制的国家，各增加 1 点苏联影响力。 |
| 15 | Nasser | 纳赛尔 | 苏 | 1 | 早期 | ★ |  | 在埃及增加 2 点苏联影响力。移除埃及一半的美国影响力，移除数量向上取整。 |
| 16 | Warsaw Pact Formed | 华沙条约组织成立 | 苏 | 3 | 早期 | ★ | 持续 | 移除东欧 4 个国家的全部美国影响力，或在东欧国家中增加合计 5 点苏联影响力，每个国家最多增加 2 点。此事件使《北大西洋公约组织》（#21）可以作为事件打出。 |
| 17 | De Gaulle Leads France | 戴高乐领导法国 | 苏 | 3 | 早期 | ★ | 持续 | 从法国移除 2 点美国影响力，并增加 1 点苏联影响力。此事件取消《北大西洋公约组织》（#21）事件对法国的保护。 |
| 18 | Captured Nazi Scientist | 逮捕纳粹科学家 | 中立 | 1 | 早期 | ★ |  | 将太空竞赛标记向前移动 1 格。 |
| 19 | Truman Doctrine | 杜鲁门主义 | 美 | 1 | 早期 | ★ |  | 选择一个双方均未控制的欧洲国家，移除其中的全部苏联影响力。 |
| 20 | Olympic Games | 奥运会 | 中立 | 2 | 早期 |  |  | 打出此事件的玩家主办奥运会。对手必须选择参加或抵制。若参加，双方各掷一枚骰子，主办方的结果加 2；修正后结果较高的一方获得 2 点胜利点数，平局则重掷。若抵制，核危机等级恶化 1 级，主办方可以如同打出一张行动点数为 4 的卡牌一样执行行动。 |
| 21 | NATO | 北大西洋公约组织 | 美 | 4 | 早期 | ★ | 持续 | 苏联不能对美国控制的欧洲国家发动政变或调整阵营，也不能通过《局部战争》（#36）事件攻击这些国家。必须先发生《华沙条约组织成立》（#16）或《马歇尔计划》（#23）事件，才能将此牌作为事件打出。 |
| 22 | Independent Reds | 独立的红色 | 美 | 2 | 早期 | ★ |  | 从南斯拉夫、罗马尼亚、保加利亚、匈牙利和捷克斯洛伐克中选择一个国家，增加其中的美国影响力，直至与该国的苏联影响力相等。 |
| 23 | Marshall Plan | 马歇尔计划 | 美 | 4 | 早期 | ★ | 持续 | 在西欧选择 7 个未被苏联控制的国家，各增加 1 点美国影响力。此事件使《北大西洋公约组织》（#21）可以作为事件打出。 |
| 24 | Indo-Pakistani War | 印度—巴基斯坦战争 | 中立 | 2 | 早期 |  | 战争 | 印度入侵巴基斯坦，或巴基斯坦入侵印度，由玩家选择。掷一枚骰子；被入侵国每有一个由敌方控制的邻国，骰子结果减 1。修正后的结果为 4～6 时，玩家获得 2 点胜利点数，并将目标国的全部敌方影响力替换为等量己方影响力。玩家的军事行动值增加 2。 |
| 25 | Containment | 遏制政策 | 美 | 3 | 早期 | ★ |  | 本回合余下时间，美国打出的所有行动牌，其行动点数增加 1 点，每张牌最多为 4 点。 |
| 26 | CIA Created | 中情局成立 | 美 | 1 | 早期 | ★ |  | 苏联公开本回合的手牌。美国可以使用此牌的行动点数执行行动。 |
| 27 | US/Japan Mutual Defense Pact | 美日共同防卫协定 | 美 | 4 | 早期 | ★ | 持续 | 美国在日本增加足以控制该国的影响力。苏联不能对日本发动政变或调整阵营。 |
| 28 | Suez Crisis | 苏伊士运河危机 | 苏 | 3 | 早期 | ★ |  | 从法国、英国和以色列移除合计 4 点美国影响力，每个国家最多移除 2 点。 |
| 29 | East European Unrest | 东欧动乱 | 美 | 3 | 早期 |  |  | 冷战早期或中期：从东欧 3 个国家各移除 1 点苏联影响力。冷战晚期：从东欧 3 个国家各移除 2 点苏联影响力。 |
| 30 | Decolonization | 去殖民地化 | 苏 | 2 | 早期 |  |  | 在非洲和／或东南亚选择 4 个国家，各增加 1 点苏联影响力。 |
| 31 | Red Scare/Purge | 红色恐怖/大清洗 | 中立 | 4 | 早期 |  |  | 本回合余下时间，对手打出的所有行动牌，其行动点数减少 1 点，每张牌最低为 1 点。 |
| 32 | UN Intervention | 联合国干预 | 中立 | 1 | 早期 |  |  | 将此牌与一张对手事件牌同时打出。取消该对手事件，但你可以使用那张牌的行动点数执行行动。不能在头条阶段打出此事件。 |
| 33 | De-Stalinization | 去斯大林化 | 苏 | 3 | 早期 | ★ |  | 苏联可以从一个或多个国家移走合计最多 4 点影响力，并将其重新分配到未被美国控制的国家，每个国家最多增加 2 点。 |
| 34 | Nuclear Test Ban | 禁止核试验 | 中立 | 4 | 早期 |  |  | 玩家获得等于当前核危机等级减 2 的胜利点数，然后核危机等级改善 2 级。 |
| 35 | Formosan Resolution | 台湾决议 | 美 | 2 | 早期 | ★ | 持续 | 此事件生效期间，打出亚洲计分牌时，若台湾由美国控制，则仅在计分时将台湾视为战场国。美国打出《中国牌》（#6）后，此事件取消。 |
| 36 | Brush War | 丛林战争（局部战争） | 中立 | 3 | 中期 |  | 战争 | 选择一个稳定度为 1 或 2 的国家发动战争。掷一枚骰子；该国每有一个由敌方控制的邻国，骰子结果减 1。修正后的结果为 3～6 时，玩家获得 1 点胜利点数，并将目标国的全部敌方影响力替换为等量己方影响力。玩家的军事行动值增加 3。 |
| 37 | Central America Scoring | 中美洲计分 | 中立 | — | 中期 |  | 计分 | 存在：1；支配：3；控制：5。区域内每控制一个战场国，额外获得 1 点胜利点数；每控制一个与敌方超级大国相邻的国家，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 38 | Southeast Asia Scoring | 东南亚计分 | 中立 | — | 中期 | ★ | 计分 | 每控制缅甸、老挝／柬埔寨、越南、马来西亚、印度尼西亚和菲律宾中的一个国家，获得 1 点胜利点数；控制泰国获得 2 点胜利点数。不可保留到回合结束！ |
| 39 | Arms Race | 军备竞赛 | 中立 | 3 | 中期 |  |  | 比较双方的军事行动值。若当前行动方的军事行动值高于对手，获得 1 点胜利点数；若同时已达到本回合要求的军事行动值，则改为获得 3 点胜利点数。 |
| 40 | Cuban Missile Crisis | 古巴导弹危机 | 中立 | 3 | 中期 | ★ |  | 将核危机等级设为 2。本回合余下时间，对手发动任何政变都会引发全球热核战争，并导致对手输掉游戏。对手可随时取消此事件：苏联从古巴移除 2 点影响力，或美国从西德或土耳其移除 2 点影响力。 |
| 41 | Nuclear Subs | 核潜艇 | 美 | 2 | 中期 | ★ |  | 本回合余下时间，美国使用行动点数在战场国发动政变，不会使核危机等级恶化。此事件不影响其他改变核危机的事件，例如《古巴导弹危机》（#40）。 |
| 42 | Quagmire | 泥潭 | 苏 | 3 | 中期 | ★ | 持续 | 美国在下一个行动轮必须弃掉一张行动点数不少于 2 的牌，并掷出 1～4 才能取消此事件。之后每个美国行动轮重复此过程，直至成功。若美国无法弃掉符合要求的行动牌，则必须先打出所有计分牌，然后跳过本回合余下的行动轮。此事件取消《北美防空司令部》（#106）的效果。 |
| 43 | SALT Negotiations | 战略武器限制谈判 | 中立 | 3 | 中期 | ★ |  | 核危机等级改善 2 级。本回合余下时间，双方所有政变掷骰结果减 1。打出此事件的玩家可以查看弃牌堆，选择一张非计分牌，向对手展示后加入手牌。 |
| 44 | Bear Trap | 熊陷阱 | 美 | 3 | 中期 | ★ | 持续 | 苏联在下一个行动轮必须弃掉一张行动点数不少于 2 的牌，并掷出 1～4 才能取消此事件。之后每个苏联行动轮重复此过程，直至成功。若苏联无法弃掉符合要求的行动牌，则必须先打出所有计分牌，然后跳过本回合余下的行动轮。 |
| 45 | Summit | 首脑峰会 | 中立 | 1 | 中期 |  |  | 双方各掷一枚骰子。每支配或控制一个区域（欧洲、亚洲等），该玩家的骰子结果加 1。修正后结果较高的一方获得 2 点胜利点数，并可使核危机等级恶化或改善 1 级。平局不重掷。 |
| 46 | How I Learned to Stop Worrying | 我如何学会停止忧虑（奇爱博士） | 中立 | 2 | 中期 | ★ |  | 将核危机等级设为任意所需等级（1～5）。玩家的军事行动值增加 5。 |
| 47 | Junta | 军政府 | 中立 | 2 | 中期 |  |  | 在中美洲或南美洲的一个国家增加 2 点己方影响力。玩家还可以使用此牌的行动点数，在中美洲或南美洲免费发动政变或调整阵营。 |
| 48 | Kitchen Debates | 厨房辩论 | 美 | 1 | 中期 | ★ |  | 若美国控制的战场国比苏联多，美国玩家用此事件戳一戳对手的胸口，并获得 2 点胜利点数！ |
| 49 | Missile Envy | 导弹嫉妒 | 中立 | 2 | 中期 |  |  | 用此牌交换对手行动点数最高的一张手牌；若有多张并列，由对手选择。若换来的牌是己方事件或双方事件，立即触发事件；若是对手事件，则使用其行动点数，不触发事件。对手必须在其下一个行动轮将本牌作为行动牌使用。 |
| 50 | “We Will Bury You” | “我们将埋葬你们” | 苏 | 4 | 中期 | ★ |  | 核危机等级恶化 1 级。除非美国在下一个行动轮打出《联合国干预》（#32）事件，否则苏联获得 3 点胜利点数。 |
| 51 | Brezhnev Doctrine | 勃列日涅夫主义 | 苏 | 3 | 中期 | ★ |  | 本回合余下时间，苏联打出的所有行动牌，其行动点数增加 1 点，每张牌最多为 4 点。 |
| 52 | Portuguese Empire Crumbles | 葡萄牙帝国崩溃 | 苏 | 2 | 中期 | ★ |  | 在安哥拉和东南非洲诸国各增加 2 点苏联影响力。 |
| 53 | South African Unrest | 南非动荡 | 苏 | 2 | 中期 |  |  | 苏联选择：在南非增加 2 点影响力；或在南非增加 1 点影响力，并在一个与南非相邻的国家增加 2 点影响力。 |
| 54 | Allende | 阿连德 | 苏 | 1 | 中期 | ★ |  | 在智利增加 2 点苏联影响力。 |
| 55 | Willy Brandt | 维利·勃兰特 | 苏 | 2 | 中期 | ★ | 持续 | 苏联获得 1 点胜利点数，并在西德增加 1 点影响力。此事件取消《北大西洋公约组织》（#21）对西德的保护。《推倒这堵墙》（#96）事件会阻止或取消此事件。 |
| 56 | Muslim Revolution | 穆斯林革命 | 苏 | 4 | 中期 |  |  | 从苏丹、伊朗、伊拉克、埃及、利比亚、沙特阿拉伯、叙利亚和约旦中选择两个国家，移除其中的全部美国影响力。《向沙特出售预警机》（#110）事件发生后，不能再使用此事件。 |
| 57 | ABM Treaty | 反弹道导弹条约 | 中立 | 4 | 中期 |  |  | 核危机等级改善 1 级，然后使用此牌的行动点数执行行动。 |
| 58 | Cultural Revolution | 文化大革命 | 苏 | 3 | 中期 | ★ |  | 若美国持有《中国牌》（#6），必须将其正面朝上交给苏联，苏联可以立即使用。若苏联已持有《中国牌》（#6），则获得 1 点胜利点数。 |
| 59 | Flower Power | 花之力（花朵力量） | 苏 | 4 | 中期 | ★ | 持续 | 此事件打出后，美国每打出一张战争牌（《阿拉伯—以色列战争》（#13）、《朝鲜战争》（#11）、《局部战争》（#36）、《印度—巴基斯坦战争》（#24）、《伊朗—伊拉克战争》（#102）），无论用于行动还是事件，苏联均获得 2 点胜利点数。《“邪恶帝国”》（#97）事件会阻止或取消此事件。 |
| 60 | U2 Incident | U-2 事件 | 苏 | 3 | 中期 | ★ |  | 苏联获得 1 点胜利点数。本回合余下时间，若任意一方打出《联合国干预》（#32）事件，苏联再获得 1 点胜利点数。 |
| 61 | OPEC | 石油输出国组织 | 苏 | 3 | 中期 |  |  | 苏联每控制埃及、伊朗、利比亚、沙特阿拉伯、伊拉克、海湾国家和委内瑞拉中的一个国家，获得 1 点胜利点数。《北海油田》（#86）事件发生后，不能再使用此事件。 |
| 62 | “Lone Gunman” | “孤胆枪手” | 苏 | 1 | 中期 | ★ |  | 美国公开手牌。苏联可以使用此牌的行动点数执行行动。 |
| 63 | Colonial Rear Guards | 殖民地后卫 | 美 | 2 | 中期 |  |  | 在非洲和／或东南亚选择 4 个国家，各增加 1 点美国影响力。 |
| 64 | Panama Canal Returned | 归还巴拿马运河 | 美 | 1 | 中期 | ★ |  | 在巴拿马、哥斯达黎加和委内瑞拉各增加 1 点美国影响力。 |
| 65 | Camp David Accords | 戴维营协议 | 美 | 2 | 中期 | ★ | 持续 | 美国获得 1 点胜利点数，并在以色列、约旦和埃及各增加 1 点影响力。此事件阻止《阿拉伯—以色列战争》（#13）作为事件打出。 |
| 66 | Puppet Governments | 傀儡政府 | 美 | 2 | 中期 | ★ |  | 美国可以在 3 个双方均无影响力的国家各增加 1 点影响力。 |
| 67 | Grain Sales to Soviets | 向苏联出售谷物 | 美 | 2 | 中期 |  |  | 若苏联有手牌，美国从中随机抽取一张，选择打出或交还苏联。若交还该牌，或苏联没有手牌，美国可以使用本牌的行动点数执行行动。 |
| 68 | John Paul II Elected Pope | 约翰·保罗二世当选教皇 | 美 | 2 | 中期 | ★ | 持续 | 从波兰移除 2 点苏联影响力，并增加 1 点美国影响力。此事件使《团结工会》（#101）可以作为事件打出。 |
| 69 | Latin American Death Squads | 拉丁美洲敢死队 | 中立 | 2 | 中期 |  |  | 本回合余下时间，当前行动方在中美洲和南美洲的所有政变掷骰结果加 1；对手在这两个区域的所有政变掷骰结果减 1。 |
| 70 | OAS Founded | 美洲国家组织成立 | 美 | 1 | 中期 | ★ |  | 在中美洲或南美洲国家中增加合计 2 点美国影响力。 |
| 71 | Nixon Plays the China Card | 尼克松打出中国牌 | 美 | 2 | 中期 | ★ |  | 若苏联持有《中国牌》（#6），必须将其背面朝上交给美国，美国不能立即使用。若美国已持有《中国牌》（#6），则获得 2 点胜利点数。 |
| 72 | Sadat Expels Soviets | 萨达特驱逐苏联 | 美 | 1 | 中期 | ★ |  | 移除埃及的全部苏联影响力，并增加 1 点美国影响力。 |
| 73 | Shuttle Diplomacy | 穿梭外交 | 美 | 3 | 中期 |  | 持续 | 此事件生效期间，下次对中东或亚洲计分时，以先发生者为准，将苏联的战场国总数减 1，然后弃掉此牌。 |
| 74 | The Voice of America | 美国之音 | 美 | 2 | 中期 |  |  | 从欧洲以外的国家移除合计 4 点苏联影响力，每个国家最多移除 2 点。 |
| 75 | Liberation Theology | 解放神学 | 苏 | 2 | 中期 |  |  | 在中美洲国家中增加合计 3 点苏联影响力，每个国家最多增加 2 点。 |
| 76 | Ussuri River Skirmish | 乌苏里江冲突 | 美 | 3 | 中期 | ★ |  | 若苏联持有《中国牌》（#6），必须将其正面朝上交给美国，美国可以立即使用。若美国已持有《中国牌》（#6），则在亚洲国家中增加合计 4 点美国影响力，每个国家最多增加 2 点。 |
| 77 | “Ask Not What Your Country…” | “不要问你的国家能为你做什么” | 美 | 3 | 中期 | ★ |  | 美国可以弃掉任意数量的手牌，包括计分牌，最多可弃掉全部手牌，然后从抽牌堆补抽相同数量的牌。必须先决定弃牌数量，再抽取任何补充牌。 |
| 78 | Alliance for Progress | 美洲进步同盟 | 美 | 3 | 中期 | ★ |  | 美国每控制一个位于中美洲或南美洲的战场国，获得 1 点胜利点数。 |
| 79 | Africa Scoring | 非洲计分 | 中立 | — | 中期 |  | 计分 | 存在：1；支配：4；控制：6。区域内每控制一个战场国，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 80 | “One Small Step…” | “一小步…” | 中立 | 2 | 中期 |  |  | 若玩家在太空竞赛中落后，将其太空竞赛标记向前移动 2 格。只获得最终到达格子的胜利点数。 |
| 81 | South America Scoring | 南美洲计分 | 中立 | — | 中期 |  | 计分 | 存在：2；支配：5；控制：6。区域内每控制一个战场国，额外获得 1 点胜利点数。不可保留到回合结束！ |
| 82 | Iranian Hostage Crisis | 伊朗人质危机 | 苏 | 3 | 晚期 | ★ | 持续 | 移除伊朗的全部美国影响力，并增加 2 点苏联影响力。此事件生效后，若发生《恐怖主义》（#92）事件，美国必须弃掉 2 张牌，而非 1 张。 |
| 83 | The Iron Lady | 铁娘子 | 美 | 3 | 晚期 | ★ | 持续 | 在阿根廷增加 1 点苏联影响力，并移除英国的全部苏联影响力。美国获得 1 点胜利点数。此事件阻止《社会主义政府》（#7）作为事件打出。 |
| 84 | Reagan Bombs Libya | 里根轰炸利比亚 | 美 | 2 | 晚期 | ★ |  | 利比亚每有 2 点苏联影响力，美国获得 1 点胜利点数。 |
| 85 | Star Wars | 星球大战 | 美 | 2 | 晚期 | ★ |  | 若美国在太空竞赛中领先，美国玩家查看弃牌堆，选择一张非计分牌，立即作为事件打出。 |
| 86 | North Sea Oil | 北海油田 | 美 | 3 | 晚期 | ★ | 持续 | 仅在本回合，美国可以在 8 个行动轮中打出 8 张牌。此事件阻止《石油输出国组织》（#61）作为事件打出。 |
| 87 | The Reformer | 改革者 | 苏 | 3 | 晚期 | ★ | 持续 | 在欧洲国家中增加合计 4 点苏联影响力，每个国家最多增加 2 点。若苏联的胜利点数领先，则可以改为增加合计 6 点影响力。苏联此后不能再在欧洲发动政变。 |
| 88 | Marine Barracks Bombing | 海军陆战队军营爆炸 | 苏 | 2 | 晚期 | ★ |  | 移除黎巴嫩的全部美国影响力，然后再从中东国家移除合计 2 点美国影响力。 |
| 89 | Soviets Shoot Down KAL-007 | 苏联击落大韩航空007号班机 | 美 | 4 | 晚期 | ★ |  | 核危机等级恶化 1 级，美国获得 2 点胜利点数。若美国控制韩国，还可使用此牌的行动点数放置影响力或调整阵营。 |
| 90 | Glasnost | 公开性（开放政策） | 苏 | 4 | 晚期 | ★ |  | 核危机等级改善 1 级，苏联获得 2 点胜利点数。若《改革家》（#87）事件已经发生，苏联还可使用此牌的行动点数调整阵营或增加影响力。 |
| 91 | Ortega Elected in Nicaragua | 奥尔特加当选尼加拉瓜总统 | 苏 | 2 | 晚期 | ★ |  | 移除尼加拉瓜的全部美国影响力。苏联可以使用此牌的行动点数，在一个与尼加拉瓜相邻的国家免费发动一次政变。 |
| 92 | Terrorism | 恐怖主义 | 中立 | 2 | 晚期 |  |  | 对手必须随机弃掉一张手牌。若《伊朗人质危机》（#82）事件已经发生，且被弃牌的一方是美国，则美国必须随机弃掉两张手牌。 |
| 93 | Iran-Contra Scandal | 伊朗门丑闻 | 苏 | 2 | 晚期 | ★ |  | 本回合余下时间，美国所有调整阵营掷骰结果减 1。 |
| 94 | Chernobyl | 切尔诺贝利 | 美 | 3 | 晚期 | ★ |  | 美国指定一个区域（欧洲、亚洲等）。本回合余下时间，苏联不能使用行动点数在该区域增加影响力。 |
| 95 | Latin American Debt Crisis | 拉丁美洲债务危机 | 苏 | 2 | 晚期 |  |  | 美国必须立即弃掉一张行动点数不少于 3 的牌，否则苏联可以将南美洲两个国家内的苏联影响力加倍。 |
| 96 | Tear Down this Wall | 推倒这堵墙 | 美 | 3 | 晚期 | ★ | 持续 | 在东德增加 3 点美国影响力。美国可以使用此牌的行动点数，在欧洲免费发动政变或调整阵营。此事件阻止或取消《维利·勃兰特》（#55）的效果。 |
| 97 | “An Evil Empire” | “邪恶帝国” | 美 | 3 | 晚期 | ★ | 持续 | 美国获得 1 点胜利点数。此事件阻止或取消《花朵力量》（#59）的效果。 |
| 98 | Aldrich Ames Remix | 艾姆斯间谍案（Aldrich Ames Remix） | 苏 | 3 | 晚期 | ★ |  | 美国在本回合余下时间公开手牌，苏联从美国手牌中选择一张弃掉。 |
| 99 | Pershing II Deployed | 部署潘兴II型导弹 | 苏 | 3 | 晚期 | ★ |  | 苏联获得 1 点胜利点数。从西欧任意 3 个国家各移除 1 点美国影响力。 |
| 100 | Wargames | 战争游戏 | 中立 | 4 | 晚期 | ★ |  | 若核危机等级为 2，玩家可以在给予对手 6 点胜利点数后，立即结束游戏。不如来一盘国际象棋？ |
| 101 | Solidarity | 团结工会 | 美 | 2 | 晚期 | ★ |  | 在波兰增加 3 点美国影响力。必须先发生《约翰·保罗二世当选教皇》（#68）事件，才能将此牌作为事件打出。 |
| 102 | Iran-Iraq War | 伊朗—伊拉克战争 | 中立 | 2 | 晚期 | ★ | 战争 | 伊朗入侵伊拉克，或伊拉克入侵伊朗，由玩家选择。掷一枚骰子；被入侵国每有一个由敌方控制的邻国，骰子结果减 1。修正后的结果为 4～6 时，玩家获得 2 点胜利点数，并将目标国的全部敌方影响力替换为等量己方影响力。玩家的军事行动值增加 2。 |
| 103 | Defectors | 叛逃者 | 美 | 2 | 早期 |  |  | 美国可以在头条阶段打出此牌，取消苏联的头条事件，包括计分牌。被取消的牌放入弃牌堆。若苏联在自己的行动轮打出此牌，美国获得 1 点胜利点数。 |
| 104 | The Cambridge Five | 剑桥五杰 | 苏 | 2 | 早期 |  | 可选 | 美国展示手牌中的所有计分牌。苏联可以在其中一张计分牌所对应的区域增加 1 点影响力。冷战晚期不能将此牌作为事件打出。 |
| 105 | Special Relationship | 美英特殊关系 | 美 | 2 | 早期 |  | 可选 | 若英国由美国控制且北大西洋公约组织未生效，在一个与英国相邻的国家增加 1 点美国影响力。若英国由美国控制且北大西洋公约组织已生效，则在一个西欧国家增加 2 点美国影响力，美国另获得 2 点胜利点数。 |
| 106 | NORAD | 北美防空司令部 | 美 | 3 | 早期 | ★ | 持续 可选 | 每个行动轮结束时，若加拿大由美国控制，且核危机等级在该行动轮变为 2，美国在一个已有美国影响力的国家增加 1 点影响力。此事件被《泥潭》（#42）事件取消。 |
| 107 | Che | 切·格瓦拉 | 苏 | 3 | 中期 |  | 可选 | 苏联可以使用此牌的行动点数，对中美洲、南美洲或非洲的一个非战场国发动政变。若第一次政变移除了目标国的任何美国影响力，苏联可以在这三个区域的另一个非战场国再发动一次政变。 |
| 108 | Our Man in Tehran | 我们的人在德黑兰 | 美 | 2 | 中期 | ★ | 可选 | 若美国控制至少一个中东国家，美国玩家从抽牌堆顶抽取 5 张牌。美国可以弃掉其中任意数量的牌，包括全部 5 张；弃牌前须向苏联展示要弃掉的牌，但不触发事件。其余抽出的牌放回抽牌堆，然后重新洗牌。 |
| 109 | Yuri and Samantha | 尤里和萨曼莎 | 苏 | 2 | 晚期 | ★ | 可选 | 本回合余下时间，美国每发动一次政变，苏联获得 1 点胜利点数。 |
| 110 | AWACS Sale to Saudis | 向沙特出售预警机 | 美 | 3 | 晚期 | ★ | 持续 可选 | 在沙特阿拉伯增加 2 点美国影响力。此事件阻止《穆斯林革命》（#56）作为事件打出。 |

分布：早期-中立 10；早期-美 14；早期-苏 15；晚期-中立 3；晚期-美 10；晚期-苏 10；中期-中立 15；中期-美 18；中期-苏 15


### 附表 C：英文卡牌原文（便于与官方卡面核对）

| # | Name | Text |
|---|---|---|
| 1 | Asia Scoring | Presence: 3; Domination: 7; Control: 9; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD! |
| 2 | Europe Scoring | Presence: 3; Domination: 7; Control: Automatic Victory; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD! |
| 3 | Middle East Scoring | Presence: 3; Domination: 5; Control: 7; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD! |
| 4 | Duck and Cover | Degrade the DEFCON level by 1. The US receives VP equal to 5 minus the current DEFCON level. |
| 5 | Five Year Plan | The USSR must randomly discard a card. If the card has a US associated Event, the Event occurs immediately. If the card has a USSR associated Event or an Event applicable to both players, then the card must be discarded without triggering the Event. |
| 6 | The China Card | This card begins the game with the USSR. When played, the player receives +1 Operations to the Operations value of this card if it uses all its Operations in Asia. It is passed to the opponent once played. A player receives 1 VP for holding this card at the end of Turn 10. |
| 7 | Socialist Governments | Remove a total of 3 US Influence from any countries in Western Europe (removing no more than 2 Influence per country). This Event cannot be used after the “#83 – The Iron Lady” Event has been played. |
| 8 | Fidel | Remove all US Influence from Cuba. USSR adds sufficient Influence in Cuba for Control. |
| 9 | Vietnam Revolts | Add 2 USSR Influence to Vietnam. For the remainder of the turn, the USSR receives +1 Operations to the Operations value of a card that uses all its Operations in Southeast Asia. |
| 10 | Blockade | Unless the US immediately discards a card with an Operations value of 3 or more, remove all US Influence from West Germany. |
| 11 | Korean War | North Korea invades South Korea. Roll a die and subtract (-1) from the die roll for every US controlled country adjacent to South Korea. On a modified die roll of 4-6, the USSR receives 2 VP and replaces all US Influence in South Korea with USSR Influence. The USSR adds 2 to its Military Operations Track. |
| 12 | Romanian Abdication | Remove all US Influence from Romania. The USSR adds sufficient Influence to Romania for Control. |
| 13 | Arab-Israeli War | Pan-Arab Coalition invades Israel. Roll a die and subtract (-1) from the die roll for Israel, if it is US controlled, and for every US controlled country adjacent to Israel. On a modified die roll of 4-6, the USSR receives 2 VP and replaces all US Influence in Israel with USSR Influence. The USSR adds 2 to its Military Operations Track. This Event cannot be used after the “#65 – Camp David Accords” Event has been played. |
| 14 | Comecon | Add 1 USSR Influence to each of 4 non-US controlled countries of Eastern Europe. |
| 15 | Nasser | Add 2 USSR Influence to Egypt. The US removes half, rounded up, of its Influence from Egypt. |
| 16 | Warsaw Pact Formed | Remove all US influence from 4 countries in Eastern Europe or add 5 USSR Influence to any countries in Eastern Europe (adding no more than 2 Influence per country). This Event allows the “#21 – NATO” card to be played as an Event. |
| 17 | De Gaulle Leads France | Remove 2 US Influence from France and add 1 USSR Influence to France. This Event cancels the effect(s) of the “#21 – NATO” Event for France only. |
| 18 | Captured Nazi Scientist | Move the Space Race Marker ahead by 1 space. |
| 19 | Truman Doctrine | Remove all USSR Influence from a single uncontrolled country in Europe. |
| 20 | Olympic Games | This player sponsors the Olympics. The opponent must either participate or boycott. If the opponent participates, each player rolls a die and the sponsor adds 2 to their roll. The player with the highest modified die roll receives 2 VP (reroll ties). If the opponent boycotts, degrade the DEFCON level by 1 and the sponsor may conduct Operations as if they played a 4 Ops card. |
| 21 | NATO | The USSR cannot make Coup Attempts or Realignment rolls against any US controlled countries in Europe. US controlled countries in Europe cannot be attacked by play of the “#36 – Brush War” Event. This card requires prior play of either the “#16 – Warsaw Pact Formed” or “#23 – Marshall Plan” Event(s) in order to be played as an Event. |
| 22 | Independent Reds | Add US Influence to either Yugoslavia, Romania, Bulgaria, Hungary, or Czechoslovakia so that it equals the USSR Influence in that country. |
| 23 | Marshall Plan | Add 1 US Influence to each of any 7 non-USSR controlled countries in Western Europe. This Event allows the “#21 – NATO” card to be played as an Event. |
| 24 | Indo-Pakistani War | India invades Pakistan or vice versa (player’s choice). Roll a die and subtract (-1) from the die roll for every enemy controlled country adjacent to the target of the invasion (India or Pakistan). On a modified die roll of 4-6, the player receives 2 VP and replaces all the opponent’s Influence in the target country with their Influence. The player adds 2 to its Military Operations Track. |
| 25 | Containment | All Operations cards played by the US, for the remainder of this turn, receive +1 to their Operations value (to a maximum of 4 Operations per card). |
| 26 | CIA Created | The USSR reveals their hand of cards for this turn. The US may use the Operations value of this card to conduct Operations. |
| 27 | US/Japan Mutual Defense Pact | The US adds sufficient Influence to Japan for Control. The USSR cannot make Coup Attempts or Realignment rolls against Japan. |
| 28 | Suez Crisis | Remove a total of 4 US Influence from France, the United Kingdom and Israel (removing no more than 2 Influence per country). |
| 29 | East European Unrest | Early or Mid War: Remove 1 USSR Influence from 3 countries in Eastern Europe. Late War: Remove 2 USSR Influence from 3 countries in Eastern Europe. |
| 30 | Decolonization | Add 1 USSR Influence to each of any 4 countries in Africa and/or Southeast Asia. |
| 31 | Red Scare/Purge | All Operations cards played by the opponent, for the remainder of this turn, receive -1 to their Operations value (to a minimum value of 1 Operations point). |
| 32 | UN Intervention | Play this card simultaneously with a card containing an opponent’s associated Event. The opponent’s associated Event is canceled but you may use the Operations value of the opponent’s card to conduct Operations. This Event cannot be played during the Headline Phase. |
| 33 | De-Stalinization | The USSR may reallocate up to a total of 4 Influence from one or more countries to any non-US controlled countries (adding no more than 2 Influence per country). |
| 34 | Nuclear Test Ban | The player receives VP equal to the current DEFCON level minus 2 then improves the DEFCON level by 2. |
| 35 | Formosan Resolution | If this card’s Event is in effect, Taiwan will be treated as a Battleground country, for scoring purposes only, if Taiwan is US controlled when the Asia Scoring Card is played. This Event is cancelled after the US has played the “#6 – The China Card” card. |
| 36 | Brush War | The player attacks any country with a stability number of 1 or 2. Roll a die and subtract (-1) from the die roll for every adjacent enemy controlled country. On a modified die roll of 3-6, the player receives 1 VP and replaces all the opponent’s Influence in the target country with their Influence. The player adds 3 to its Military Operations Track. |
| 37 | Central America Scoring | Presence: 1; Domination: 3; Control: 5; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD! |
| 38 | Southeast Asia Scoring | 1 VP each for Control of Burma, Cambodia/Laos, Vietnam, Malaysia, Indonesia and the Philippines. 2 VP for Control of Thailand; MAY NOT BE HELD! |
| 39 | Arms Race | Compare each player’s value on the Military Operations Track. If the phasing player has a higher value than their opponent on the Military Operations Track, that player receives 1 VP. If the phasing player has a higher value than their opponent, and has met the “required” amount, on the Military Operations Track, that player receives 3 VP instead. |
| 40 | Cuban Missile Crisis | Set the DEFCON level to 2. Any Coup Attempts by your opponent, for the remainder of this turn, will result in Global Thermonuclear War. Your opponent will lose the game. This card’s Event may be canceled, at any time, if the USSR removes 2 Influence from Cuba or the US removes 2 Influence from West Germany or Turkey. |
| 41 | Nuclear Subs | US Operations used for Coup Attempts in Battleground countries, for the remainder of this turn, do not degrade the DEFCON level. This card’s Event does not apply to any Event that would affect the DEFCON level (ex. the “#40 – Cuban Missile Crisis” Event). |
| 42 | Quagmire | On the US’s next action round, it must discard an Operations card with a value of 2 or more and roll 1-4 on a die to cancel this Event. Repeat this Event for each US action round until the US successfully rolls 1-4 on a die. If the US is unable to discard an Operations card, it must play all of its scoring cards and then skip each action round for the rest of the turn. This Event cancels the effect(s) of the “#106 – NORAD” Event (if applicable). |
| 43 | SALT Negotiations | Improve the DEFCON level by 2. For the remainder of the turn, both players receive -1 to all Coup Attempt rolls. The player of this card’s Event may look through the discard pile, pick any 1 non-scoring card, reveal it to their opponent and then place the drawn card into their hand. |
| 44 | Bear Trap | On the USSR’s next action round, it must discard an Operations card with a value of 2 or more and roll 1-4 on a die to cancel this Event. Repeat this Event for each USSR action round until the USSR successfully rolls 1-4 on a die. If the USSR is unable to discard an Operations card, it must play all of its scoring cards and then skip each action round for the rest of the turn. |
| 45 | Summit | Both players roll a die. Each player receives +1 to the die roll for each Region (Europe, Asia, etc.) they Dominate or Control. The player with the highest modified die roll receives 2 VP and may degrade or improve the DEFCON level by 1 (do not reroll ties). |
| 46 | How I Learned to Stop Worrying | Set the DEFCON level to any level desired (1-5). The player adds 5 to its Military Operations Track. |
| 47 | Junta | Add 2 Influence to a single country in Central or South America. The player may make free Coup Attempts or Realignment rolls in either Central or South America using the Operations value of this card. |
| 48 | Kitchen Debates | If the US controls more Battleground countries than the USSR, the US player uses this Event to poke their opponent in the chest and receive 2 VP! |
| 49 | Missile Envy | Exchange this card for your opponent’s highest value Operations card. If 2 or more cards are tied, opponent chooses. If the exchanged card contains an Event applicable to yourself or both players, it occurs immediately. If it contains an opponent’s Event, use the Operations value (no Event). The opponent must use this card for Operations during their next action round. |
| 50 | “We Will Bury You” | Degrade the DEFCON level by 1. Unless the #32 UN Intervention card is played as an Event on the US’s next action round, the USSR receives 3 VP. |
| 51 | Brezhnev Doctrine | All Operations cards played by the USSR, for the remainder of this turn, receive +1 to their Operations value (to a maximum of 4 Operations per card). |
| 52 | Portuguese Empire Crumbles | Add 2 USSR Influence to Angola and the SE African States. |
| 53 | South African Unrest | The USSR either adds 2 Influence to South Africa or adds 1 Influence to South Africa and 2 Influence to a single country adjacent to South Africa. |
| 54 | Allende | Add 2 USSR Influence to Chile. |
| 55 | Willy Brandt | The USSR receives 1 VP and adds 1 Influence to West Germany. This Event cancels the effect(s) of the “#21 – NATO” Event for West Germany only. This Event is prevented / canceled by the “#96 – Tear Down this Wall” Event. |
| 56 | Muslim Revolution | Remove all US Influence from 2 of the following countries: Sudan, Iran, Iraq, Egypt, Libya, Saudi Arabia, Syria, Jordan. This Event cannot be used after the “#110 – AWACS Sale to Saudis” Event has been played. |
| 57 | ABM Treaty | Improve the DEFCON level by 1 and then conduct Operations using the Operations value of this card. |
| 58 | Cultural Revolution | If the US has the “#6 – The China Card” card, the US must give the card to the USSR (face up and available to be played). If the USSR already has “#6 – The China Card” card, the USSR receives 1 VP. |
| 59 | Flower Power | The USSR receives 2 VP for every US played “War” card (Arab-Israeli War, Korean War, Brush War, Indo-Pakistani War, Iran-Iraq War), used for Operations or an Event, after this card is played. This Event is prevented / canceled by the “#97 – ‘An Evil Empire’” Event. |
| 60 | U2 Incident | The USSR receives 1 VP. If the “#32 – UN Intervention” Event is played later this turn, either by the US or the USSR, the USSR receives an additional 1 VP. |
| 61 | OPEC | The USSR receives 1 VP for Control of each of the following countries: Egypt, Iran, Libya, Saudi Arabia, Iraq, Gulf States, Venezuela. This Event cannot be used after the “#86 – North Sea Oil” Event has been played. |
| 62 | “Lone Gunman” | The US reveals their hand of cards. The USSR may use the Operations value of this card to conduct Operations. |
| 63 | Colonial Rear Guards | Add 1 US Influence to each of any 4 countries in Africa and/or Southeast Asia. |
| 64 | Panama Canal Returned | Add 1 US Influence to Panama, Costa Rica and Venezuela. |
| 65 | Camp David Accords | The US receives 1 VP and adds 1 Influence to Israel, Jordan and Egypt. This Event prevents the “#13 – Arab-Israeli War” card from being played as an Event. |
| 66 | Puppet Governments | The US may add 1 Influence to 3 countries that do not contain Influence from either the US or USSR. |
| 67 | Grain Sales to Soviets | The US randomly selects 1 card from the USSR’s hand (if available). The US must either play the card or return it to the USSR. If the card is returned, or the USSR has no cards, the US may use the Operations value of this card to conduct Operations. |
| 68 | John Paul II Elected Pope | Remove 2 USSR Influence from Poland and add 1 US Influence to Poland. This Event allows the “#101 – Solidarity” card to be played as an Event. |
| 69 | Latin American Death Squads | All of the phasing player’s Coup Attempts in Central and South America, for the remainder of this turn, receive +1 to their die roll. All of the opponent’s Coup Attempts in Central and South America, for the remainder of this turn, receive -1 to their die roll. |
| 70 | OAS Founded | Add a total of 2 US Influence to any countries in Central or South America. |
| 71 | Nixon Plays the China Card | If the USSR has the “#6 – The China Card” card, the USSR must give the card to the US (face down and unavailable for immediate play). If the US already has the “#6 – The China Card” card, the US receives 2 VP. |
| 72 | Sadat Expels Soviets | Remove all USSR Influence from Egypt and add 1 US Influence to Egypt. |
| 73 | Shuttle Diplomacy | If this card’s Event is in effect, subtract (-1) a Battleground country from the USSR total and then discard this card during the next scoring of the Middle East or Asia (which ever comes first). |
| 74 | The Voice of America | Remove 4 USSR Influence from any countries NOT in Europe (removing no more than 2 Influence per country). |
| 75 | Liberation Theology | Add a total of 3 USSR Influence to any countries in Central America (adding no more than 2 Influence per country). |
| 76 | Ussuri River Skirmish | If the USSR has the “#6 – The China Card” card, the USSR must give the card to the US (face up and available for play). If the US already has the “#6 – The China Card” card, add a total of 4 US Influence to any countries in Asia (adding no more than 2 Influence per country). |
| 77 | “Ask Not What Your Country…” | The US may discard up to their entire hand of cards (including scoring cards) to the discard pile and draw replacements from the draw pile. The number of cards to be discarded must be decided before drawing any replacement cards from the draw pile. |
| 78 | Alliance for Progress | The US receives 1 VP for each US controlled Battleground country in Central and South America. |
| 79 | Africa Scoring | Presence: 1; Domination: 4; Control: 6; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD! |
| 80 | “One Small Step…” | If you are behind on the Space Race Track, the player uses this Event to move their marker 2 spaces forward on the Space Race Track. The player receives VP only from the final space moved into. |
| 81 | South America Scoring | Presence: 2; Domination: 5; Control: 6; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD! |
| 82 | Iranian Hostage Crisis | Remove all US Influence and add 2 USSR Influence to Iran. This card’s Event requires the US to discard 2 cards, instead of 1 card, if the “#92 – Terrorism” Event is played. |
| 83 | The Iron Lady | Add 1 USSR Influence to Argentina and remove all USSR Influence from the United Kingdom. The US receives 1 VP. This Event prevents the “#7 – Socialist Governments” card from being played as an Event. |
| 84 | Reagan Bombs Libya | The US receives 1 VP for every 2 USSR Influence in Libya. |
| 85 | Star Wars | If the US is ahead on the Space Race Track, the US player uses this Event to look through the discard pile, pick any 1 non-scoring card and play it immediately as an Event. |
| 86 | North Sea Oil | The US may play 8 cards (in 8 action rounds) for this turn only. This Event prevents the “#61 – OPEC” card from being played as an Event. |
| 87 | The Reformer | Add 4 USSR Influence to Europe (adding no more than 2 Influence per country). If the USSR is ahead of the US in VP, 6 Influence may be added to Europe instead. The USSR may no longer make Coup Attempts in Europe. |
| 88 | Marine Barracks Bombing | Remove all US Influence in Lebanon and remove a total of 2 US Influence from any countries in the Middle East. |
| 89 | Soviets Shoot Down KAL-007 | Degrade the DEFCON level by 1 and the US receives 2 VP. The US may place influence or make Realignment rolls, using this card, if South Korea is US controlled. |
| 90 | Glasnost | Improve the DEFCON level by 1 and the USSR receives 2 VP. The USSR may make Realignment rolls or add Influence, using this card, if the “#87 – The Reformer” Event has already been played. |
| 91 | Ortega Elected in Nicaragua | Remove all US Influence from Nicaragua. The USSR may make a free Coup Attempt, using this card’s Operations value, in a country adjacent to Nicaragua. |
| 92 | Terrorism | The player’s opponent must randomly discard 1 card from their hand. If the “#82 – Iranian Hostage Crisis” Event has already been played, a US player (if applicable) must randomly discard 2 cards from their hand. |
| 93 | Iran-Contra Scandal | All US Realignment rolls, for the remainder of this turn, receive -1 to their die roll. |
| 94 | Chernobyl | The US must designate a single Region (Europe, Asia, etc.) that, for the remainder of the turn, the USSR cannot add Influence to using Operations points. |
| 95 | Latin American Debt Crisis | The US must immediately discard a card with an Operations value of 3 or more or the USSR may double the amount of USSR Influence in 2 countries in South America. |
| 96 | Tear Down this Wall | Add 3 US Influence to East Germany. The US may make free Coup Attempts or Realignment rolls in Europe using the Operations value of this card. This Event prevents / cancels the effect(s) of the “#55 – Willy Brandt” Event. |
| 97 | “An Evil Empire” | The US receives 1 VP. This Event prevents / cancels the effect(s) of the “#59 – Flower Power” Event. |
| 98 | Aldrich Ames Remix | The US reveals their hand of cards, face-up, for the remainder of the turn and the USSR discards a card from the US hand. |
| 99 | Pershing II Deployed | The USSR receives 1 VP. Remove 1 US Influence from any 3 countries in Western Europe. |
| 100 | Wargames | If the DEFCON level is 2, the player may immediately end the game after giving their opponent 6 VP. How about a nice game of chess? |
| 101 | Solidarity | Add 3 US Influence to Poland. This card requires prior play of the “#68 – John Paul II Elected Pope” Event in order to be played as an Event. |
| 102 | Iran-Iraq War | Iran invades Iraq or vice versa (player’s choice). Roll a die and subtract (-1) from the die roll for every enemy controlled country adjacent to the target of the invasion (Iran or Iraq). On a modified die roll of 4-6, the player receives 2 VP and replaces all the opponent’s Influence in the target country with their Influence. The player adds 2 to its Military Operations Track. |
| 103 | Defectors | The US may play this card during the Headline Phase in order to cancel the USSR Headline Event (including a scoring card). The canceled card is placed into the discard pile. If this card is played by the USSR during its action round, the US gains 1 VP. |
| 104 | The Cambridge Five | The US reveals all scoring cards in their hand of cards. The USSR player may add 1 USSR Influence to a single Region named on one of the revealed scoring cards. This card can not be played as an Event during the Late War. |
| 105 | Special Relationship | Add 1 US Influence to a single country adjacent to the U.K. if the U.K. is US-controlled but NATO is not in effect. Add 2 US Influence to a single country in Western Europe, and the US gains 2 VP, if the U.K. is US-controlled and NATO is in effect. |
| 106 | NORAD | Add 1 US Influence to a single country containing US Influence, at the end of each Action Round, if Canada is US-controlled and the DEFCON level moved to 2 during that Action Round. This Event is canceled by the “#42 – Quagmire” Event. |
| 107 | Che | The USSR may perform a Coup Attempt, using this card’s Operations value, against a non-Battleground country in Central America, South America or Africa. The USSR may perform a second Coup Attempt, against a different non-Battleground country in Central America, South America or Africa, if the first Coup Attempt removed any US Influence from the target country. |
| 108 | Our Man in Tehran | If the US controls at least one Middle East country, the US player uses this Event to draw the top 5 cards from the draw pile. The US may discard any or all of the drawn cards, after revealing the discarded card(s) to the USSR player, without triggering the Event(s). Any remaining drawn cards are returned to the draw pile and the draw pile is reshuffled. |
| 109 | Yuri and Samantha | The USSR receives 1 VP for each US Coup Attempt performed during the remainder of the Turn. |
| 110 | AWACS Sale to Saudis | Add 2 US Influence to Saudi Arabia. This Event prevents the “#56 – Muslim Revolution” card from being played as an Event. |
