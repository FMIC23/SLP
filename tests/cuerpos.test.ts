import { describe, expect, it } from 'vitest';
import { cuerpoGrade, toReadingScript } from '../src/views/cuerpos';

describe('ejercicio de inglés de los cuerpos', () => {
  it('calificación MCER: media y mínimo B2 en ambas partes', () => {
    expect(cuerpoGrade(7, 7)).toEqual({ grade: 7, apto: true });
    expect(cuerpoGrade(10, 5)).toEqual({ grade: 7.5, apto: true });
    expect(cuerpoGrade(7, 0)).toEqual({ grade: 3.5, apto: false });
  });
  it('divide el texto en frases para la lectura en voz alta', () => {
    const s = toReadingScript('First sentence. Second one?\n\nNew paragraph with 3.5 per cent growth!');
    expect(s.map((x) => x.text)).toEqual(['First sentence.', 'Second one?', 'New paragraph with 3.5 per cent growth!']);
    expect(s.every((x) => x.speaker === 'Asesor')).toBe(true);
  });
});
