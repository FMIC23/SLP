import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { parseSpeakingNotes } from '../scripts/import-material.mjs';

describe('datos', () => {
  it('todos los JSON de data/ pasan el validador', () => {
    const out = execFileSync('node', ['scripts/validate-data.mjs']).toString();
    expect(out).toContain('Datos válidos');
  });
  it('el importador convierte apuntes de speaking en mazos', () => {
    const txt = 'INDEX\n\n1. CITY LIFE\n\nRush hour\n\nStunning scenery - paisaje maravilloso\n\nCOUNTRYSIDE\n\nOff the beaten track - apartado\n\n2. WORK\n\nShort';
    const decks = parseSpeakingNotes(txt, 'notes.txt');
    expect(decks).toHaveLength(1);
    expect(decks[0].cards.map((c: any) => c.front)).toEqual(['Rush hour', 'Stunning scenery', 'Off the beaten track']);
    expect(decks[0].cards[1].back).toBe('paisaje maravilloso');
    expect(decks[0].cards[2].note).toBe('Subtema: COUNTRYSIDE');
    expect(decks[0].meta.generated).toBe(false);
  });
});
