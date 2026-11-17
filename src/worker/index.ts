import type { Env } from './env';

export { LobbyDO } from './lobby';
export { GameDO } from './game';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === '/api/health') return Response.json({ ok: true });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
