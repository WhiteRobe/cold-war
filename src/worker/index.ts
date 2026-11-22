import type { Me } from '../shared/protocol';
import {
  clearCookie, hashPassword, randomId, readCookie, sessionCookie, signSession, validateCredentials, verifyPassword, verifySession,
} from './auth';
import { gameStub, lobbyStub, type Env, type Identity } from './env';
import { sanitizeConfig } from './game';
import { validateScenario, type Scenario } from '../engine/scenario';

export { LobbyDO } from './lobby';
export { GameDO } from './game';

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

const fail = (msg: string, status = 400) => json({ error: msg }, status);

const me = (u: Identity): Me => ({ id: u.id, name: u.name, guest: u.guest });

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function currentUser(req: Request, env: Env): Promise<Identity | null> {
  const sid = readCookie(req, 'sid');
  return sid ? verifySession(sid, env.SESSION_SECRET) : null;
}

async function login(env: Env, user: Identity): Promise<Response> {
  const token = await signSession(user, env.SESSION_SECRET);
  return json(me(user), 200, { 'Set-Cookie': sessionCookie(token) });
}

async function handleApi(req: Request, env: Env, path: string): Promise<Response> {
  const method = req.method;
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';

  if (path === '/api/health') return json({ ok: true });

  if (path === '/api/me' && method === 'GET') {
    const u = await currentUser(req, env);
    return u ? json(me(u)) : fail('未登录', 401);
  }

  if (path === '/api/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });

  if ((path === '/api/register' || path === '/api/login') && method === 'POST') {
    if (!(await lobbyStub(env).rateLimit('auth:' + ip, 20))) return fail('操作太频繁，请稍后再试', 429);
    const { username, password } = await readBody(req);
    const bad = validateCredentials(username, password);
    if (bad) return fail(bad);
    const name = username as string;
    if (path === '/api/register') {
      const iterations = Number(env.PBKDF2_ITERATIONS) || 20000;
      const id = randomId('u_');
      const hash = await hashPassword(password as string, iterations);
      try {
        await env.DB.prepare('INSERT INTO users (id, username, pass_hash, created_at) VALUES (?, ?, ?, ?)').bind(id, name, hash, Date.now()).run();
      } catch (e) {
        if (String(e).includes('UNIQUE')) return fail('用户名已被占用');
        throw e;
      }
      return login(env, { id, name, guest: false });
    }
    const row = await env.DB.prepare('SELECT id, username, pass_hash FROM users WHERE username = ?').bind(name).first<{ id: string; username: string; pass_hash: string }>();
    if (!row || !(await verifyPassword(password as string, row.pass_hash))) return fail('用户名或密码错误', 401);
    return login(env, { id: row.id, name: row.username, guest: false });
  }

  if (path === '/api/guest' && method === 'POST') {
    if (!(await lobbyStub(env).rateLimit('guest:' + ip, 30))) return fail('操作太频繁，请稍后再试', 429);
    const n = crypto.getRandomValues(new Uint16Array(1))[0] % 10000;
    return login(env, { id: randomId('g_'), name: `游客${String(n).padStart(4, '0')}`, guest: true });
  }

  // ---- 全局战绩：离线局由浏览器上报，在线局取 match_results（不需要登录） ----
  if (path === '/api/records' && method === 'GET') {
    const t: Record<string, number> = { US: 0, USSR: 0, draw: 0, pending: 0 };
    const off = await env.DB.prepare('SELECT outcome, COUNT(*) AS n FROM offline_results GROUP BY outcome').all<{ outcome: string; n: number }>();
    for (const r of off.results) if (r.outcome in t) t[r.outcome] += r.n;
    const on = await env.DB.prepare('SELECT winner, COUNT(*) AS n FROM match_results GROUP BY winner').all<{ winner: string | null; n: number }>();
    for (const r of on.results) t[r.winner === 'US' || r.winner === 'USSR' ? r.winner : 'draw'] += r.n;
    return json(t);
  }
  if (path === '/api/records' && method === 'POST') {
    if (!(await lobbyStub(env).rateLimit('record:' + ip, 120))) return fail('操作太频繁，请稍后再试', 429);
    const b = await readBody(req);
    const items = Array.isArray(b.items) ? (b.items as { id?: unknown; outcome?: unknown }[]).slice(0, 200) : [];
    const ok = items.filter(
      (x) => typeof x.id === 'string' && /^c_[A-Za-z0-9]{8,32}:off:[A-Za-z0-9_:-]{1,64}$/.test(x.id) && ['US', 'USSR', 'draw', 'pending'].includes(x.outcome as string),
    );
    if (ok.length) {
      const now = Date.now();
      await env.DB.batch(ok.map((x) =>
        env.DB.prepare('INSERT INTO offline_results (id, outcome, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET outcome = excluded.outcome, updated_at = excluded.updated_at')
          .bind(x.id, x.outcome, now)));
    }
    return json({ ok: ok.length });
  }

  // ---- 自定义剧本：列表 / 上传 / 删除（不需要登录） ----
  if (path === '/api/scenarios' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT data FROM scenarios ORDER BY created_at DESC LIMIT 200').all<{ data: string }>();
    return json(rows.results.map((r) => JSON.parse(r.data)));
  }
  if (path === '/api/scenarios' && method === 'POST') {
    if (!(await lobbyStub(env).rateLimit('scenario:' + ip, 10))) return fail('上传太频繁，请稍后再试', 429);
    const b = (await readBody(req)) as unknown as Scenario;
    const bad = validateScenario(b);
    if (bad) return fail(bad);
    const id = randomId('s_');
    const sc: Scenario = {
      id, name: b.name.trim(), author: typeof b.author === 'string' ? b.author.trim().slice(0, 20) : undefined, year: typeof b.year === 'string' ? b.year.slice(0, 20) : undefined,
      story: b.story.trim(), startTurn: b.startTurn, endTurn: b.endTurn, defcon: b.defcon, vp: b.vp, space: b.space, china: b.china, inf: b.inf, events: b.events, placement: b.placement === true,
    };
    await env.DB.prepare('INSERT INTO scenarios (id, name, author, data, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, sc.name, sc.author ?? null, JSON.stringify(sc), Date.now()).run();
    return json(sc);
  }
  const sm = path.match(/^\/api\/scenarios\/(s_[A-Za-z0-9_-]{4,40})$/);
  if (sm && method === 'DELETE') {
    if (!(await lobbyStub(env).rateLimit('scenario-del:' + ip, 20))) return fail('操作太频繁，请稍后再试', 429);
    const { password } = await readBody(req);
    if (password !== (env.SCENARIO_ADMIN_PASSWORD || '123456')) return fail('密码不对', 403);
    await env.DB.prepare('DELETE FROM scenarios WHERE id = ?').bind(sm[1]).run();
    return json({ ok: true });
  }

  const user = await currentUser(req, env);
  if (!user) return fail('请先登录', 401);

  if (path === '/api/rooms' && method === 'POST') {
    if (!(await lobbyStub(env).rateLimit('room:' + user.id, 30))) return fail('建房太频繁，请稍后再试', 429);
    const b = await readBody(req);
    const config = sanitizeConfig(b.config as never);
    const name = (typeof b.name === 'string' && b.name.trim() ? b.name.trim() : `${user.name}的房间`).slice(0, 20);
    const priv = b.private === true || config.ai !== null;
    const created = await lobbyStub(env).createRoom({ name, host: user.name, private: priv, vsAi: config.ai !== null });
    await gameStub(env, created.id).init({ ...created, name, private: priv, host: user, config });
    return json(created);
  }

  if (path === '/api/rooms/join' && method === 'POST') {
    const { code } = await readBody(req);
    if (typeof code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(code)) return fail('房间码是 6 位字母数字');
    const found = await lobbyStub(env).lookup(code);
    if (!found) return fail('房间不存在', 404);
    return json({ id: found.id });
  }

  if (path === '/api/matches' && method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT id, room_id, us_name, ussr_name, winner, reason, turn, vp, finished_at FROM match_results WHERE us_user = ?1 OR ussr_user = ?1 ORDER BY finished_at DESC LIMIT 50',
    ).bind(user.id).all();
    return json(rows.results);
  }

  const rm = path.match(/^\/api\/replay\/([A-Za-z0-9_-]{4,32})$/);
  if (rm && method === 'GET') {
    const data = await gameStub(env, rm[1]).replayData();
    return data ? json(data) : fail('对局不存在或尚未结束', 404);
  }

  return fail('接口不存在', 404);
}

async function handleWs(req: Request, env: Env, path: string): Promise<Response> {
  if (req.headers.get('Upgrade') !== 'websocket') return fail('需要 WebSocket', 426);
  const user = await currentUser(req, env);
  if (!user) return fail('请先登录', 401);
  const headers = new Headers(req.headers);
  headers.set('X-User-Id', user.id);
  headers.set('X-User-Name', encodeURIComponent(user.name));
  headers.set('X-Guest', user.guest ? '1' : '0');
  const fwd = new Request(req.url, { headers });
  if (path === '/ws/lobby') return lobbyStub(env).fetch(fwd);
  const m = path.match(/^\/ws\/game\/([A-Za-z0-9_-]{4,32})$/);
  if (m) return gameStub(env, m[1]).fetch(fwd);
  return fail('接口不存在', 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    try {
      if (path.startsWith('/api/')) return await handleApi(req, env, path);
      if (path.startsWith('/ws/')) return await handleWs(req, env, path);
    } catch (e) {
      console.error(e);
      return fail('服务器开小差了，请稍后再试', 500);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
