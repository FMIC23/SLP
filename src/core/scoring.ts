import type { Attempt, Skill } from './types';

/**
 * Estimaciones APROXIMADAS (no oficiales).
 * Cambridge English Scale: 160-179 = B2, 180-199 = C1, 200-210 = C2 (C1 Advanced informa 160-210).
 * Cambridge no publica una tabla fija %→escala (varía por convocatoria); usamos la referencia
 * habitual de ~60 % ≈ 180 (aprobado C1) y ~80 % ≈ 200 (C2), interpolando linealmente.
 */
const CAMBRIDGE_POINTS: [number, number][] = [
  [0, 122],
  [25, 142],
  [45, 160],
  [60, 180],
  [80, 200],
  [100, 210],
];

export function percentToCambridge(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < CAMBRIDGE_POINTS.length; i++) {
    const [x1, y1] = CAMBRIDGE_POINTS[i - 1];
    const [x2, y2] = CAMBRIDGE_POINTS[i];
    if (p <= x2) return Math.round(y1 + ((p - x1) * (y2 - y1)) / (x2 - x1));
  }
  return 210;
}

export function cambridgeBand(scale: number): string {
  if (scale >= 200) return 'C2';
  if (scale >= 180) return 'C1';
  if (scale >= 160) return 'B2';
  if (scale >= 142) return 'B1';
  return '< B1';
}

/** Media de la escala Cambridge de las destrezas (el resultado global es la media de las 5 puntuaciones). */
export function overallCambridge(scales: number[]): number {
  if (!scales.length) return 0;
  return Math.round(scales.reduce((a, b) => a + b, 0) / scales.length);
}

/**
 * Estimación SLP (STANAG 6001) por destreza.
 * Las pruebas STANAG suelen exigir ~70 % de acierto en las tareas de un nivel para "sostener" ese nivel,
 * y dan "+" si se supera holgadamente el nivel inferior con un rendimiento parcial en el superior.
 * Tomamos los ejercicios de esta app como de nivel 3 (C1 ≈ SLP 3).
 */
export function percentToSlp(pct: number): string {
  if (pct >= 70) return '3';
  if (pct >= 55) return '2+';
  if (pct >= 40) return '2';
  if (pct >= 25) return '1+';
  return '1';
}

export function slpProfile(levels: Partial<Record<'listening' | 'speaking' | 'reading' | 'writing', string>>): string {
  return ['listening', 'speaking', 'reading', 'writing'].map((k) => levels[k as keyof typeof levels] ?? '-').join('.');
}

/** Rúbrica de Writing (Cambridge): 4 criterios de 0 a 5 → porcentaje. */
export function rubricPercent(scores: Record<string, number>, perCriterion = 5): number {
  const vals = Object.values(scores);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * perCriterion)) * 100);
}

export interface SkillStat {
  skill: Skill;
  attempts: number;
  pct: number; // media ponderada reciente
}

/** Media de las últimas `window` tentativas por destreza (porcentaje). */
export function skillStats(attempts: Attempt[], window = 15): Record<Skill, SkillStat> {
  const skills: Skill[] = ['reading', 'useofenglish', 'listening', 'writing', 'speaking', 'vocabulary'];
  const out = {} as Record<Skill, SkillStat>;
  for (const s of skills) {
    const list = attempts.filter((a) => a.skill === s && a.max > 0).slice(-window);
    const sc = list.reduce((a, b) => a + b.score, 0);
    const mx = list.reduce((a, b) => a + b.max, 0);
    out[s] = { skill: s, attempts: list.length, pct: mx ? Math.round((sc / mx) * 100) : 0 };
  }
  return out;
}

export function errorTagCounts(attempts: Attempt[], window = 40): [string, number][] {
  const counts = new Map<string, number>();
  for (const a of attempts.slice(-window)) for (const t of a.errorTags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Racha de días consecutivos de estudio terminando hoy (o ayer). */
export function streak(studyDays: string[], today: string): number {
  const set = new Set(studyDays);
  const d = new Date(today + 'T00:00:00Z');
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/**
 * Prioridad de destrezas para la recomendación: menor rendimiento primero.
 * Las destrezas sin intentos cuentan como 0 %. `boost` resta puntos (más prioridad), p. ej. speaking.
 */
export function prioritizeSkills(stats: Record<Skill, SkillStat>, boost: Partial<Record<Skill, number>> = {}): Skill[] {
  return (Object.values(stats) as SkillStat[])
    .map((s) => ({ s: s.skill, v: (s.attempts ? s.pct : 0) - (boost[s.skill] ?? 0) + Math.min(s.attempts, 10) }))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.s);
}
