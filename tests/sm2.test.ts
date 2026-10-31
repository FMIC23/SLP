import { describe, expect, it } from 'vitest';
import { addDays, isDue, newSrsState, review } from '../src/core/sm2';

const T = '2026-01-01';

describe('SM-2', () => {
  it('intervalos 1, 6 y después intervalo × EF', () => {
    let s = newSrsState(T);
    s = review(s, 4, T);
    expect(s.interval).toBe(1);
    expect(s.due).toBe('2026-01-02');
    s = review(s, 4, s.due);
    expect(s.interval).toBe(6);
    s = review(s, 4, s.due);
    expect(s.interval).toBe(15); // 6 × 2.5
    expect(s.ef).toBeCloseTo(2.5);
  });
  it('calidad 5 aumenta EF y calidad 3 lo reduce', () => {
    expect(review(newSrsState(T), 5, T).ef).toBeCloseTo(2.6);
    expect(review(newSrsState(T), 3, T).ef).toBeCloseTo(2.36);
  });
  it('un fallo reinicia repeticiones y cuenta lapsus', () => {
    let s = newSrsState(T);
    s = review(s, 5, T);
    s = review(s, 5, T);
    s = review(s, 1, T);
    expect(s.reps).toBe(0);
    expect(s.interval).toBe(1);
    expect(s.lapses).toBe(1);
  });
  it('EF nunca baja de 1.3', () => {
    let s = newSrsState(T);
    for (let i = 0; i < 20; i++) s = review(s, 0, T);
    expect(s.ef).toBe(1.3);
  });
  it('isDue y addDays', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(isDue(undefined, T)).toBe(true);
    expect(isDue({ ...newSrsState(T), due: '2026-01-05' }, T)).toBe(false);
  });
});
