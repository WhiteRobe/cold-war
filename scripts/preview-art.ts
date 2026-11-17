// 生成卡牌插画预览页：npx tsx scripts/preview-art.ts → dist-art/preview.html
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CARD_LIST } from '../src/data';
import { SAMPLES, cardArt } from '../src/art';

const svg = (id: number) => `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg">${cardArt(id)}</svg>`;
const tile = (id: number) => {
  const c = CARD_LIST.find((x) => x.id === id)!;
  const color = c.side === 'US' ? '#2f5d8a' : c.side === 'USSR' ? '#b23a2e' : '#8a7f6a';
  return `<figure><div class="art">${svg(id)}</div><figcaption style="border-top:4px solid ${color}">#${id} ${c.zh}<small>${c.name}</small></figcaption></figure>`;
};
const all = CARD_LIST.map((c) => cardArt(c.id)).join('');
const raw = Buffer.byteLength(all), gz = gzipSync(all).length;
const html = `<!doctype html><meta charset="utf-8"><title>冷战热斗 · 卡牌插画预览</title>
<style>body{background:#1f2328;color:#e9dfc7;font-family:system-ui,sans-serif;margin:24px}h2{font-weight:500}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
figure{margin:0;background:#2b2f35;border-radius:6px;overflow:hidden}.art svg{display:block;width:100%;height:auto}
figcaption{padding:6px 8px;font-size:13px}small{display:block;opacity:.6;font-size:11px}</style>
<h1>卡牌插画预览</h1><p>原始 ${(raw / 1024).toFixed(1)} KB，gzip ${(gz / 1024).toFixed(1)} KB</p>
<h2>样板 10 张</h2><div class="grid">${SAMPLES.map(tile).join('')}</div>
<h2>全部 110 张</h2><div class="grid">${CARD_LIST.map((c) => tile(c.id)).join('')}</div>`;
mkdirSync('dist-art', { recursive: true });
writeFileSync('dist-art/preview.html', html);
console.log(`dist-art/preview.html 已生成：原始 ${(raw / 1024).toFixed(1)} KB，gzip ${(gz / 1024).toFixed(1)} KB`);
