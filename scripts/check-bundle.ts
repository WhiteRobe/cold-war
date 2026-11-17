// 构建后检查：前端产物不能包含服务端会话密钥等秘密。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/client';
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json)$/.test(f)) files.push(p);
  }
};
walk(dir);
const content = files.map((f) => readFileSync(f, 'utf8')).join('\n');
const banned = ['SESSION_SECRET', 'pass_hash', 'cloudflare:workers'];
const leaks = banned.filter((b) => content.includes(b));
if (leaks.length) {
  console.error('前端产物包含服务端代码或秘密：' + leaks.join(', '));
  process.exit(1);
}
console.log(`产物检查通过（${files.length} 个文件）`);
