import type { Attempt, Skill } from './types';
import { prioritizeSkills, skillStats } from './scoring';

export interface TaskRef {
  id: string;
  skill: string;
  title: string;
  topic: string;
  domain: string;
  route: string;
}

/**
 * Recomienda la siguiente tarea:
 * 1. Ordena destrezas por rendimiento (peor primero); speaking recibe un plus de prioridad
 *    porque es la debilidad declarada del usuario.
 * 2. Dentro de la destreza, prefiere tareas no hechas; si todas están hechas, la de peor resultado.
 * 3. Si hay `focusDomain`, prefiere ese dominio.
 */
export function recommend(attempts: Attempt[], tasks: TaskRef[], opts: { boost?: Partial<Record<Skill, number>>; focusDomain?: string; exclude?: string[] } = {}): TaskRef | undefined {
  const stats = skillStats(attempts);
  const order = prioritizeSkills(stats, opts.boost ?? { speaking: 15 });
  const done = new Map<string, number>();
  for (const a of attempts) {
    const pct = a.max ? a.score / a.max : 0;
    done.set(a.taskId, Math.max(done.get(a.taskId) ?? 0, pct));
  }
  for (const skill of order) {
    const pool = tasks.filter((t) => t.skill === skill && !(opts.exclude ?? []).includes(t.id));
    if (!pool.length) continue;
    const byDomain = (list: TaskRef[]) => (opts.focusDomain ? [...list.filter((t) => t.domain === opts.focusDomain), ...list.filter((t) => t.domain !== opts.focusDomain)] : list);
    const fresh = byDomain(pool.filter((t) => !done.has(t.id)));
    if (fresh.length) return fresh[0];
    return [...pool].sort((a, b) => (done.get(a.id) ?? 0) - (done.get(b.id) ?? 0))[0];
  }
  return undefined;
}
