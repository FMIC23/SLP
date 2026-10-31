import type { Question } from './types';

/** Normaliza respuestas abiertas: minúsculas, apóstrofos rectos, espacios simples, sin puntuación final. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/[.,;:!?"]+$/g, '')
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Expande contracciones habituales para comparar formas equivalentes. */
export function expandContractions(s: string): string {
  return s
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'d\b/g, ' would')
    .replace(/'m\b/g, ' am')
    .replace(/\bcan not\b/g, 'cannot');
}

function variants(s: string): string[] {
  const n = normalize(s);
  return Array.from(new Set([n, expandContractions(n)]));
}

export function textMatches(given: string, accepted: string[]): boolean {
  const g = variants(given);
  return accepted.some((a) => variants(a).some((v) => g.includes(v)));
}

export interface GradeResult {
  correct: boolean;
  score: number;
  max: number;
}

/** Puntuación máxima de una pregunta. */
export function maxPoints(q: Question): number {
  return q.points ?? 1;
}

/**
 * Corrige una pregunta.
 * - choice: respuesta = índice.
 * - text: coincide con alguna variante aceptada (máx. puntos).
 *   Si no coincide y hay `parts` (KWT), 1 punto por tramo presente.
 */
export function gradeQuestion(q: Question, response: string | number | null | undefined): GradeResult {
  const max = maxPoints(q);
  if (response === null || response === undefined || response === '') return { correct: false, score: 0, max };
  if (q.kind === 'choice') {
    const ok = Number(response) === q.answer;
    return { correct: ok, score: ok ? max : 0, max };
  }
  const given = String(response);
  if (q.keyword && !normalize(given).includes(normalize(q.keyword))) {
    // En KWT es obligatorio usar la palabra clave
    return { correct: false, score: 0, max };
  }
  if (q.accepted && textMatches(given, q.accepted)) return { correct: true, score: max, max };
  if (q.parts && q.parts.length) {
    const g = ' ' + expandContractions(normalize(given)) + ' ';
    let pts = 0;
    for (const seg of q.parts) {
      if (seg.some((v) => g.includes(' ' + expandContractions(normalize(v)) + ' ') || g.includes(expandContractions(normalize(v))))) pts++;
    }
    pts = Math.min(pts, max);
    // Puntuación completa solo si coinciden todos los tramos
    return { correct: pts === max, score: pts, max };
  }
  return { correct: false, score: 0, max };
}

export interface TaskGrade {
  score: number;
  max: number;
  results: GradeResult[];
  errorTags: string[];
  grammarRefs: string[];
}

export function gradeTask(questions: Question[], responses: (string | number | null | undefined)[]): TaskGrade {
  const results = questions.map((q, i) => gradeQuestion(q, responses[i]));
  const errorTags: string[] = [];
  const grammarRefs: string[] = [];
  results.forEach((r, i) => {
    if (!r.correct) {
      errorTags.push(questions[i].tag);
      const g = questions[i].grammarRef;
      if (g && !grammarRefs.includes(g)) grammarRefs.push(g);
    }
  });
  return {
    score: results.reduce((a, r) => a + r.score, 0),
    max: results.reduce((a, r) => a + r.max, 0),
    results,
    errorTags,
    grammarRefs,
  };
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
