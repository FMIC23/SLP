import { describe, expect, it } from 'vitest';
import { cambridgeBand, errorTagCounts, overallCambridge, percentToCambridge, percentToSlp, prioritizeSkills, rubricPercent, skillStats, slpProfile, streak } from '../src/core/scoring';
import { recommend } from '../src/core/recommend';
import { analyzeTranscript } from '../src/core/speech';
import { emptyProgress, sanitizeProgress } from '../src/core/store';
import type { Attempt } from '../src/core/types';

const att = (skill: Attempt['skill'], score: number, max: number, taskId = 'x', tags: string[] = []): Attempt => ({ id: Math.random().toString(), taskId, skill, topic: 't', domain: 'general', date: '2026-01-01', score, max, errorTags: tags });

describe('escala Cambridge', () => {
  it('puntos de anclaje', () => {
    expect(percentToCambridge(60)).toBe(180);
    expect(percentToCambridge(80)).toBe(200);
    expect(percentToCambridge(45)).toBe(160);
    expect(percentToCambridge(100)).toBe(210);
    expect(percentToCambridge(70)).toBe(190);
    expect(percentToCambridge(-5)).toBe(122);
  });
  it('bandas', () => {
    expect(cambridgeBand(179)).toBe('B2');
    expect(cambridgeBand(180)).toBe('C1');
    expect(cambridgeBand(200)).toBe('C2');
    expect(overallCambridge([180, 190, 170, 200, 185])).toBe(185);
  });
});

describe('SLP', () => {
  it('umbrales', () => {
    expect(percentToSlp(70)).toBe('3');
    expect(percentToSlp(60)).toBe('2+');
    expect(percentToSlp(45)).toBe('2');
    expect(percentToSlp(10)).toBe('1');
    expect(slpProfile({ listening: '3', speaking: '2+', reading: '3', writing: '3' })).toBe('3.2+.3.3');
  });
  it('rúbrica a porcentaje', () => {
    expect(rubricPercent({ a: 3, b: 3, c: 3, d: 3 })).toBe(60);
  });
});

describe('estadísticas', () => {
  it('skillStats, errores y racha', () => {
    const a = [att('reading', 3, 6, 'r1', ['inference']), att('reading', 6, 6, 'r2'), att('listening', 1, 4, 'l1', ['detail', 'inference'])];
    const s = skillStats(a);
    expect(s.reading.pct).toBe(75);
    expect(s.listening.pct).toBe(25);
    expect(errorTagCounts(a)[0]).toEqual(['inference', 2]);
    expect(streak(['2026-01-01', '2026-01-02', '2026-01-03'], '2026-01-03')).toBe(3);
    expect(streak(['2026-01-01', '2026-01-02'], '2026-01-03')).toBe(2);
    expect(streak(['2026-01-01'], '2026-01-03')).toBe(0);
  });
  it('prioriza destrezas débiles y speaking', () => {
    const order = prioritizeSkills(skillStats([]), { speaking: 15 });
    expect(order[0]).toBe('speaking');
  });
});

describe('recomendación', () => {
  const tasks = [
    { id: 'r1', skill: 'reading', title: 'R1', topic: 't', domain: 'general', route: '' },
    { id: 'r2', skill: 'reading', title: 'R2', topic: 't', domain: 'police', route: '' },
    { id: 's1', skill: 'speaking', title: 'S1', topic: 't', domain: 'general', route: '' },
  ];
  it('sin historial recomienda speaking', () => {
    expect(recommend([], tasks)?.id).toBe('s1');
  });
  it('prefiere tareas no hechas de la destreza más floja y el dominio pedido', () => {
    const a = [att('speaking', 20, 25, 's1'), att('reading', 1, 6, 'r1')];
    expect(recommend(a, tasks, { focusDomain: 'police' })?.id).toBe('r2');
  });
});

describe('análisis de speaking', () => {
  it('cuenta palabras/minuto, muletillas y frases útiles', () => {
    const r = analyzeTranscript('Well, um, I would argue that, you know, safety comes first. Um, on balance it pays off.', 30, ['I would argue that...', 'On balance', 'To sum up']);
    expect(r.words).toBe(17);
    expect(r.wpm).toBe(34);
    expect(r.fillerDetail.um).toBe(2);
    expect(r.fillerDetail['you know']).toBe(1);
    expect(r.usedPhrases).toEqual(['I would argue that...', 'On balance']);
  });
});

describe('importación de progreso', () => {
  it('valida y completa', () => {
    const p = sanitizeProgress({ version: 1, attempts: [att('reading', 1, 2)], srs: {} });
    expect(p.attempts).toHaveLength(1);
    expect(p.plan.days).toHaveLength(7);
    expect(p.settings.dailyNewCards).toBe(emptyProgress().settings.dailyNewCards);
  });
  it('rechaza archivos no válidos', () => {
    expect(() => sanitizeProgress({ foo: 1 })).toThrow();
    expect(() => sanitizeProgress(null)).toThrow();
  });
});
