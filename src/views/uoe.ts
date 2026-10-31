import { useOfEnglish } from '../core/content';
import type { UoePart } from '../core/types';
import { badges, h } from '../ui/dom';
import { notFound, practice, sourceLine, taskList } from './common';

export const UOE_LABEL: Record<UoePart, string> = {
  'mc-cloze': 'Part 1 · Multiple-choice cloze',
  'open-cloze': 'Part 2 · Open cloze',
  'word-formation': 'Part 3 · Word formation',
  kwt: 'Part 4 · Key word transformation',
  'gapped-sentences': 'Gapped sentences (formato antiguo, práctica léxica)',
};

const TIME: Record<UoePart, number> = { 'mc-cloze': 8, 'open-cloze': 10, 'word-formation': 10, kwt: 12, 'gapped-sentences': 10 };

export function uoeView(main: HTMLElement, params: string[]) {
  if (!params[0]) {
    taskList(main, {
      title: 'Use of English',
      intro: [
        h('p', null, 'Parts 1-4 del Reading and Use of English del C1 y gapped sentences. Tras corregir verás la explicación de cada hueco y enlaces a la gramática relacionada con tus errores.'),
        h('p', { class: 'small' }, 'Consejo: en Part 4 (KWT) se puntúa 0-2 por pregunta; la app concede 1 punto por cada tramo correcto.'),
      ],
      items: useOfEnglish.map((t) => ({ id: t.meta.id, title: t.title, meta: t.meta, kind: t.part, kindLabel: UOE_LABEL[t.part], href: `#/uoe/${t.meta.id}`, extra: `${t.questions.length} ítems` })),
    });
    return;
  }
  const task = useOfEnglish.find((t) => t.meta.id === params[0]);
  if (!task) return notFound(main, '#/uoe');
  main.append(h('p', null, h('a', { href: '#/uoe' }, '← Use of English')), h('h1', null, task.title), h('div', { class: 'small muted' }, UOE_LABEL[task.part]), badges(task.meta), h('p', { class: 'notice' }, task.instructions));
  const box = h('div');
  main.append(box, sourceLine(task.meta));
  return practice(box, task.meta, { uid: task.meta.id, questions: task.questions, text: task.text }, { timeMinutes: TIME[task.part] });
}
