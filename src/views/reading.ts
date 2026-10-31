import { reading } from '../core/content';
import type { ReadingFormat } from '../core/types';
import { badges, h } from '../ui/dom';
import { notFound, practice, sourceLine, taskList } from './common';

export const READING_LABEL: Record<ReadingFormat, string> = {
  'multiple-choice': 'Part 5 · Multiple choice',
  'cross-text': 'Part 6 · Cross-text matching',
  'gapped-text': 'Part 7 · Gapped text',
  'multiple-matching': 'Part 8 · Multiple matching',
  stanag: 'SLP 3 · Comprensión (idea principal, inferencia, tono)',
};

const DEFAULT_TIME: Record<ReadingFormat, number> = { 'multiple-choice': 18, 'cross-text': 12, 'gapped-text': 18, 'multiple-matching': 15, stanag: 15 };

export function readingView(main: HTMLElement, params: string[]) {
  if (!params[0]) {
    taskList(main, {
      title: 'Reading',
      intro: [
        h('p', null, 'Textos C1 generales, industriales y policiales con el formato del Reading and Use of English (Parts 5-8) y preguntas al estilo STANAG nivel 3: idea principal, detalle, inferencia, tono y propósito del autor.'),
      ],
      items: reading.map((t) => ({ id: t.meta.id, title: t.title, meta: t.meta, kind: t.format, kindLabel: READING_LABEL[t.format], href: `#/reading/${t.meta.id}`, extra: `${t.questions.length} preguntas` })),
    });
    return;
  }
  const task = reading.find((t) => t.meta.id === params[0]);
  if (!task) return notFound(main, '#/reading');
  main.append(
    h('p', null, h('a', { href: '#/reading' }, '← Reading')),
    h('h1', null, task.title),
    h('div', { class: 'small muted' }, READING_LABEL[task.format]),
    badges(task.meta),
    h('p', { class: 'notice' }, task.instructions),
  );
  const box = h('div');
  main.append(box, sourceLine(task.meta));
  return practice(
    box,
    task.meta,
    { uid: task.meta.id, questions: task.questions, text: task.text, sections: task.sections, gapStyle: task.format === 'gapped-text' ? 'paragraph' : 'inline' },
    { timeMinutes: task.timeMinutes ?? DEFAULT_TIME[task.format] },
  );
}
