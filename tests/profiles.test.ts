import { describe, expect, it } from 'vitest';
import { Store, progressKey } from '../src/core/store';

function memStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const attempt = { taskId: 't1', skill: 'reading' as const, topic: 'x', domain: 'general' as const, score: 1, max: 2, errorTags: [] };

describe('perfiles', () => {
  it('crea Fran y Mayka por defecto; Fran prioriza speaking y Mayka no', () => {
    const s = new Store(memStorage());
    expect(s.profiles.map((p) => p.name)).toEqual(['Fran', 'Mayka']);
    expect(s.profile.name).toBe('Fran');
    expect(s.data.settings.prioritySkill).toBe('speaking');
    s.switchProfile('mayka');
    expect(s.data.settings.prioritySkill).toBe('');
  });

  it('el progreso de cada perfil es independiente y persiste', () => {
    const st = memStorage();
    const s = new Store(st);
    s.addAttempt(attempt);
    s.switchProfile('mayka');
    expect(s.data.attempts).toHaveLength(0);
    s.addAttempt(attempt);
    s.addAttempt(attempt);
    const again = new Store(st); // recarga: recuerda el perfil activo
    expect(again.profileId).toBe('mayka');
    expect(again.data.attempts).toHaveLength(2);
    again.switchProfile('fran');
    expect(again.data.attempts).toHaveLength(1);
  });

  it('migra el progreso anterior a los perfiles al perfil de Fran', () => {
    const legacy = JSON.stringify({ version: 1, attempts: [{ ...attempt, id: 'a', date: '2026-01-01' }], srs: {} });
    const st = memStorage({ 'slp-c1-progress-v1': legacy });
    const s = new Store(st);
    expect(s.data.attempts).toHaveLength(1);
    expect(st.getItem(progressKey('fran'))).toBe(legacy);
    expect(st.getItem('slp-c1-progress-v1')).toBeNull();
  });

  it('añade, renombra y borra perfiles con protecciones', () => {
    const s = new Store(memStorage());
    const p = s.addProfile('Ana María');
    expect(p.id).toBe('ana-maria');
    expect(s.addProfile('Ana María').id).toBe('ana-maria-2');
    s.renameProfile('mayka', 'Mayka G.');
    expect(s.profiles.find((x) => x.id === 'mayka')!.name).toBe('Mayka G.');
    expect(() => s.deleteProfile('fran')).toThrow();
    s.deleteProfile('ana-maria');
    expect(s.profiles.some((x) => x.id === 'ana-maria')).toBe(false);
    expect(() => s.addProfile('   ')).toThrow();
  });
});
