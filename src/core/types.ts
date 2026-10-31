// Tipos compartidos de contenido y progreso.
// El esquema de los JSON de data/ está documentado en docs/CONTENIDO.md
// y validado por scripts/validate-data.mjs.

export type Skill = 'reading' | 'useofenglish' | 'listening' | 'writing' | 'speaking' | 'vocabulary';
export type Level = 'C1' | 'SLP3' | 'C1/SLP3';
export type Domain = 'general' | 'industrial' | 'police';

/** Metadatos obligatorios de todo recurso. */
export interface Meta {
  id: string;
  skill: Skill;
  level: Level;
  topic: string;
  domain: Domain;
  source: string;
  sourceUrl?: string;
  license: string;
  generated: boolean;
  /** true si procede de material personal con derechos (solo uso local). */
  private?: boolean;
}

/** Pregunta genérica. kind=choice -> options+answer; kind=text -> accepted. */
export interface Question {
  id: string;
  kind: 'choice' | 'text';
  prompt?: string;
  options?: string[];
  answer?: number;
  accepted?: string[];
  /** Key word transformation: palabra clave y frase original. */
  keyword?: string;
  original?: string;
  /** Word formation: palabra base. */
  stem?: string;
  /** Puntuación parcial (KWT): cada sublista son variantes de un tramo puntuable. */
  parts?: string[][];
  points?: number;
  explanation: string;
  /** Categoría de error: detail, inference, tone, purpose, gist, reference, vocabulary, collocation, grammar, phrasal, linking, word-formation... */
  tag: string;
  /** id de data/grammar.json */
  grammarRef?: string;
}

export interface Section {
  label: string;
  title?: string;
  text: string;
}

export type ReadingFormat = 'multiple-choice' | 'gapped-text' | 'multiple-matching' | 'cross-text' | 'stanag';

export interface ReadingTask {
  meta: Meta;
  title: string;
  format: ReadingFormat;
  instructions: string;
  /** Texto en párrafos separados por \n\n. Los huecos se marcan [[1]], [[2]]... */
  text?: string;
  /** Para multiple matching / cross-text: secciones A, B, C... */
  sections?: Section[];
  questions: Question[];
  timeMinutes?: number;
}

export type UoePart = 'mc-cloze' | 'open-cloze' | 'word-formation' | 'kwt' | 'gapped-sentences';

export interface UoeTask {
  meta: Meta;
  title: string;
  part: UoePart;
  instructions: string;
  /** Para cloze/word formation: texto con [[n]] donde n es el índice 1-based de la pregunta. */
  text?: string;
  questions: Question[];
}

export interface ScriptLine {
  speaker: string;
  text: string;
}

export type ListeningPart = 'part1' | 'part2' | 'part3' | 'part4' | 'stanag';

export interface ListeningTask {
  meta: Meta;
  title: string;
  part: ListeningPart;
  instructions: string;
  /** Audio real (ruta relativa o URL). Si no hay, se usa síntesis de voz con script. */
  audio?: string;
  /** Hablantes: id -> 'male' | 'female' para elegir voz TTS. */
  speakers?: Record<string, 'male' | 'female'>;
  script: ScriptLine[];
  questions: Question[];
}

export interface Card {
  id: string;
  front: string;
  back: string;
  example?: string;
  note?: string;
}

export type DeckCategory =
  | 'general'
  | 'industrial'
  | 'police'
  | 'collocations'
  | 'phrasal-verbs'
  | 'idioms'
  | 'false-friends'
  | 'connectors'
  | 'speaking-phrases';

export interface Deck {
  meta: Meta;
  title: string;
  category: DeckCategory;
  cards: Card[];
}

export type WritingGenre =
  | 'essay'
  | 'report'
  | 'proposal'
  | 'email'
  | 'letter'
  | 'review'
  | 'technical-report'
  | 'executive-summary'
  | 'formal-email'
  | 'slp-memo';

export interface WritingTask {
  meta: Meta;
  title: string;
  genre: WritingGenre;
  prompt: string;
  /** Notas/inputs (p. ej. las notas del essay Part 1). */
  notes?: string[];
  minWords: number;
  maxWords: number;
  timeMinutes: number;
  tips: string[];
  /** Respuesta modelo (generada) para comparar después de escribir. */
  model?: string;
}

export interface PhraseGroup {
  id: string;
  title: string;
  use: string;
  phrases: string[];
}

export type SpeakingPart =
  | 'interview'
  | 'long-turn'
  | 'collaborative'
  | 'discussion'
  | 'presentation'
  | 'slp-interview'
  | 'slp-briefing'
  | 'slp-roleplay';

export interface SpeakingCard {
  meta: Meta;
  title: string;
  part: SpeakingPart;
  prompt: string;
  points: string[];
  prepSeconds: number;
  speakSeconds: number;
  usefulLanguage: string[];
  followUp?: string[];
}

export interface GrammarRef {
  id: string;
  title: string;
  summary: string;
  examples: string[];
  url?: string;
}

export interface ExternalResource {
  title: string;
  url: string;
  skill: Skill | 'general';
  provider: string;
  license: string;
  description: string;
}

// ---------- Progreso ----------

export interface Attempt {
  id: string;
  taskId: string;
  skill: Skill;
  topic: string;
  domain: Domain;
  date: string; // ISO
  score: number;
  max: number;
  errorTags: string[];
  durationSec?: number;
  mockId?: string;
}

export interface SrsState {
  ef: number;
  interval: number;
  reps: number;
  due: string; // YYYY-MM-DD
  lapses: number;
}

export interface WeeklyPlan {
  /** 0 = lunes ... 6 = domingo */
  days: { minutes: number; skills: Skill[] }[];
}

export interface Progress {
  version: 1;
  attempts: Attempt[];
  srs: Record<string, SrsState>;
  studyDays: string[]; // YYYY-MM-DD
  writings: Record<string, { text: string; updated: string; selfScore?: Record<string, number> }>;
  plan: WeeklyPlan;
  settings: { voiceRate: number; voiceName?: string; dailyNewCards: number };
}
