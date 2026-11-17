export interface SpaceBox {
  name: string;
  ops: number;
  /** 掷出 ≤ roll 成功 */
  roll: number;
  vp: [number, number];
  perk?: string;
}

/** 下标 1..8 */
export const SPACE: SpaceBox[] = [
  { name: '起点', ops: 0, roll: 0, vp: [0, 0] },
  { name: '人造卫星', ops: 2, roll: 3, vp: [2, 1] },
  { name: '动物进入太空', ops: 2, roll: 4, vp: [0, 0], perk: '每回合可进行 2 次太空竞赛' },
  { name: '载人航天', ops: 2, roll: 3, vp: [2, 0] },
  { name: '载人环绕地球', ops: 2, roll: 4, vp: [0, 0], perk: '对手须先公开头条' },
  { name: '绕月飞行', ops: 3, roll: 3, vp: [3, 1] },
  { name: '登月', ops: 3, roll: 4, vp: [0, 0], perk: '回合末可弃 1 张保留的手牌' },
  { name: '航天飞机', ops: 3, roll: 3, vp: [4, 2] },
  { name: '空间站', ops: 4, roll: 2, vp: [2, 0], perk: '每回合可进行 8 个行动轮' },
];
