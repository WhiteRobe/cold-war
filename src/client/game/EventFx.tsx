// 事件动画：卡牌插画放大推近，再叠一层按卡牌主题设计的短动画（爆炸、升旗、签约、火箭……）和一句标语。
import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import { CARDS, type Side } from "../../data";
import { cardArt } from "../../art";
import { sfx, type Sfx } from "../audio";

type Motif =
  | "war"
  | "nuke"
  | "peace"
  | "rocket"
  | "flags"
  | "revolt"
  | "money"
  | "radio"
  | "spy"
  | "treaty"
  | "cards"
  | "shootdown"
  | "wall"
  | "oil"
  | "bomb"
  | "shield"
  | "crosshair"
  | "stamp"
  | "scoring"
  | "light"
  | "flowers"
  | "ballot"
  | "ships"
  | "missiles"
  | "radar"
  | "grain"
  | "bars"
  | "gears"
  | "crowd"
  | "trap"
  | "handshake"
  | "coup"
  | "purge"
  | "quake"
  | "star";

interface Spec {
  fx: Motif;
  cap: string;
  word?: string;
}

/** 每张牌的动画主题与标语 */
const FX: Record<number, Spec> = {
  1: { fx: "scoring", cap: "亚洲清点势力" },
  2: { fx: "scoring", cap: "欧洲清点势力" },
  3: { fx: "scoring", cap: "中东清点势力" },
  4: { fx: "nuke", cap: "防空警报拉响" },
  5: { fx: "cards", cap: "计划经济出了岔子" },
  6: { fx: "star", cap: "中国牌" },
  7: { fx: "flags", cap: "西欧政坛左转" },
  8: { fx: "revolt", cap: "古巴革命胜利" },
  9: { fx: "revolt", cap: "丛林里的起义" },
  10: { fx: "ships", cap: "西柏林被封锁" },
  11: { fx: "war", cap: "三八线燃起战火" },
  12: { fx: "stamp", cap: "王冠落地", word: "退位" },
  13: { fx: "war", cap: "中东烽烟再起" },
  14: { fx: "gears", cap: "东方阵营经济抱团" },
  15: { fx: "flags", cap: "埃及倒向莫斯科" },
  16: { fx: "shield", cap: "华约成立" },
  17: { fx: "stamp", cap: "法国走自己的路", word: "独立" },
  18: { fx: "rocket", cap: "火箭专家换了东家" },
  19: { fx: "shield", cap: "遏制共产主义" },
  20: { fx: "star", cap: "圣火点燃" },
  21: { fx: "shield", cap: "北约成立" },
  22: { fx: "flags", cap: "东欧的离心力" },
  23: { fx: "money", cap: "美元重建西欧" },
  24: { fx: "war", cap: "南亚开战" },
  25: { fx: "shield", cap: "全面遏制" },
  26: { fx: "spy", cap: "中情局诞生" },
  27: { fx: "shield", cap: "太平洋同盟" },
  28: { fx: "ships", cap: "运河危机" },
  29: { fx: "crowd", cap: "东欧街头抗议" },
  30: { fx: "flags", cap: "殖民地纷纷独立" },
  31: { fx: "purge", cap: "大清洗" },
  32: { fx: "stamp", cap: "联合国出面", word: "干预" },
  33: { fx: "wall", cap: "偶像倒下" },
  34: { fx: "peace", cap: "核试验叫停" },
  35: { fx: "shield", cap: "协防台湾海峡" },
  36: { fx: "war", cap: "边境冲突" },
  37: { fx: "scoring", cap: "中美洲清点势力" },
  38: { fx: "scoring", cap: "东南亚清点势力" },
  39: { fx: "missiles", cap: "军备竞赛升级" },
  40: { fx: "missiles", cap: "世界屏住呼吸" },
  41: { fx: "ships", cap: "核潜艇出航" },
  42: { fx: "trap", cap: "陷入泥潭" },
  43: { fx: "treaty", cap: "限制战略武器" },
  44: { fx: "trap", cap: "熊掉进陷阱" },
  45: { fx: "handshake", cap: "首脑会面" },
  46: { fx: "nuke", cap: "重设核警戒" },
  47: { fx: "coup", cap: "军人上台" },
  48: { fx: "radio", cap: "厨房里的辩论" },
  49: { fx: "missiles", cap: "导弹攀比" },
  50: { fx: "radio", cap: "拍着桌子的宣言" },
  51: { fx: "shield", cap: "社会主义大家庭" },
  52: { fx: "flags", cap: "殖民帝国瓦解" },
  53: { fx: "crowd", cap: "南非动荡" },
  54: { fx: "ballot", cap: "智利选出阿连德" },
  55: { fx: "handshake", cap: "新东方政策" },
  56: { fx: "crowd", cap: "革命浪潮" },
  57: { fx: "treaty", cap: "反导条约" },
  58: { fx: "revolt", cap: "红色风暴" },
  59: { fx: "flowers", cap: "要爱不要战争" },
  60: { fx: "shootdown", cap: "U-2 被击落" },
  61: { fx: "oil", cap: "石油禁运" },
  62: { fx: "crosshair", cap: "达拉斯的枪声" },
  63: { fx: "flags", cap: "殖民地后卫" },
  64: { fx: "ships", cap: "运河归还" },
  65: { fx: "handshake", cap: "戴维营握手" },
  66: { fx: "flags", cap: "扶植新政权" },
  67: { fx: "grain", cap: "粮食换情报" },
  68: { fx: "light", cap: "来自波兰的教皇" },
  69: { fx: "crosshair", cap: "敢死队出动" },
  70: { fx: "shield", cap: "美洲团结" },
  71: { fx: "handshake", cap: "尼克松访华" },
  72: { fx: "stamp", cap: "苏联顾问被请走", word: "驱逐" },
  73: { fx: "handshake", cap: "穿梭外交" },
  74: { fx: "radio", cap: "电波越过铁幕" },
  75: { fx: "light", cap: "教堂里的革命" },
  76: { fx: "war", cap: "中苏边境交火" },
  77: { fx: "radio", cap: "一个时代的号召" },
  78: { fx: "money", cap: "美洲进步同盟" },
  79: { fx: "scoring", cap: "非洲清点势力" },
  80: { fx: "rocket", cap: "登月一小步" },
  81: { fx: "scoring", cap: "南美洲清点势力" },
  82: { fx: "bars", cap: "大使馆人质" },
  83: { fx: "shield", cap: "铁娘子上台" },
  84: { fx: "war", cap: "空袭利比亚" },
  85: { fx: "radar", cap: "星球大战计划" },
  86: { fx: "oil", cap: "北海出油" },
  87: { fx: "gears", cap: "改革派上台" },
  88: { fx: "bomb", cap: "贝鲁特爆炸" },
  89: { fx: "shootdown", cap: "客机被击落" },
  90: { fx: "light", cap: "开放与透明" },
  91: { fx: "ballot", cap: "桑地诺执政" },
  92: { fx: "bomb", cap: "恐怖袭击" },
  93: { fx: "spy", cap: "军售丑闻曝光" },
  94: { fx: "nuke", cap: "反应堆事故" },
  95: { fx: "quake", cap: "债务崩盘" },
  96: { fx: "wall", cap: "柏林墙倒塌" },
  97: { fx: "radio", cap: "“邪恶帝国”演讲" },
  98: { fx: "spy", cap: "鼹鼠泄密" },
  99: { fx: "missiles", cap: "潘兴导弹部署" },
  100: { fx: "radar", cap: "要来一局吗？" },
  101: { fx: "crowd", cap: "船厂大罢工" },
  102: { fx: "war", cap: "两伊开战" },
  103: { fx: "spy", cap: "有人叛逃" },
  104: { fx: "spy", cap: "剑桥间谍网" },
  105: { fx: "handshake", cap: "特殊关系" },
  106: { fx: "radar", cap: "雷达昼夜值守" },
  107: { fx: "coup", cap: "游击战士" },
  108: { fx: "cards", cap: "德黑兰的线人" },
  109: { fx: "peace", cap: "孩子的和平信" },
  110: { fx: "radar", cap: "预警机升空" },
};

const SOUND: Partial<Record<Motif, Sfx>> = {
  war: "spaceFail",
  bomb: "spaceFail",
  shootdown: "spaceFail",
  nuke: "defconDown",
  missiles: "defconDown",
  quake: "controlLose",
  peace: "defconUp",
  treaty: "defconUp",
  handshake: "defconUp",
  light: "defconUp",
  flowers: "defconUp",
  rocket: "launch",
  flags: "controlGain",
  revolt: "controlGain",
  shield: "controlGain",
  coup: "coupWin",
  ballot: "controlGain",
  stamp: "controlGain",
  scoring: "scoring",
  money: "vpGood",
  oil: "vpGood",
  grain: "vpGood",
  crosshair: "coupFail",
  purge: "controlLose",
  wall: "controlLose",
  trap: "coupFail",
  bars: "coupFail",
  spy: "fog",
  radar: "space",
  radio: "headline",
  cards: "card",
  ships: "fog",
  gears: "place",
  crowd: "headline",
  star: "turn",
};

const COL = { US: "#2f63b0", USSR: "#c8102e" };
const t = (s: number): Record<string, string> => ({ animationDelay: `${s}s` });
const star = (cx: number, cy: number, r: number, k = 0.42) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * k : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
const burst = (cx: number, cy: number, r: number, n = 9) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i * Math.PI) / n + (i % 4) * 0.08;
    const rr = i % 2 ? r * 0.45 : r * (0.8 + ((i * 7) % 5) * 0.06);
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

function Boom({ x, y, r, d }: { x: number; y: number; r: number; d: number }) {
  return (
    <g class="ev-burst" style={t(d)}>
      <polygon points={burst(x, y, r)} fill="#f5a623" />
      <polygon points={burst(x, y, r * 0.6, 7)} fill="#ffe08a" />
      <circle cx={x} cy={y} r={r * 0.22} fill="#fff" />
    </g>
  );
}

function Flag({
  x,
  y,
  c,
  d,
  s = 1,
}: {
  x: number;
  y: number;
  c: string;
  d: number;
  s?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <g class="ev-pop" style={t(d)}>
        <rect x="-1" y="-30" width="2.4" height="30" fill="#3a2f22" />
        <g class="ev-wave">
          <polygon points="1.4,-30 22,-27 20,-19 1.4,-17" fill={c} />
          <polygon points="1.4,-30 22,-27 21,-23 1.4,-24" fill="#ffffff33" />
        </g>
        <ellipse cx="0" cy="0" rx="5" ry="1.6" fill="#0005" />
      </g>
    </g>
  );
}

function Plane({ c = "#d8d2c2" }: { c?: string }) {
  return (
    <g>
      <polygon points="-16,0 14,-2 18,0 14,2" fill={c} />
      <polygon points="-2,-1 -8,-12 -4,-12 6,-1" fill={c} />
      <polygon points="-2,1 -8,12 -4,12 6,1" fill={c} />
      <polygon points="-14,0 -18,-6 -15,-6 -11,0" fill={c} />
    </g>
  );
}

function Missile({ x, d, c }: { x: number; d: number; c: string }) {
  return (
    <g transform={`translate(${x},150)`}>
      <g class="ev-launch" style={t(d)}>
        <polygon points="0,-30 -4,-22 -4,0 4,0 4,-22" fill="#e9e3d2" />
        <polygon points="0,-30 -4,-22 4,-22" fill={c} />
        <polygon points="-4,-6 -8,2 -4,0" fill="#555" />
        <polygon points="4,-6 8,2 4,0" fill="#555" />
        <polygon class="ev-flame" points="-3,0 3,0 0,12" fill="#f5a623" />
      </g>
    </g>
  );
}

function Person({
  x,
  y,
  c,
  d,
  cls = "ev-rise",
}: {
  x: number;
  y: number;
  c: string;
  d: number;
  cls?: string;
}) {
  return (
    <g class={cls} style={t(d)}>
      <circle cx={x} cy={y - 26} r="5" fill={c} />
      <polygon
        points={`${x - 7},${y} ${x - 6},${y - 19} ${x},${y - 21} ${x + 6},${y - 19} ${x + 7},${y}`}
        fill={c}
      />
    </g>
  );
}

const MOTIFS: Record<Motif, (c: string, s: Spec) => JSX.Element> = {
  war: () => (
    <g class="ev-shake">
      <Boom x={60} y={70} r={26} d={0.2} />
      <Boom x={170} y={55} r={22} d={0.55} />
      <Boom x={120} y={105} r={30} d={0.9} />
      <Boom x={200} y={110} r={18} d={1.25} />
      <Boom x={35} y={115} r={16} d={1.5} />
    </g>
  ),
  nuke: () => (
    <g>
      <rect
        class="ev-flash"
        width="240"
        height="150"
        fill="#fff"
        style={t(0.15)}
      />
      <g class="ev-mushroom" style={t(0.3)}>
        <polygon points="112,150 128,150 126,78 114,78" fill="#c9b79a" />
        <polygon
          points="84,82 96,58 120,48 144,58 156,82 138,90 102,90"
          fill="#e6d3ad"
        />
        <polygon points="96,58 120,48 144,58 132,66 108,66" fill="#fff3d6" />
        <polygon points="102,90 138,90 132,98 108,98" fill="#b5a283" />
      </g>
      <ellipse
        class="ev-ring"
        cx="120"
        cy="146"
        rx="60"
        ry="10"
        fill="none"
        stroke="#fff8"
        stroke-width="3"
        style={t(0.5)}
      />
      <rect
        class="ev-siren"
        width="240"
        height="150"
        fill="#c8102e"
        style={t(1.2)}
      />
    </g>
  ),
  peace: () => (
    <g>
      <circle
        class="ev-glow"
        cx="120"
        cy="75"
        r="50"
        fill="#fff6d8"
        style={t(0.1)}
      />
      <g class="ev-fly">
        <g class="ev-bob">
          <polygon points="0,0 22,-4 30,2 20,8 2,6" fill="#fbfaf5" />
          <polygon class="ev-flap" points="8,-1 2,-22 18,-4" fill="#ecebe4" />
          <polygon points="30,2 36,1 31,4" fill="#e3a43a" />
          <polygon points="28,4 40,10 34,4" fill="#5e8a3a" />
        </g>
      </g>
    </g>
  ),
  rocket: (c) => (
    <g>
      <g class="ev-launch-slow" transform="translate(120,150)">
        <polygon points="0,-58 -9,-40 -9,0 9,0 9,-40" fill="#eee8da" />
        <polygon points="0,-58 -9,-40 9,-40" fill={c} />
        <polygon points="0,-40 9,-40 9,0 0,0" fill="#0002" />
        <polygon points="-9,-14 -17,6 -9,0" fill={c} />
        <polygon points="9,-14 17,6 9,0" fill={c} />
        <circle cx="0" cy="-28" r="3.6" fill="#9cc6f0" />
        <polygon class="ev-flame" points="-7,0 7,0 0,26" fill="#f5a623" />
        <polygon class="ev-flame" points="-4,0 4,0 0,15" fill="#fff3b0" />
      </g>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          class="ev-smoke"
          cx={100 + i * 10}
          cy="146"
          r={10 + (i % 2) * 5}
          fill="#ddd8cc"
          style={t(0.2 + i * 0.08)}
        />
      ))}
    </g>
  ),
  flags: (c) => (
    <g>
      {[
        [40, 110],
        [95, 80],
        [150, 118],
        [200, 74],
        [70, 140],
        [180, 140],
      ].map(([x, y], i) => (
        <Flag key={i} x={x} y={y} c={c} d={0.2 + i * 0.22} />
      ))}
    </g>
  ),
  revolt: (c) => (
    <g>
      <Flag x={120} y={110} c={c} d={0.1} s={2.2} />
      {[30, 60, 90, 150, 180, 210].map((x, i) => (
        <g key={x} class="ev-rise" style={t(0.3 + i * 0.12)}>
          <polygon
            points={`${x - 6},150 ${x - 5},120 ${x - 7},112 ${x + 5},110 ${x + 7},118 ${x + 6},150`}
            fill="#3a2f22"
          />
          <polygon
            points={`${x - 7},112 ${x - 7},104 ${x + 6},103 ${x + 7},110`}
            fill="#5a4636"
          />
        </g>
      ))}
    </g>
  ),
  money: () => (
    <g>
      {Array.from({ length: 14 }, (_, i) => (
        <g
          key={i}
          class="ev-fall"
          style={t((i % 7) * 0.18 + (i > 6 ? 0.5 : 0))}
        >
          <circle
            cx={15 + ((i * 53) % 215)}
            cy={30 + ((i * 37) % 90)}
            r="8"
            fill="#e8b830"
            stroke="#9c7412"
            stroke-width="1.4"
          />
          <text
            x={15 + ((i * 53) % 215)}
            y={34 + ((i * 37) % 90)}
            class="ev-coin"
          >
            $
          </text>
        </g>
      ))}
    </g>
  ),
  radio: () => (
    <g>
      <polygon points="114,150 120,70 126,150" fill="#3a3a3a" />
      <polygon
        points="108,150 120,100 132,150"
        fill="none"
        stroke="#3a3a3a"
        stroke-width="2"
      />
      <circle cx="120" cy="68" r="4" fill="#e04a3a" />
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          class="ev-wave-ring"
          cx="120"
          cy="68"
          r="12"
          fill="none"
          stroke="#fff"
          stroke-width="3"
          style={t(i * 0.4)}
        />
      ))}
    </g>
  ),
  spy: () => (
    <g>
      <rect class="ev-dark" width="240" height="150" fill="#000" />
      <g class="ev-scan">
        <circle
          cx="0"
          cy="75"
          r="32"
          fill="#fff2"
          stroke="#e9dfc7"
          stroke-width="4"
        />
        <polygon points="22,98 28,92 52,118 46,124" fill="#4a3b2a" />
      </g>
      <rect
        class="ev-scanline"
        x="0"
        y="0"
        width="240"
        height="3"
        fill="#7cff9a"
      />
    </g>
  ),
  treaty: () => (
    <g>
      <g class="ev-rise" style={t(0.1)}>
        <polygon points="60,30 180,26 184,132 56,136" fill="#f3ecdb" />
        {[44, 56, 68, 80].map((y) => (
          <line
            key={y}
            x1="72"
            y1={y}
            x2="168"
            y2={y - 1}
            stroke="#b9ae96"
            stroke-width="2.5"
          />
        ))}
      </g>
      <path
        class="ev-draw"
        d="M78,112 q10,-16 18,0 t18,-4 q8,-12 14,2 t20,-6"
        fill="none"
        stroke="#1f2f5c"
        stroke-width="2.6"
        stroke-linecap="round"
        style={t(0.6)}
      />
      <g class="ev-slam" style={t(1.5)}>
        <circle cx="160" cy="112" r="15" fill="#b8231c" />
        <polygon points={star(160, 112, 9)} fill="#f5d76e" />
      </g>
    </g>
  ),
  cards: () => (
    <g>
      {[-1, 0, 1, 2].map((k, i) => (
        <g
          key={k}
          class="ev-toss"
          style={
            {
              ...t(0.2 + i * 0.25),
              "--dx": `${k * 70 - 35}px`,
              "--rot": `${k * 30 - 15}deg`,
            } as Record<string, string>
          }
        >
          <rect
            x="104"
            y="50"
            width="32"
            height="46"
            rx="3"
            fill="#e9dfc7"
            stroke="#3a2f22"
            stroke-width="1.5"
          />
          <rect x="108" y="54" width="24" height="16" fill="#8a7a5c" />
        </g>
      ))}
    </g>
  ),
  shootdown: () => (
    <g>
      <g class="ev-cross-plane">
        <Plane />
      </g>
      <line
        class="ev-draw"
        x1="60"
        y1="150"
        x2="132"
        y2="52"
        stroke="#fff"
        stroke-width="2"
        stroke-dasharray="4 3"
        style={t(0.6)}
      />
      <Boom x={132} y={52} r={24} d={1.2} />
      <g class="ev-falling" style={t(1.4)}>
        <polygon points="128,52 140,58 136,64" fill="#555" />
      </g>
    </g>
  ),
  wall: () => (
    <g>
      {Array.from({ length: 24 }, (_, i) => {
        const r = Math.floor(i / 6),
          col = i % 6;
        return (
          <rect
            key={i}
            class="ev-brick"
            x={30 + col * 30 + (r % 2) * 15}
            y={40 + r * 22}
            width="28"
            height="20"
            fill={(i * 7) % 3 ? "#9c9a92" : "#b3b0a6"}
            stroke="#5a574f"
            style={
              {
                ...t(0.4 + ((i * 5) % 9) * 0.12),
                "--dx": `${((i * 13) % 9) - 4}px`,
                "--rot": `${((i * 37) % 60) - 30}deg`,
              } as Record<string, string>
            }
          />
        );
      })}
    </g>
  ),
  oil: () => (
    <g>
      {[60, 110, 160].map((x, i) => (
        <g key={x} class="ev-pop" style={t(0.2 + i * 0.2)}>
          <rect x={x} y="96" width="30" height="42" rx="3" fill="#2a2a2a" />
          <rect x={x} y="104" width="30" height="4" fill="#c9a227" />
          <rect x={x} y="124" width="30" height="4" fill="#c9a227" />
        </g>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          class="ev-drip"
          d={`M${50 + i * 20},20 q-5,9 0,12 q5,-3 0,-12z`}
          fill="#111"
          style={t(0.6 + i * 0.13)}
        />
      ))}
    </g>
  ),
  bomb: () => (
    <g>
      <g class="ev-pop" style={t(0.05)}>
        <circle cx="120" cy="85" r="22" fill="#2a2a2a" />
        <rect x="114" y="58" width="12" height="8" fill="#555" />
        <path
          d="M120,58 q6,-14 18,-12"
          fill="none"
          stroke="#8a7a5c"
          stroke-width="2"
        />
        <circle class="ev-spark" cx="138" cy="46" r="4" fill="#ffd34d" />
      </g>
      <rect
        class="ev-flash"
        width="240"
        height="150"
        fill="#fff"
        style={t(1.2)}
      />
      <Boom x={120} y={85} r={60} d={1.25} />
    </g>
  ),
  shield: (c) => (
    <g>
      <circle
        class="ev-wave-ring"
        cx="120"
        cy="75"
        r="30"
        fill="none"
        stroke="#f5d76e"
        stroke-width="3"
        style={t(0.6)}
      />
      <g class="ev-pop" style={t(0.15)}>
        <polygon
          points="120,28 156,40 152,90 120,122 88,90 84,40"
          fill={c}
          stroke="#f5d76e"
          stroke-width="4"
        />
        <polygon points="120,28 156,40 152,90 120,122" fill="#0003" />
        <polygon points={star(120, 72, 18)} fill="#f5d76e" />
      </g>
    </g>
  ),
  crosshair: () => (
    <g>
      <g class="ev-aim">
        <circle
          cx="120"
          cy="70"
          r="26"
          fill="none"
          stroke="#ff4a3a"
          stroke-width="2.5"
        />
        <circle cx="120" cy="70" r="3" fill="#ff4a3a" />
        <line
          x1="120"
          y1="34"
          x2="120"
          y2="56"
          stroke="#ff4a3a"
          stroke-width="2.5"
        />
        <line
          x1="120"
          y1="84"
          x2="120"
          y2="106"
          stroke="#ff4a3a"
          stroke-width="2.5"
        />
        <line
          x1="84"
          y1="70"
          x2="106"
          y2="70"
          stroke="#ff4a3a"
          stroke-width="2.5"
        />
        <line
          x1="134"
          y1="70"
          x2="156"
          y2="70"
          stroke="#ff4a3a"
          stroke-width="2.5"
        />
      </g>
      <rect
        class="ev-flash red"
        width="240"
        height="150"
        fill="#c8102e"
        style={t(1.5)}
      />
    </g>
  ),
  stamp: (_c, s) => (
    <g class="ev-slam" style={t(0.3)}>
      <g transform="rotate(-12 120 75)">
        <rect
          x="58"
          y="46"
          width="124"
          height="58"
          rx="6"
          fill="none"
          stroke="#c8102e"
          stroke-width="6"
        />
        <text x="120" y="91" class="ev-stamp-word">
          {s.word}
        </text>
      </g>
    </g>
  ),
  scoring: () => (
    <g>
      <rect
        class="ev-glow"
        width="240"
        height="150"
        fill="#f5d76e"
        style={t(0.1)}
      />
      {[
        [50, 100],
        [100, 70],
        [150, 105],
        [195, 75],
        [75, 130],
        [175, 135],
      ].map(([x, y], i) => (
        <g key={i} class="ev-float" style={t(0.25 + i * 0.18)}>
          <polygon
            points={star(x, y, 9)}
            fill="#f5d76e"
            stroke="#7d6418"
            stroke-width="1"
          />
        </g>
      ))}
      <text x="120" y="82" class="ev-vp ev-pop" style={t(1)}>
        VP
      </text>
    </g>
  ),
  light: () => (
    <g>
      <g class="ev-rays">
        {Array.from({ length: 12 }, (_, i) => (
          <polygon
            key={i}
            points="120,-10 112,-160 128,-160"
            transform={`translate(0,0) rotate(${i * 30} 120 -10)`}
            fill="#fff6c8"
            opacity="0.5"
          />
        ))}
      </g>
      <circle
        class="ev-glow"
        cx="120"
        cy="-10"
        r="60"
        fill="#fff8de"
        style={t(0.1)}
      />
    </g>
  ),
  flowers: () => (
    <g>
      {Array.from({ length: 16 }, (_, i) => {
        const x = 10 + ((i * 47) % 220),
          y = 20 + ((i * 31) % 110);
        const col = ["#f28ab2", "#ffd34d", "#9ad1f0", "#f5a623"][i % 4];
        return (
          <g key={i} class="ev-fall-spin" style={t((i % 8) * 0.17)}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx={x}
                cy={y - 5}
                rx="3"
                ry="5"
                fill={col}
                transform={`rotate(${a} ${x} ${y})`}
              />
            ))}
            <circle cx={x} cy={y} r="2.6" fill="#fff" />
          </g>
        );
      })}
    </g>
  ),
  ballot: (c) => (
    <g>
      <rect
        x="90"
        y="88"
        width="60"
        height="50"
        fill="#e9e3d2"
        stroke="#3a2f22"
        stroke-width="2"
      />
      <rect x="104" y="86" width="32" height="5" fill="#3a2f22" />
      <polygon points={star(120, 116, 9)} fill={c} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} class="ev-drop" style={t(0.2 + i * 0.35)}>
          <rect
            x="110"
            y="40"
            width="20"
            height="26"
            fill="#fff"
            stroke="#888"
          />
          <path
            d="M114,53 l4,4 l8,-9"
            stroke={c}
            stroke-width="2.4"
            fill="none"
          />
        </g>
      ))}
    </g>
  ),
  ships: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} class="ev-sail" style={t(i * 0.45)}>
          <g transform={`translate(0,${90 + i * 20})`}>
            <polygon points="0,0 46,0 40,10 6,10" fill="#4a5568" />
            <polygon points="14,0 14,-10 30,-10 30,0" fill="#6b7280" />
            <rect x="20" y="-18" width="3" height="8" fill="#374151" />
          </g>
        </g>
      ))}
    </g>
  ),
  missiles: (c) => (
    <g>
      <rect
        class="ev-siren"
        width="240"
        height="150"
        fill="#c8102e"
        style={t(1)}
      />
      {[50, 90, 120, 150, 190].map((x, i) => (
        <Missile key={x} x={x} d={0.15 + ((i * 3) % 5) * 0.18} c={c} />
      ))}
    </g>
  ),
  radar: () => (
    <g>
      <rect class="ev-dark" width="240" height="150" fill="#021a0c" />
      {[20, 40, 60].map((r) => (
        <circle
          key={r}
          cx="120"
          cy="75"
          r={r}
          fill="none"
          stroke="#3cff7a55"
          stroke-width="1.5"
        />
      ))}
      <g class="ev-sweep">
        <polygon points="120,75 120,10 160,22" fill="#3cff7a55" />
      </g>
      {[
        [90, 50],
        [160, 90],
        [130, 120],
      ].map(([x, y], i) => (
        <circle
          key={i}
          class="ev-blip"
          cx={x}
          cy={y}
          r="3.2"
          fill="#7cff9a"
          style={t(0.5 + i * 0.4)}
        />
      ))}
    </g>
  ),
  grain: () => (
    <g>
      {Array.from({ length: 11 }, (_, i) => {
        const x = 20 + i * 20;
        return (
          <g key={i} class="ev-grow" style={t(i * 0.07)}>
            <line
              x1={x}
              y1="150"
              x2={x + 2}
              y2="80"
              stroke="#b08d2e"
              stroke-width="2.4"
            />
            {[0, 1, 2, 3].map((k) => (
              <ellipse
                key={k}
                cx={x + 2 + (k % 2 ? 4 : -4)}
                cy={86 + k * 7}
                rx="3"
                ry="6"
                fill="#e8c14a"
                transform={`rotate(${k % 2 ? 30 : -30} ${x + 2} ${86 + k * 7})`}
              />
            ))}
          </g>
        );
      })}
    </g>
  ),
  bars: () => (
    <g class="ev-bars">
      <rect width="240" height="10" y="0" fill="#3a3a3a" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          x={14 + i * 27}
          y="0"
          width="7"
          height="150"
          fill="#3a3a3a"
        />
      ))}
    </g>
  ),
  gears: () => (
    <g>
      {[
        [95, 78, 30, 1],
        [148, 66, 20, -1.5],
      ].map(([x, y, r, k], i) => (
        <g
          key={i}
          class={k > 0 ? "ev-spin" : "ev-spin-rev"}
          style={{ transformOrigin: `${x}px ${y}px` }}
        >
          <polygon
            points={burst(x, y, r * 1.18, 10)
              .split(" ")
              .map((p, j) => (j % 2 ? p : p))
              .join(" ")}
            fill="#9a8b6a"
          />
          <circle cx={x} cy={y} r={r * 0.8} fill="#b9a982" />
          <circle cx={x} cy={y} r={r * 0.3} fill="#5a4c34" />
        </g>
      ))}
    </g>
  ),
  crowd: (c) => (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 18 + i * 26;
        return (
          <g key={i} class="ev-rise" style={t(0.1 + (i % 4) * 0.12)}>
            <g class="ev-bob" style={t((i % 3) * 0.2)}>
              <rect x={x - 1} y="84" width="2.4" height="30" fill="#3a2f22" />
              <rect
                x={x - 12}
                y="72"
                width="24"
                height="16"
                fill={i % 2 ? "#f3ecdb" : c}
                stroke="#3a2f22"
              />
            </g>
            <Person x={x} y={150} c="#3a2f22" d={0} cls="" />
          </g>
        );
      })}
    </g>
  ),
  trap: () => (
    <g>
      <g class="ev-jaw-top">
        <polygon
          points={`0,0 240,0 240,40 ${Array.from({ length: 12 }, (_, i) => `${240 - i * 20 - 10},62 ${240 - i * 20 - 20},40`).join(" ")}`}
          fill="#4a4a4a"
        />
      </g>
      <g class="ev-jaw-bot">
        <polygon
          points={`0,150 240,150 240,110 ${Array.from({ length: 12 }, (_, i) => `${240 - i * 20 - 10},88 ${240 - i * 20 - 20},110`).join(" ")}`}
          fill="#4a4a4a"
        />
      </g>
    </g>
  ),
  handshake: () => (
    <g>
      <circle
        class="ev-glow"
        cx="120"
        cy="80"
        r="44"
        fill="#fff6d8"
        style={t(0.9)}
      />
      <g class="ev-from-left">
        <polygon points="0,70 96,72 118,80 100,92 0,94" fill="#2f63b0" />
        <polygon points="96,72 122,74 128,84 112,92" fill="#e8c5a0" />
      </g>
      <g class="ev-from-right">
        <polygon points="240,66 144,70 122,80 140,90 240,92" fill="#c8102e" />
        <polygon points="144,70 116,76 112,86 130,90" fill="#d9b48c" />
      </g>
      {[0, 1, 2].map((i) => (
        <polygon
          key={i}
          class="ev-pop"
          points={star(100 + i * 20, 54 - (i % 2) * 8, 5)}
          fill="#f5d76e"
          style={t(1 + i * 0.12)}
        />
      ))}
    </g>
  ),
  coup: (c) => (
    <g>
      <g class="ev-tank">
        <polygon points="0,0 70,0 76,12 -6,12" fill="#5b6b3a" />
        <polygon points="14,-14 52,-14 58,0 8,0" fill="#6f7f48" />
        <rect x="52" y="-10" width="40" height="4" fill="#4a5830" />
        {[0, 1, 2, 3, 4].map((k) => (
          <circle key={k} cx={4 + k * 15} cy="15" r="5" fill="#2e3522" />
        ))}
      </g>
      <Flag x={190} y={80} c={c} d={1.3} s={1.8} />
    </g>
  ),
  purge: () => (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <Person
          key={i}
          x={30 + i * 30}
          y={130}
          c="#e9dfc7"
          d={0.3 + i * 0.22}
          cls="ev-vanish"
        />
      ))}
    </g>
  ),
  quake: () => (
    <g class="ev-shake">
      {[
        "M120,0 l-8,30 l14,22 l-12,30 l10,26 l-6,42",
        "M0,80 l40,6 l20,-10 l30,12",
        "M240,60 l-40,10 l-22,-8 l-30,16",
        "M60,150 l14,-34 l-10,-20",
      ].map((d, i) => (
        <path
          key={i}
          class="ev-draw"
          d={d}
          fill="none"
          stroke="#1b1712"
          stroke-width="3.4"
          stroke-linejoin="bevel"
          style={t(0.2 + i * 0.25)}
        />
      ))}
      <rect
        class="ev-siren"
        width="240"
        height="150"
        fill="#000"
        style={t(1)}
      />
    </g>
  ),
  star: () => (
    <g>
      <g class="ev-spin-slow" style={{ transformOrigin: "120px 75px" }}>
        <polygon points={burst(120, 75, 70, 14)} fill="#ffe08a55" />
      </g>
      <polygon
        class="ev-pop"
        points={star(120, 75, 30)}
        fill="#f5d76e"
        stroke="#7d6418"
        stroke-width="2"
        style={t(0.2)}
      />
    </g>
  ),
};

export function eventSpec(card: number): Spec {
  return FX[card] ?? { fx: "star", cap: CARDS[card].zh };
}

/** 事件动画舞台：点击重播 */
export function EventStage({ card, side }: { card: number; side: Side }) {
  const spec = eventSpec(card);
  const owner = CARDS[card].side;
  const c = COL[owner === "NEUTRAL" ? side : owner];
  const n = 0;
  useEffect(() => {
    const s = SOUND[spec.fx];
    if (!s) return;
    const tm = setTimeout(() => sfx(s), 350);
    return () => clearTimeout(tm);
  }, [n, card]);
  return (
    <div
      class={`event-stage ev-${spec.fx}`}
      key={n}
    >
      <svg viewBox="0 0 240 150" preserveAspectRatio="xMidYMid slice">
        <g class="es-art" dangerouslySetInnerHTML={{ __html: cardArt(card) }} />
        <rect class="es-dim" width="240" height="150" fill="#000" />
        <g class="es-fx">{MOTIFS[spec.fx](c, spec)}</g>
      </svg>
      <div class="es-cap">{spec.cap}</div>
    </div>
  );
}
