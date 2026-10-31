import { IS_OPO } from '../core/edition';
type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { on?: Record<string, (e: any) => void> };

/** Crea un elemento DOM. Atributos: class, style, aria-*, data-*, on: {click: fn}. Texto siempre escapado. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'on' && v) for (const [ev, fn] of Object.entries(v as Record<string, EventListener>)) el.addEventListener(ev, fn);
      else if (v === false || v === null || v === undefined) continue;
      else if (k === 'class') el.className = String(v);
      else if (k in el && typeof v !== 'string') (el as any)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const SKILL_LABEL: Record<string, string> = {
  reading: 'Reading',
  useofenglish: 'Use of English',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: 'Vocabulario',
};

export const DOMAIN_LABEL: Record<string, string> = { general: 'General', industrial: 'Industrial', police: 'Policial' };

export function badges(meta: { level: string; domain: string; topic: string; generated: boolean; private?: boolean }) {
  return h(
    'div',
    { class: 'badges' },
    h('span', { class: 'badge' }, IS_OPO ? meta.level.replace('/SLP3', '') : meta.level),
    h('span', { class: `badge ${meta.domain}` }, DOMAIN_LABEL[meta.domain] ?? meta.domain),
    h('span', { class: 'badge' }, meta.topic),
    meta.private ? h('span', { class: 'badge private', title: 'Material personal: solo local' }, 'privado') : null,
  );
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Temporizador regresivo/progresivo con elemento visible. */
export function timer(opts: { countdown?: number; onEnd?: () => void; label?: string }) {
  let elapsed = 0;
  let id: number | null = null;
  const el = h('span', { class: 'timer', role: 'timer', 'aria-label': opts.label ?? 'Tiempo' }, opts.countdown ? fmtTime(opts.countdown) : '0:00');
  const render = () => {
    const v = opts.countdown ? opts.countdown - elapsed : elapsed;
    el.textContent = fmtTime(v);
    el.classList.toggle('warn', !!opts.countdown && v <= Math.min(60, opts.countdown * 0.1));
  };
  return {
    el,
    start() {
      if (id !== null) return;
      id = window.setInterval(() => {
        elapsed++;
        render();
        if (opts.countdown && elapsed >= opts.countdown) {
          this.stop();
          opts.onEnd?.();
        }
      }, 1000);
    },
    stop() {
      if (id !== null) window.clearInterval(id);
      id = null;
    },
    reset() {
      this.stop();
      elapsed = 0;
      render();
    },
    get running() {
      return id !== null;
    },
    get elapsed() {
      return elapsed;
    },
  };
}

/** Pitido corto (fin de tiempo de preparación, etc.). */
export function beep(freq = 880, ms = 250) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = 0.1;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, ms);
  } catch {
    /* sin audio */
  }
}

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function bar(pct: number) {
  const cls = pct >= 70 ? 'ok' : pct < 45 ? 'bad' : '';
  return h('div', { class: `bar ${cls}`, role: 'img', 'aria-label': `${pct} %` }, h('span', { style: `width:${Math.max(0, Math.min(100, pct))}%` }));
}
