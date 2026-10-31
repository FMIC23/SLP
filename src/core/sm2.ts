import type { SrsState } from './types';

/**
 * Algoritmo SM-2 (SuperMemo 2, P. Wozniak 1987).
 * quality: 0-5. <3 = fallo (se reinician repeticiones).
 * EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)), mínimo 1.3.
 * Intervalos: 1 día, 6 días, después intervalo anterior * EF.
 */
export function newSrsState(today: string): SrsState {
  return { ef: 2.5, interval: 0, reps: 0, due: today, lapses: 0 };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function review(state: SrsState, quality: number, today: string): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ef, interval, reps, lapses } = state;
  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;
  ef = Math.round(ef * 1000) / 1000;
  return { ef, interval, reps, lapses, due: addDays(today, interval) };
}

export function isDue(state: SrsState | undefined, today: string): boolean {
  return !state || state.due <= today;
}

/** Botones de la interfaz → calidad SM-2 */
export const QUALITY = { again: 1, hard: 3, good: 4, easy: 5 } as const;
