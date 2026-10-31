// Carga de contenido en tiempo de build (Vite import.meta.glob).
// data/private/ solo existe en local (está en .gitignore): si está, se incluye; si no, se ignora.
import type {
  CuerpoExam,
  Deck,
  ExternalResource,
  GrammarRef,
  ListeningTask,
  PhraseGroup,
  ReadingTask,
  SpeakingCard,
  UoeTask,
  WritingTask,
} from './types';
import grammar from '../../data/grammar.json';
import { IS_OPO } from './edition';
import resources from '../../data/resources.json';

type Mod = Record<string, unknown>;

/** En la edición «opo» (OpoIndustriales) se excluye el contenido del ámbito policial. */
function flatten<T>(mods: Mod): T[] {
  return flattenAll<T>(mods).filter((x) => !IS_OPO || (x as { meta?: { domain?: string } })?.meta?.domain !== 'police');
}

function flattenAll<T>(mods: Mod): T[] {
  return Object.keys(mods)
    .sort()
    .flatMap((k) => {
      const m = mods[k] as { default?: unknown };
      const v = (m && 'default' in m ? m.default : m) as unknown;
      return Array.isArray(v) ? (v as T[]) : [];
    });
}

const readingMods = import.meta.glob(['../../data/reading/*.json', '../../data/private/reading/*.json'], { eager: true });
const uoeMods = import.meta.glob(['../../data/useofenglish/*.json', '../../data/private/useofenglish/*.json'], { eager: true });
const listeningMods = import.meta.glob(['../../data/listening/*.json', '../../data/private/listening/*.json'], { eager: true });
const vocabMods = import.meta.glob(['../../data/vocabulary/*.json', '../../data/private/vocabulary/*.json'], { eager: true });
const writingMods = import.meta.glob(['../../data/writing/tasks*.json', '../../data/private/writing/*.json'], { eager: true });
const phraseMods = import.meta.glob('../../data/writing/phrase-bank.json', { eager: true });
const speakingMods = import.meta.glob(['../../data/speaking/cards*.json', '../../data/private/speaking/*.json'], { eager: true });
const debateMods = import.meta.glob('../../data/speaking/debate-questions.json', { eager: true });
const cuerpoMods = import.meta.glob(['../../data/cuerpos/*.json', '../../data/private/cuerpos/*.json'], { eager: true });
const materialIndexMods = import.meta.glob('../../data/private/material-index.json', { eager: true });

export const reading = flatten<ReadingTask>(readingMods);
export const useOfEnglish = flatten<UoeTask>(uoeMods);
export const listening = flatten<ListeningTask>(listeningMods);
export const decks = flatten<Deck>(vocabMods).filter((d) => d && d.meta && Array.isArray(d.cards));
export const writingTasks = flatten<WritingTask>(writingMods);
export const phraseBank = flatten<PhraseGroup>(phraseMods);
export const speakingCards = flatten<SpeakingCard>(speakingMods);
export const debateQuestions = flattenAll<{ topic: string; domain: string; questions: string[] }>(debateMods).filter((g) => !IS_OPO || g.domain !== 'police');
export const cuerpoExams = flatten<CuerpoExam>(cuerpoMods);
export const grammarRefs = grammar as GrammarRef[];
export const externalResources = resources as ExternalResource[];
export const materialIndex = flatten<{ title: string; type: string; skill: string; folder: string; url: string; usage: string }>(materialIndexMods);

export function grammarById(id: string): GrammarRef | undefined {
  return grammarRefs.find((g) => g.id === id);
}

export interface AnyTask {
  id: string;
  skill: string;
  title: string;
  topic: string;
  domain: string;
  route: string;
}

/** Índice plano de todas las tareas, para recomendaciones y búsquedas. */
export function allTasks(): AnyTask[] {
  return [
    ...reading.map((t) => ({ id: t.meta.id, skill: 'reading', title: t.title, topic: t.meta.topic, domain: t.meta.domain, route: `#/reading/${t.meta.id}` })),
    ...useOfEnglish.map((t) => ({ id: t.meta.id, skill: 'useofenglish', title: t.title, topic: t.meta.topic, domain: t.meta.domain, route: `#/uoe/${t.meta.id}` })),
    ...listening.map((t) => ({ id: t.meta.id, skill: 'listening', title: t.title, topic: t.meta.topic, domain: t.meta.domain, route: `#/listening/${t.meta.id}` })),
    ...writingTasks.map((t) => ({ id: t.meta.id, skill: 'writing', title: t.title, topic: t.meta.topic, domain: t.meta.domain, route: `#/writing/${t.meta.id}` })),
    ...speakingCards.map((t) => ({ id: t.meta.id, skill: 'speaking', title: t.title, topic: t.meta.topic, domain: t.meta.domain, route: `#/speaking/${t.meta.id}` })),
    ...cuerpoExams.map((t) => ({ id: t.meta.id, skill: 'writing', title: `${t.cuerpo}: ${t.title}`, topic: t.meta.topic, domain: t.meta.domain, route: `#/cuerpos/${t.meta.id}` })),
  ];
}
