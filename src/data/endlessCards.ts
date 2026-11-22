// 不死不休专属卡（第 11 回合进入不死不休时洗进牌库）。原创内容，与 GMT 无关。
import type { CardDef } from './types';

const card = (id: number, zh: string, name: string, side: CardDef['side'], ops: number, starred: boolean, text: string, textEn: string): CardDef => ({
  id, name, zh, side, ops, era: 'late', starred, ongoing: false, scoring: false, war: false, optional: false, text, textEn, endless: true,
});

export const ENDLESS_CARDS: CardDef[] = [
  card(111, '日美贸易摩擦', 'US-Japan Trade Friction', 'USSR', 3, true,
    '取消「美日共同防卫协定」：苏联从此可以对日本政变或调整阵营。日本的美国影响力 -1。',
    'Cancel the US/Japan Mutual Defense Pact: the USSR may now coup or realign Japan. Remove 1 US Influence from Japan.'),
  card(112, '中苏友好条约', 'Sino-Soviet Friendship Treaty', 'USSR', 2, true,
    '苏联在中国放置 2 点影响力；若苏联控制蒙古，再放 1 点。',
    'Add 2 USSR Influence to China; +1 more if the USSR controls Mongolia.'),
  card(113, '太平洋同盟', 'Pacific Alliance', 'US', 3, true,
    '美国在日本、澳大利亚、菲律宾各放置 1 点影响力。',
    'Add 1 US Influence to each of Japan, Australia and the Philippines.'),
  card(114, '联合国维和行动', 'UN Peacekeeping', 'NEUTRAL', 3, false,
    '在没有被任何一方控制的洲里，移除对手共 3 点影响力，每国最多 1 点。',
    'Remove a total of 3 opponent Influence, no more than 1 per country, from regions not controlled by either side.'),
];
