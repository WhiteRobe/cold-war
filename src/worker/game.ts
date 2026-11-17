import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env';

export class GameDO extends DurableObject<Env> {}
