import type { Attempt, Progress, Skill, SrsState } from './types';

const KEY = 'slp-c1-progress-v1';

export function today(): string {
  const d = new Date();
  // fecha local (no UTC) para que la racha cuadre con el día del usuario
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function defaultPlan(): Progress['plan'] {
  const s = (skills: Skill[], minutes = 45) => ({ minutes, skills });
  return {
    days: [
      s(['speaking', 'vocabulary', 'reading']),
      s(['listening', 'useofenglish', 'speaking']),
      s(['writing', 'vocabulary']),
      s(['speaking', 'reading', 'useofenglish']),
      s(['listening', 'speaking', 'vocabulary']),
      s(['writing', 'speaking'], 60),
      s(['vocabulary'], 20),
    ],
  };
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    attempts: [],
    srs: {},
    studyDays: [],
    writings: {},
    plan: defaultPlan(),
    settings: { voiceRate: 1, dailyNewCards: 15 },
  };
}

/** Valida y completa un objeto de progreso importado. Lanza Error si no es válido. */
export function sanitizeProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') throw new Error('El archivo no contiene un objeto JSON');
  const r = raw as Partial<Progress>;
  if (r.version !== 1) throw new Error('Versión de progreso no compatible');
  const base = emptyProgress();
  return {
    version: 1,
    attempts: Array.isArray(r.attempts) ? r.attempts.filter((a) => a && typeof a.taskId === 'string') : [],
    srs: r.srs && typeof r.srs === 'object' ? r.srs : {},
    studyDays: Array.isArray(r.studyDays) ? r.studyDays.filter((d) => typeof d === 'string') : [],
    writings: r.writings && typeof r.writings === 'object' ? r.writings : {},
    plan: r.plan && Array.isArray(r.plan.days) && r.plan.days.length === 7 ? r.plan : base.plan,
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

type Listener = () => void;

class Store {
  data: Progress;
  private listeners: Listener[] = [];
  private storage: Storage | null;

  constructor(storage: Storage | null) {
    this.storage = storage;
    this.data = this.load();
  }

  private load(): Progress {
    try {
      const raw = this.storage?.getItem(KEY);
      return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
    } catch {
      return emptyProgress();
    }
  }

  save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
    this.listeners.forEach((l) => l());
  }

  onChange(l: Listener) {
    this.listeners.push(l);
  }

  markStudy() {
    const t = today();
    if (!this.data.studyDays.includes(t)) this.data.studyDays.push(t);
  }

  addAttempt(a: Omit<Attempt, 'id' | 'date'>) {
    this.data.attempts.push({ ...a, id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), date: new Date().toISOString() });
    this.markStudy();
    this.save();
  }

  setSrs(cardId: string, s: SrsState) {
    this.data.srs[cardId] = s;
    this.markStudy();
    this.save();
  }

  exportJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(text: string) {
    this.data = sanitizeProgress(JSON.parse(text));
    this.save();
  }

  reset() {
    this.data = emptyProgress();
    this.save();
  }
}

function safeStorage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem('__t', '1');
    s.removeItem('__t');
    return s;
  } catch {
    return null;
  }
}

export const store = new Store(safeStorage());

export function attemptsFor(taskId: string): Attempt[] {
  return store.data.attempts.filter((a) => a.taskId === taskId);
}
