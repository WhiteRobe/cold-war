// 太空竞赛成果：每推进一格，就在本土的空地上多摆一件“装备”（卫星、火箭、登月旗……），新到的一件弹出亮一下。
import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Side } from '../../data';
import { SPACE } from '../../engine/space';
import type { GameView } from '../../engine/view';

/** 每件装备的图形（局部坐标约 -8..8，白 / 金两色） */
const GLYPH: Record<number, JSX.Element> = {
  // 1 人造卫星：球体 + 四根天线
  1: (
    <g>
      <path d="M-2,1.5 L-7.5,6.5 M-0.5,2.6 L-4,7.8 M1.4,2.2 L0.2,8 M2.4,1 L4.6,7" class="sa-line" />
      <circle cx="0" cy="-1" r="3.6" class="sa-fill" />
      <path d="M-1.6,-2.6 A2,2 0 0 1 0.6,-3.2" class="sa-hi" />
    </g>
  ),
  // 2 动物进入太空：舷窗里的爪印
  2: (
    <g>
      <circle r="6.4" class="sa-ring" />
      <ellipse cx="0" cy="1.6" rx="2.4" ry="2" class="sa-fill" />
      <circle cx="-2.7" cy="-1.4" r="1.05" class="sa-fill" />
      <circle cx="-0.9" cy="-3" r="1.05" class="sa-fill" />
      <circle cx="1.1" cy="-3" r="1.05" class="sa-fill" />
      <circle cx="2.8" cy="-1.4" r="1.05" class="sa-fill" />
    </g>
  ),
  // 3 载人航天：竖立的火箭
  3: (
    <g>
      <path d="M0,-8 C2.4,-5.6 2.6,-2.4 2.6,0 L2.6,4.2 L-2.6,4.2 L-2.6,0 C-2.6,-2.4 -2.4,-5.6 0,-8Z" class="sa-fill" />
      <circle cx="0" cy="-2.4" r="1.1" class="sa-dark" />
      <path d="M-2.6,1 L-5,5.6 L-2.6,4.6Z M2.6,1 L5,5.6 L2.6,4.6Z" class="sa-gold" />
      <path d="M-1.6,4.4 L0,8 L1.6,4.4Z" class="sa-flame" />
    </g>
  ),
  // 4 载人环绕地球：地球 + 倾斜轨道上的飞船
  4: (
    <g>
      <circle r="3.8" class="sa-fill" />
      <path d="M-3,-1 Q0,0.6 3.2,-1.4 M-3.4,1.6 Q0,3 2.6,1.4" class="sa-dark-line" />
      <ellipse rx="7.4" ry="2.6" transform="rotate(-24)" class="sa-orbit" />
      <circle cx="6.2" cy="-3.6" r="1.3" class="sa-gold" />
    </g>
  ),
  // 5 绕月飞行：月牙 + 虚线绕行轨迹
  5: (
    <g>
      <path d="M1.5,-5 A5,5 0 1 0 1.5,5 A3.8,3.8 0 1 1 1.5,-5Z" class="sa-fill" />
      <path d="M-7,3 A8,8 0 0 1 6,-5.4" class="sa-orbit" />
      <circle cx="6" cy="-5.4" r="1.2" class="sa-gold" />
    </g>
  ),
  // 6 登月：月面 + 插旗
  6: (
    <g>
      <path d="M-7.5,6 Q0,1.6 7.5,6Z" class="sa-fill" />
      <circle cx="-3.5" cy="4.8" r="0.7" class="sa-dark" />
      <circle cx="3" cy="4.4" r="0.6" class="sa-dark" />
      <path d="M-0.6,3.4 L-0.6,-7" class="sa-line" />
      <path d="M-0.6,-7 L5,-5.6 L-0.6,-4Z" class="sa-gold" />
    </g>
  ),
  // 7 航天飞机：三角翼机身
  7: (
    <g transform="rotate(-35)">
      <path d="M0,-8 C1.6,-6.4 1.9,-3.6 1.9,-1 L6,4 L6,5.6 L1.9,4.4 L1.4,6 L-1.4,6 L-1.9,4.4 L-6,5.6 L-6,4 L-1.9,-1 C-1.9,-3.6 -1.6,-6.4 0,-8Z" class="sa-fill" />
      <path d="M-0.9,-4.6 L0.9,-4.6 L0.7,-3.4 L-0.7,-3.4Z" class="sa-dark" />
      <path d="M-1,6.2 L0,8.4 L1,6.2Z" class="sa-flame" />
    </g>
  ),
  // 8 空间站：中央舱段 + 两侧太阳能板
  8: (
    <g>
      <rect x="-7.6" y="-3" width="4.4" height="6" class="sa-gold" />
      <rect x="3.2" y="-3" width="4.4" height="6" class="sa-gold" />
      <path d="M-5.4,-3 L-5.4,3 M5.4,-3 L5.4,3" class="sa-dark-line" />
      <path d="M-3.2,0 L3.2,0" class="sa-line" />
      <rect x="-1.8" y="-4" width="3.6" height="8" rx="1.2" class="sa-fill" />
    </g>
  ),
};

/** 摆放位置（地图坐标）：美国放在本土徽章上方的蓝色国土里，苏联放在西伯利亚、徽章右侧 */
const SLOTS: Record<Side, (i: number) => [number, number]> = {
  US: (i) => [60 + (i % 4) * 24, 228 + Math.floor(i / 4) * 26],
  USSR: (i) => [1262 + i * 30, 146],
};

interface SpacePop { key: number; side: Side; kind: 'vp' | 'gain' | 'lose'; text: string; sub?: string; at: [number, number] }
let popSeq = 0;

export function SpaceArsenal({ view, home }: { view: GameView; home: Record<Side, [number, number]> }) {
  const prev = useRef(view.space);
  const [fresh, setFresh] = useState<{ side: Side; n: number; key: number } | null>(null);
  const [pops, setPops] = useState<SpacePop[]>([]);
  useEffect(() => {
    const p = prev.current;
    prev.current = view.space;
    const add: SpacePop[] = [];
    for (const side of ['US', 'USSR'] as const) {
      const from = p[side], to = view.space[side];
      if (to <= from) continue;
      const f = { side, n: to, key: Date.now() };
      setFresh(f);
      setTimeout(() => setFresh((cur) => (cur === f ? null : cur)), 2400);
      const other: Side = side === 'US' ? 'USSR' : 'US';
      const name = side === 'US' ? '美国' : '苏联';
      // 得分：先到拿高分、后到拿低分（引擎只按最后到达的那格给分）
      const box = SPACE[to];
      const vp = p[other] >= to ? box.vp[1] : box.vp[0];
      // 不死不休：太空竞赛不给 VP，成功发射改为弃一抽一
      if (view.flags.endlessWorld) add.push({ key: ++popSeq, side, kind: 'vp', text: '可弃一抽一', at: SLOTS[side](to - 1) });
      else if (vp) add.push({ key: ++popSeq, side, kind: 'vp', text: `+${vp} VP`, at: SLOTS[side](to - 1) });
      for (let n = from + 1; n <= to; n++) {
        const b = SPACE[n];
        if (!b.perk) continue;
        // 先到这一格：获得特权；对手早已到达：对手的特权就此失效
        if (p[other] < n) add.push({ key: ++popSeq, side, kind: 'gain', text: `${name}获得特权：${b.name}`, sub: b.perk, at: home[side] });
        else if (p[other] >= n && from < n) add.push({ key: ++popSeq, side: other, kind: 'lose', text: `${other === 'US' ? '美国' : '苏联'}的特权失效：${b.name}`, sub: `${name}也到达了这一格`, at: home[other] });
      }
    }
    if (!add.length) return;
    setPops((cur) => [...cur, ...add]);
    const keys = new Set(add.map((x) => x.key));
    setTimeout(() => setPops((cur) => cur.filter((x) => !keys.has(x.key))), 5200);
  }, [view.space.US, view.space.USSR]);
  return (
    <g class="space-arsenal">
      {(['US', 'USSR'] as const).map((side) =>
        Array.from({ length: view.space[side] }, (_, k) => {
          const n = k + 1;
          const [x, y] = SLOTS[side](k);
          const box = SPACE[n];
          const isNew = fresh?.side === side && fresh.n === n;
          return (
            <g key={`${side}${n}${isNew ? fresh!.key : ''}`} transform={`translate(${x},${y})`}>
              <g class={`sa-item sa-${side.toLowerCase()}${isNew ? ' new' : ''}`}>
                <title>
                  {side === 'US' ? '美国' : '苏联'}太空竞赛第 {n} 格：{box.name}
                  {box.perk ? `（${box.perk}）` : ''}
                </title>
                <circle r="11" class="sa-bg" />
                {GLYPH[n]}
              </g>
            </g>
          );
        }),
      )}
      {pops.map((pp, i) =>
        pp.kind === 'vp' ? (
          <text key={pp.key} x={pp.at[0]} y={pp.at[1] - 16} class={`sa-vp sa-${pp.side.toLowerCase()}`}>{pp.text}</text>
        ) : (
          <g key={pp.key} transform={`translate(${pp.at[0]},${pp.at[1] - 96 - (i % 2) * 52})`}>
           <g class={`sa-pop ${pp.kind} sa-${pp.side.toLowerCase()}`}>
            <rect x={-Math.max(pp.text.length, (pp.sub ?? '').length) * 7 - 14} y="-20" width={Math.max(pp.text.length, (pp.sub ?? '').length) * 14 + 28} height="44" rx="8" class="sp-panel" />
            <text y="-2" class="sp-title">{pp.kind === 'gain' ? '🚀 ' : '⚠ '}{pp.text}</text>
            <text y="16" class="sp-sub">{pp.sub}</text>
           </g>
          </g>
        ),
      )}
    </g>
  );
}
