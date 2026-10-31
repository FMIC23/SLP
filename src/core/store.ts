import type { Attempt, Progress, Skill, SrsState } from './types';
import { IS_OPO } from './edition';

const LEGACY_KEY = 'slp-c1-progress-v1';
const PROFILES_KEY = 'slp-profiles';
const ACTIVE_KEY = 'slp-active-profile';

export interface Profile {
  id: string;
  name: string;
}

export const DEFAULT_PROFILES: Profile[] = IS_OPO
  ? [{ id: 'alumno', name: 'Alumno/a' }]
  : [
      { id: 'fran', name: 'Fran' },
      { id: 'mayka', name: 'Mayka' },
    ];

export function progressKey(profileId: string): string {
  return `${LEGACY_KEY}:${profileId}`;
}

export function slugifyProfile(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'perfil'
  );
}

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
    settings: { voiceRate: 1, dailyNewCards: 15, prioritySkill: 'speaking' },
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

export class Store {
  data: Progress;
  profiles: Profile[];
  profileId: string;
  private listeners: Listener[] = [];
  private storage: Storage | null;

  constructor(storage: Storage | null) {
    this.storage = storage;
    this.profiles = this.loadProfiles();
    const active = this.read(ACTIVE_KEY);
    this.profileId = this.profiles.some((p) => p.id === active) ? active! : this.profiles[0].id;
    this.migrateLegacy();
    this.data = this.load();
  }

  private read(k: string): string | null {
    try {
      return this.storage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  }

  private write(k: string, v: string) {
    try {
      this.storage?.setItem(k, v);
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }

  private loadProfiles(): Profile[] {
    try {
      const raw = this.read(PROFILES_KEY);
      const list = raw ? (JSON.parse(raw) as Profile[]) : [];
      const ok = Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [];
      return ok.length ? ok : DEFAULT_PROFILES.map((p) => ({ ...p }));
    } catch {
      return DEFAULT_PROFILES.map((p) => ({ ...p }));
    }
  }

  /** El progreso guardado antes de existir los perfiles pasa al primer perfil (Fran). */
  private migrateLegacy() {
    const legacy = this.read(LEGACY_KEY);
    if (legacy && !this.read(progressKey(this.profiles[0].id))) {
      this.write(progressKey(this.profiles[0].id), legacy);
    }
    if (legacy) {
      try {
        this.storage?.removeItem(LEGACY_KEY);
      } catch {
        /* */
      }
    }
  }

  private load(): Progress {
    try {
      const raw = this.read(progressKey(this.profileId));
      if (raw) return sanitizeProgress(JSON.parse(raw));
    } catch {
      /* datos corruptos: se empieza de cero */
    }
    const p = emptyProgress();
    // Solo el primer perfil (Fran) prioriza speaking por defecto
    if (IS_OPO || this.profileId !== this.profiles[0].id) p.settings.prioritySkill = '';
    return p;
  }

  get profile(): Profile {
    return this.profiles.find((p) => p.id === this.profileId) ?? this.profiles[0];
  }

  private saveProfiles() {
    this.write(PROFILES_KEY, JSON.stringify(this.profiles));
  }

  switchProfile(id: string) {
    if (!this.profiles.some((p) => p.id === id)) return;
    this.profileId = id;
    this.write(ACTIVE_KEY, id);
    this.data = this.load();
    this.listeners.forEach((l) => l());
  }

  addProfile(name: string): Profile {
    const clean = name.trim().slice(0, 30);
    if (!clean) throw new Error('El nombre no puede estar vacío');
    let id = slugifyProfile(clean);
    let n = 2;
    while (this.profiles.some((p) => p.id === id)) id = `${slugifyProfile(clean)}-${n++}`;
    const p = { id, name: clean };
    this.profiles.push(p);
    this.saveProfiles();
    return p;
  }

  renameProfile(id: string, name: string) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p || !name.trim()) return;
    p.name = name.trim().slice(0, 30);
    this.saveProfiles();
  }

  deleteProfile(id: string) {
    if (this.profiles.length <= 1 || id === this.profileId) throw new Error('No se puede borrar el perfil activo ni el último perfil');
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.saveProfiles();
    try {
      this.storage?.removeItem(progressKey(id));
    } catch {
      /* */
    }
  }

  save() {
    this.write(progressKey(this.profileId), JSON.stringify(this.data));
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

/** Plus de prioridad para la destreza elegida en Ajustes (por defecto speaking en el perfil de Fran). */
export function boost(): Partial<Record<Skill, number>> {
  const s = store.data.settings.prioritySkill;
  return s ? { [s]: 15 } : {};
}
