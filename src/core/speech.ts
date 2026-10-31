import { countWords, normalize } from './grading';

const FILLERS = ['um', 'uh', 'er', 'erm', 'eh', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually'];

export interface SpeechAnalysis {
  words: number;
  wpm: number;
  fillers: number;
  fillerDetail: Record<string, number>;
  usedPhrases: string[];
  uniqueRatio: number;
}

/** Analiza una transcripción de speaking: ritmo, muletillas, variedad léxica y frases útiles usadas. */
export function analyzeTranscript(text: string, seconds: number, usefulLanguage: string[] = []): SpeechAnalysis {
  const t = ' ' + normalize(text).replace(/[^a-z0-9' ]+/g, ' ') + ' ';
  const words = countWords(text);
  const fillerDetail: Record<string, number> = {};
  for (const f of FILLERS) {
    const n = t.split(` ${f} `).length - 1;
    if (n) fillerDetail[f] = n;
  }
  const tokens = t.trim().split(/\s+/).filter(Boolean);
  const usedPhrases = usefulLanguage.filter((p) => {
    // compara los 3 primeros términos significativos de la frase útil (ignora puntos suspensivos y paréntesis)
    const core = normalize(p.replace(/\(.*?\)|\.\.\.|…/g, ' ')).replace(/[^a-z0-9' ]+/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
    return core.length > 2 && t.includes(` ${core}`);
  });
  return {
    words,
    wpm: seconds > 0 ? Math.round((words / seconds) * 60) : 0,
    fillers: Object.values(fillerDetail).reduce((a, b) => a + b, 0),
    fillerDetail,
    usedPhrases,
    uniqueRatio: tokens.length ? Math.round((new Set(tokens).size / tokens.length) * 100) / 100 : 0,
  };
}
