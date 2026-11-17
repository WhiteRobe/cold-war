import { signal } from '@preact/signals';
import type { Me } from '../shared/protocol';

export const me = signal<Me | null | undefined>(undefined);

export type Route =
  | { name: 'home' }
  | { name: 'offline'; id: string }
  | { name: 'online' }
  | { name: 'room'; id: string }
  | { name: 'rules' }
  | { name: 'cards' }
  | { name: 'replay'; id: string };

function parse(h: string): Route {
  const p = h.replace(/^#\/?/, '').split('/');
  if (p[0] === 'offline' && p[1]) return { name: 'offline', id: p[1] };
  if (p[0] === 'online') return { name: 'online' };
  if (p[0] === 'room' && p[1]) return { name: 'room', id: p[1] };
  if (p[0] === 'rules') return { name: 'rules' };
  if (p[0] === 'cards') return { name: 'cards' };
  if (p[0] === 'replay' && p[1]) return { name: 'replay', id: p[1] };
  return { name: 'home' };
}

export const route = signal<Route>(parse(location.hash));
window.addEventListener('hashchange', () => (route.value = parse(location.hash)));

export function go(path: string) {
  location.hash = path;
}

export const toastMsg = signal<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg.value = null), 2800);
}
