import { describe, expect, it } from 'vitest';
import { countWords, gradeQuestion, gradeTask, normalize, textMatches } from '../src/core/grading';
import type { Question } from '../src/core/types';

const choice: Question = { id: 'c', kind: 'choice', options: ['a', 'b', 'c', 'd'], answer: 2, explanation: '', tag: 'detail' };
const open: Question = { id: 'o', kind: 'text', accepted: ['although', 'though'], explanation: '', tag: 'linking', grammarRef: 'linking-contrast' };
const kwt: Question = {
  id: 'k', kind: 'text', keyword: 'HAD', original: 'If I had known...', accepted: ['had i known about'], parts: [['had i known'], ['about']], points: 2, explanation: '', tag: 'grammar', grammarRef: 'inversion',
};

describe('normalize / textMatches', () => {
  it('ignora mayúsculas, espacios y puntuación final', () => {
    expect(normalize('  Although. ')).toBe('although');
    expect(textMatches('THOUGH', ['although', 'though'])).toBe(true);
  });
  it('acepta apóstrofos tipográficos y contracciones equivalentes', () => {
    expect(textMatches('didn’t want', ["didn't want"])).toBe(true);
    expect(textMatches('did not want', ["didn't want"])).toBe(true);
    expect(textMatches("won't", ['will not'])).toBe(true);
  });
});

describe('gradeQuestion', () => {
  it('corrige opción múltiple', () => {
    expect(gradeQuestion(choice, 2).correct).toBe(true);
    expect(gradeQuestion(choice, 1).correct).toBe(false);
    expect(gradeQuestion(choice, null).score).toBe(0);
  });
  it('corrige huecos abiertos', () => {
    expect(gradeQuestion(open, 'Though').score).toBe(1);
    expect(gradeQuestion(open, 'despite').score).toBe(0);
  });
  it('KWT: 2 puntos completo, 1 parcial, 0 sin palabra clave', () => {
    expect(gradeQuestion(kwt, 'had I known about')).toEqual({ correct: true, score: 2, max: 2 });
    expect(gradeQuestion(kwt, 'had I known of').score).toBe(1);
    expect(gradeQuestion(kwt, 'if I knew about').score).toBe(0);
  });
});

describe('gradeTask', () => {
  it('suma puntos y recoge etiquetas de error y gramática', () => {
    const g = gradeTask([choice, open, kwt], [2, 'despite', 'had I known of']);
    expect(g.score).toBe(2);
    expect(g.max).toBe(4);
    expect(g.errorTags).toEqual(['linking', 'grammar']);
    expect(g.grammarRefs).toEqual(['linking-contrast', 'inversion']);
  });
});

describe('countWords', () => {
  it('cuenta palabras ignorando símbolos sueltos', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('The plant — built in 1980 — is old.')).toBe(7);
  });
});
