// 卡牌标记图形：地图国家方框下沿和卡面标题共用（局部坐标，半径 7 的圆章；配色由 .c-<种类> 的 CSS 决定）。
import type { CardKind } from './countryCards';
import { STAR_PTS } from './SubBadge';

/** 标记图形本体 */
export function MarkGlyph({ k }: { k: CardKind }) {
  switch (k) {
    case 'bolt':
      return (<><circle r="7" /><polygon points="1,-6 -3.5,1 0,1 -1,6 3.5,-1 0,-1" /></>);
    case 'war':
      return (
        <>
          <circle r="7" />
          <g class="war-guns">
            {[-40, 40].map((r) => (
              <g key={r} transform={`rotate(${r})`}>
                <rect x="-0.55" y="-5.8" width="1.1" height="6.4" rx="0.3" />
                <path d="M-0.9,0.2 L0.9,0.2 L1.5,4.2 L1.8,5.6 L-1.3,5.6 L-1,3.6Z" class="wg-stock" />
              </g>
            ))}
          </g>
        </>
      );
    case 'score':
      return (<><circle r="7" /><path class="cr-body" d="M-4.6,3 L-5,-2.6 L-2.4,-0.4 L0,-4.2 L2.4,-0.4 L5,-2.6 L4.6,3Z" /></>);
    case 'missile':
      return (
        <>
          <circle r="7" />
          <g transform="rotate(45)">
            <path class="ms-body" d="M0,-5.6 C1.3,-4.4 1.5,-2.8 1.5,-1.6 L1.5,3 L-1.5,3 L-1.5,-1.6 C-1.5,-2.8 -1.3,-4.4 0,-5.6Z" />
            <path class="ms-fin" d="M-1.5,1 L-3.2,4.4 L-1.5,3.6Z M1.5,1 L3.2,4.4 L1.5,3.6Z" />
            <path class="ms-flame" d="M-1,3.2 L0,5.8 L1,3.2Z" />
          </g>
        </>
      );
    case 'reds':
      // 黑红旗：左侧黑色竖条配白星，右侧红底中间一道黄带
      return (
        <>
          <clipPath id="mk-clip"><circle r="7" /></clipPath>
          <g clip-path="url(#mk-clip)">
            <rect x="-7" y="-7" width="14" height="14" fill="#d42a1e" />
            <rect x="-7" y="-1.8" width="14" height="3.6" fill="#f2c230" />
            <rect x="-7" y="-7" width="5" height="14" fill="#111" />
            <polygon points="1.2,0 -2.4,-1.3 -3.2,0 -2.4,1.3" fill="#fff" />
          </g>
          <circle r="7" class="mk-rim" />
        </>
      );
    case 'tent':
      return (
        <>
          <circle r="7" />
          <path class="tn-body" d="M-5.4,4.2 L0,-4.8 L5.4,4.2Z" />
          <path class="tn-door" d="M-1.4,4.2 L0,0.6 L1.4,4.2Z" />
          <path class="tn-pole" d="M0,-4.8 L0,-6.2" />
        </>
      );
    case 'wall':
      return (
        <>
          <circle r="7" />
          <g class="wl-bricks">
            <rect x="-5" y="-3.6" width="4.6" height="2.2" /><rect x="0.4" y="-3.6" width="4.6" height="2.2" />
            <rect x="-5" y="-1.1" width="2.2" height="2.2" /><rect x="-2.4" y="-1.1" width="4.8" height="2.2" /><rect x="2.8" y="-1.1" width="2.2" height="2.2" />
            <rect x="-5" y="1.4" width="4.6" height="2.2" /><rect x="0.4" y="1.4" width="4.6" height="2.2" />
          </g>
        </>
      );
    case 'oil':
      return (<><circle r="7" /><path d="M0,-4.6 C2.6,-1.2 3.6,0.6 3.6,1.9 A3.6,3.6 0 0 1 -3.6,1.9 C-3.6,0.6 -2.6,-1.2 0,-4.6Z" /></>);
    case 'muslim':
      return (<><circle r="7" /><path d="M1.8,-4.6 A4.8,4.8 0 1 0 1.8,4.6 A3.8,3.8 0 1 1 1.8,-4.6Z" /></>);
    case 'canal':
      return (<><circle r="7" /><path class="cn-wave" d="M-4.6,-2.2 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0 M-4.6,1 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0 M-4.6,4.2 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0" /></>);
    case 'portugal':
      // 葡萄牙国旗配色：左绿右红，交界处一个金色圆环
      return (
        <>
          <clipPath id="mk-clip-pt"><circle r="7" /></clipPath>
          <g clip-path="url(#mk-clip-pt)">
            <rect x="-7" y="-7" width="14" height="14" fill="#d42a1e" />
            <rect x="-7" y="-7" width="5.6" height="14" fill="#1f7a3a" />
          </g>
          <circle cx="-1.4" cy="0" r="2.3" class="pt-ring" />
          <circle r="7" class="mk-rim" />
        </>
      );
    case 'kal':
      // 下坠的客机：白底蓝描边，机头朝左下，后面拖两道下落线
      return (
        <>
          <circle r="7" />
          <path class="kl-trail" d="M2.6,-5.8 L4.6,-3.4 M0.6,-6.2 L2.2,-4.4" />
          <g transform="rotate(-135)">
            <path class="kl-plane" d="M0,-5.2 C0.7,-5.2 0.9,-4.4 0.9,-3.6 L0.9,-1 L5,1.6 L5,2.6 L0.9,1.4 L0.7,3.6 L2.2,4.6 L2.2,5.3 L0,4.8 L-2.2,5.3 L-2.2,4.6 L-0.7,3.6 L-0.9,1.4 L-5,2.6 L-5,1.6 L-0.9,-1 L-0.9,-3.6 C-0.9,-4.4 -0.7,-5.2 0,-5.2Z" />
          </g>
        </>
      );
    case 'leaderUs':
    case 'leader':
      // 人物：低多边形半身像——几何切面的头部、侧分发型、立领西装与领带，阵营色由 CSS 决定
      return (
        <>
          <circle r="7" />
          <polygon class="ld-b" points="-4.9,6.4 -4.2,3.2 -1.6,2 0,3.4 1.6,2 4.2,3.2 4.9,6.4" />
          <polygon class="ld-a" points="-4.9,6.4 -4.2,3.2 -1.6,2 0,3.4 0,6.4" />
          <polygon class="ld-c" points="-1.6,2 0,3.4 1.6,2 0.9,1.6 0,2.2 -0.9,1.6" />
          <polygon class="ld-b" points="-0.5,3.4 0.5,3.4 0.8,6.4 -0.8,6.4" />
          <polygon class="ld-a" points="-1,1.7 1,1.7 0.8,0.9 -0.8,0.9" />
          <polygon class="ld-a" points="-2.4,-2.6 -2.2,0 -0.9,1.3 0.9,1.3 2.2,0 2.4,-2.6 0,-3.4" />
          <polygon class="ld-b" points="0,-3.4 2.4,-2.6 2.2,0 0.9,1.3 0,1.3" />
          <polygon class="ld-h" points="-2.7,-2.2 -2.6,-4 -1.2,-5.2 1.2,-5.3 2.6,-4.2 2.7,-2.4 1.6,-3.6 -0.8,-3.2" />
        </>
      );
    case 'scepter':
      // 罗马尼亚国王退位：偏红底，顶着小王冠的权杖从中间折断，两截错开
      return (
        <>
          <circle r="7" />
          <g transform="rotate(-30)">
            <polygon class="sc-crown" points="-1.8,-4.4 -1.8,-6.2 -0.9,-5.2 0,-6.6 0.9,-5.2 1.8,-6.2 1.8,-4.4" />
            <polygon class="sc-rod" points="-0.8,-4.4 0.8,-4.4 0.8,-0.9 0.1,-0.3 -0.6,-1.1 -0.8,-0.5" />
          </g>
          <g transform="translate(1.6,1.2) rotate(-12)">
            <polygon class="sc-rod" points="-0.8,0.3 -0.1,-0.4 0.4,0.4 0.8,-0.1 0.8,4.6 -0.8,4.6" />
            <circle cx="0" cy="5.1" r="1" class="sc-crown" />
          </g>
          <path class="sc-crack" d="M-2.6,-0.6 L-1.4,0.1 M2.6,-1.2 L3.6,-1.8 M-0.4,1.8 L-1.2,2.8" />
        </>
      );
    case 'shake':
      // 英美特殊关系：两只手相握，一蓝袖一红袖
      return (
        <>
          <circle r="7" />
          <path class="sh-cuff-a" d="M-6,-1.2 L-3.6,-2.6 L-2.4,-0.4 L-4.8,1Z" />
          <path class="sh-cuff-b" d="M6,-1.2 L3.6,-2.6 L2.4,-0.4 L4.8,1Z" />
          <path class="sh-hand" d="M-3.2,-1.6 L-0.6,-3 L1.8,-2.2 L3.2,-1.4 L2.6,0.2 L1.4,1.8 L-0.6,2.6 L-2.2,1.6 L-3,0.2Z" />
          <path class="sh-line" d="M-0.6,-0.8 L1.6,-1.6 M-0.8,0.6 L1.4,-0.2 M-0.6,1.8 L0.9,1.2" />
        </>
      );
    case 'suez':
      // 苏伊士运河危机：暗红底，两岸之间的河道里一艘货轮
      return (
        <>
          <circle r="7" />
          <path class="sz-bank" d="M-7,-2.2 L-2.2,-2.2 L-1.4,-7 M7,-2.2 L2.2,-2.2 L1.4,-7" />
          <path class="sz-water" d="M-5.6,3.6 q1.4,-1 2.8,0 t2.8,0 t2.8,0 t2.8,0" />
          <path class="sz-hull" d="M-4.4,0.2 L4.6,0.2 L3.4,2.6 L-3.4,2.6Z" />
          <rect class="sz-deck" x="-2.8" y="-2.2" width="3.6" height="2.4" />
          <rect class="sz-stack" x="1.4" y="-3.4" width="1.3" height="3.6" />
        </>
      );
    case 'usjp':
      // 美日共同防御：左半蓝底半颗白星，右半白底半个红日，在中线拼成一个
      return (
        <>
          <clipPath id="mk-clip-l"><rect x="-8" y="-8" width="8" height="16" /></clipPath>
          <clipPath id="mk-clip-r"><rect x="0" y="-8" width="8" height="16" /></clipPath>
          <circle r="7" class="uj-us" clip-path="url(#mk-clip-l)" />
          <circle r="7" class="uj-jp" clip-path="url(#mk-clip-r)" />
          <polygon points={STAR_PTS(0, 0.4, 4.6)} class="uj-star" clip-path="url(#mk-clip-l)" />
          <circle r="3.6" class="uj-sun" clip-path="url(#mk-clip-r)" />
          <circle r="7" class="mk-rim uj-rim" />
        </>
      );
    case 'fist':
      // 越南起义：红框，拳头握住竹竿高举，竿头一面小旗
      return (
        <>
          <circle r="7" />
          <path class="fs-pole" d="M0.6,6.4 L0.6,-6" />
          <path class="fs-flag" d="M0.6,-6 L5,-4.8 L0.6,-3.4Z" />
          <path class="fs-hand" d="M-2.8,0.4 C-2.8,-1.4 -1.6,-2 -0.4,-1.9 L2.2,-1.9 C3,-1.9 3.2,-1 2.6,-0.6 L2.6,1.6 C2.6,2.8 1.6,3.4 0.4,3.4 L-1.6,3.4 L-2,5.8 L-4,5.8 L-3.4,2.8 C-3.2,2 -2.8,1.4 -2.8,0.4Z" />
          <path class="fs-knuckle" d="M-1.6,-1.8 L-1.6,0 M-0.2,-1.9 L-0.2,0 M1.2,-1.9 L1.2,0" />
        </>
      );
    case 'ship':
      // 台湾决议：蓝底军舰侧影——舰桥、主炮、桅杆，下面一道浪线
      return (
        <>
          <circle r="7" />
          <path class="sh-hull" d="M-5.8,1 L5.8,1 L4.4,3.2 L-4.6,3.2Z" />
          <path class="sh-top" d="M-2.6,1 L-2.6,-1 L-0.6,-1 L-0.6,-2.8 L1.2,-2.8 L1.2,-1 L2.6,-1 L2.6,1Z" />
          <path class="sh-gun" d="M-2.6,0 L-5.2,-0.8 M2.6,0 L4.8,-0.6" />
          <path class="sh-mast" d="M0.3,-2.8 L0.3,-5.2 M-0.8,-4.4 L1.4,-4.4" />
          <path class="sh-wave" d="M-5,4.8 q1.25,-0.9 2.5,0 t2.5,0 t2.5,0 t2.5,0" />
        </>
      );
    case 'hostage':
      // 伊朗人质危机：革命前的伊朗旗——绿白红三横条，中间一轮小金日
      return (
        <>
          <clipPath id="mk-clip-ir"><circle r="7" /></clipPath>
          <g clip-path="url(#mk-clip-ir)">
            <rect x="-7" y="-7" width="14" height="4.7" fill="#239f40" />
            <rect x="-7" y="-2.3" width="14" height="4.6" fill="#f8f8f4" />
            <rect x="-7" y="2.3" width="14" height="4.7" fill="#da0000" />
          </g>
          <circle r="1.5" class="ir-sun" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => <path key={r} d="M0,-1.9 L0,-2.6" transform={`rotate(${r})`} class="ir-ray" />)}
          <circle r="7" class="mk-rim" />
        </>
      );
    case 'unrest':
      // 南非动乱：深色底，火苗 + 上方两团灰烟
      return (
        <>
          <circle r="7" />
          <circle cx="-1.8" cy="-4" r="1.9" class="ur-smoke" />
          <circle cx="1" cy="-4.8" r="2.2" class="ur-smoke" />
          <path class="ur-fire" d="M0,5.6 C-3.4,5.6 -4,2.4 -2.6,0.2 C-2.2,1.6 -1.4,2 -1,1.8 C-1.6,-0.6 -0.4,-2.4 1,-3 C0.6,-1.4 1.6,-0.6 2.4,0.4 C3.6,1.8 3.4,5.6 0,5.6Z" />
          <path class="ur-core" d="M0,5.2 C-1.6,5.2 -1.8,3.6 -1,2.6 C-0.6,3.2 0,3.2 0.2,2.6 C0.4,1.8 1,1.6 1.4,2.2 C2,3.2 1.6,5.2 0,5.2Z" />
        </>
      );
    case 'solidarity':
      // 团结工会：蓝框，三个并肩的人举起一面横幅（自绘，不用工会标志字体）
      return (
        <>
          <circle r="7" />
          <rect x="-5" y="-5.4" width="10" height="2.6" rx="0.4" class="so-banner" />
          <path class="so-arm" d="M-3.6,-2.8 L-3.6,-0.6 M3.6,-2.8 L3.6,-0.6" />
          {[-3.4, 0, 3.4].map((x) => (
            <g key={x}>
              <circle cx={x} cy="0.4" r="1.25" class="so-head" />
              <path d={`M${x - 1.7},5.6 C${x - 1.6},2.8 ${x + 1.6},2.8 ${x + 1.7},5.6Z`} class="so-body" />
            </g>
          ))}
        </>
      );
    case 'chain':
      // 封锁：两条黑色铁链交叉，框偏橙褐
      return (
        <>
          <circle r="7" />
          {[-45, 45].map((r) => (
            <g key={r} transform={`rotate(${r})`}>
              <rect x="-1.3" y="-5.6" width="2.6" height="4.2" rx="1.3" class="ch-link" />
              <rect x="-1.3" y="-1.9" width="2.6" height="3.8" rx="1.3" class="ch-link" />
              <rect x="-1.3" y="1.4" width="2.6" height="4.2" rx="1.3" class="ch-link" />
            </g>
          ))}
        </>
      );
    case 'awacs':
      // 向沙特出售预警机：沙色底，背着雷达圆盘的预警机俯视剪影
      return (
        <>
          <circle r="7" />
          <path class="aw-plane" d="M0,-5.6 C0.7,-5.6 0.9,-4.6 0.9,-3.6 L0.9,-1.2 L5.6,1.2 L5.6,2.2 L0.9,1.2 L0.7,3.6 L2.2,4.6 L2.2,5.2 L0,4.8 L-2.2,5.2 L-2.2,4.6 L-0.7,3.6 L-0.9,1.2 L-5.6,2.2 L-5.6,1.2 L-0.9,-1.2 L-0.9,-3.6 C-0.9,-4.6 -0.7,-5.6 0,-5.6Z" />
          <ellipse cx="0" cy="-0.4" rx="2.6" ry="1.2" class="aw-dome" />
        </>
      );
    case 'radar':
      // 北美防空司令部：深绿底雷达屏，扫描扇区 + 两个光点
      return (
        <>
          <circle r="7" />
          <circle r="4.6" class="rd-ring" />
          <circle r="2.3" class="rd-ring" />
          <path class="rd-sweep" d="M0,0 L0,-6 A6,6 0 0 1 5.2,-3Z" />
          <circle cx="2.4" cy="2.2" r="0.8" class="rd-dot" />
          <circle cx="-3" cy="-1.4" r="0.7" class="rd-dot" />
        </>
      );
    case 'lady':
      // 铁娘子：蓝框，蓬松短发的女性侧影 + 珍珠项链
      return (
        <>
          <circle r="7" />
          <path class="ly-hair" d="M-3.6,-0.6 C-4.4,-4.4 -1.8,-6.4 0.8,-6 C3.4,-5.6 4.4,-3.4 3.8,-0.8 C3.4,0.6 2.6,1 2.2,0.6 L2.2,-1.6 C1.2,-2.6 -1.4,-2.8 -2.2,-1.4 L-2.4,0.8 C-3,0.8 -3.4,0.2 -3.6,-0.6Z" />
          <path class="ly-face" d="M-2.2,-1.4 C-1.4,-2.8 1.2,-2.6 2.2,-1.6 L2.2,0.6 C1.8,1.8 1,2.4 0,2.4 C-1,2.4 -1.8,1.8 -2.2,0.8Z" />
          <path class="ly-suit" d="M-4.8,5.8 C-4.6,3.6 -2.8,2.6 -1,2.4 L0,3.4 L1,2.4 C2.8,2.6 4.6,3.6 4.8,5.8Z" />
          <path class="ly-pearl" d="M-1.2,2.9 Q0,3.9 1.2,2.9" />
        </>
      );
    case 'pope':
      // 教皇：低多边形主教冠 + 脸 + 披肩，蓝框
      return (
        <>
          <circle r="7" />
          <polygon class="pp-mitre" points="0,-6.2 2.6,-3.6 2.2,-1.4 -2.2,-1.4 -2.6,-3.6" />
          <polygon class="pp-mitre-dark" points="0,-6.2 2.6,-3.6 0,-2.6" />
          <path class="pp-cross" d="M0,-5 L0,-2.6 M-0.9,-4 L0.9,-4" />
          <polygon class="pp-face" points="-1.9,-1.4 1.9,-1.4 1.5,1 0,1.8 -1.5,1" />
          <polygon class="pp-robe" points="-4.8,5.6 -3.6,2.2 0,1.6 3.6,2.2 4.8,5.6" />
          <polygon class="pp-robe-dark" points="0,1.6 3.6,2.2 4.8,5.6 0,5.6" />
        </>
      );
    default: {
      // 新增标记种类时忘了画图形会在这里报类型错误
      const missing: never = k;
      return missing;
    }
  }
}
