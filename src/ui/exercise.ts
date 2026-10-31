import { gradeTask, type TaskGrade } from '../core/grading';
import { grammarById } from '../core/content';
import type { Question, Section } from '../core/types';
import { h, LETTERS } from './dom';

export interface ExerciseSpec {
  uid: string; // prefijo único para ids de formulario
  questions: Question[];
  text?: string;
  sections?: Section[];
  /** paragraph: huecos de párrafo completo (gapped text); inline: cloze */
  gapStyle?: 'inline' | 'paragraph';
  showStems?: boolean;
}

export interface ExerciseHandle {
  el: HTMLElement;
  responses(): (string | number | null)[];
  grade(): TaskGrade;
  reveal(g: TaskGrade): void;
  lock(): void;
}

/** Construye un ejercicio interactivo (texto con huecos y/o lista de preguntas). */
export function buildExercise(spec: ExerciseSpec): ExerciseHandle {
  const { questions, uid } = spec;
  const controls: (HTMLInputElement | HTMLSelectElement | HTMLInputElement[] | null)[] = questions.map(() => null);
  const fbSlots: HTMLElement[] = questions.map((_, i) => h('div', { id: `${uid}-fb-${i}`, 'aria-live': 'polite' }));
  const root = h('div', { class: 'exercise' });
  const inlineGaps = !!spec.text && /\[\[\d+\]\]/.test(spec.text);
  const paragraphGaps = spec.gapStyle === 'paragraph';

  // ---- Texto con huecos ----
  if (spec.text) {
    const body = h('div', { class: 'text-body card' });
    for (const para of spec.text.split(/\n\s*\n/)) {
      const p = h('p');
      const parts = para.split(/(\[\[\d+\]\])/);
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        const m = part.match(/^\[\[(\d+)\]\]$/);
        if (!m) {
          if (part) p.append(part);
          continue;
        }
        const idx = Number(m[1]) - 1;
        const q = questions[idx];
        if (!q) continue;
        p.append(h('span', { class: 'gapno' }, `(${idx + 1}) `));
        if (q.kind === 'choice') {
          const sel = h(
            'select',
            { class: 'gap-select', id: `${uid}-q${idx}`, 'aria-label': `Hueco ${idx + 1}` },
            h('option', { value: '' }, paragraphGaps ? '— elige párrafo —' : '—'),
            q.options!.map((o, i) => h('option', { value: String(i) }, paragraphGaps ? `${LETTERS[i]}` : `${LETTERS[i]}  ${o}`)),
          );
          controls[idx] = sel;
          p.append(sel);
        } else {
          const inp = h('input', { type: 'text', class: 'gap-input', id: `${uid}-q${idx}`, autocomplete: 'off', autocapitalize: 'off', spellcheck: false, 'aria-label': `Hueco ${idx + 1}${q.stem ? `, palabra base ${q.stem}` : ''}` });
          controls[idx] = inp;
          p.append(inp);
          const stemInText = /^\s*\(?[A-Z]{3,}\)?/.test(parts[pi + 1] ?? '');
          if (q.stem && spec.showStems !== false && !stemInText) p.append(h('span', { class: 'stem' }, ` [${q.stem}]`));
        }
      }
      body.append(p);
    }
    root.append(body);

    if (paragraphGaps && questions[0]?.options) {
      root.append(
        h('div', { class: 'card para-bank' }, h('h3', null, 'Párrafos para colocar'), questions[0].options.map((o, i) => h('div', { class: 'para' }, h('strong', null, `${LETTERS[i]}. `), o))),
      );
    }
  }

  // ---- Secciones (multiple matching / cross-text) ----
  if (spec.sections?.length) {
    root.append(
      h(
        'div',
        { class: 'card text-body' },
        spec.sections.map((s) => h('div', { class: 'section-box' }, h('h3', null, `${s.label}${s.title ? ` · ${s.title}` : ''}`), s.text.split(/\n\s*\n/).map((t) => h('p', null, t)))),
      ),
    );
  }

  // ---- Lista de preguntas ----
  const list = h('div', { class: 'card questions' });
  questions.forEach((q, i) => {
    const qEl = h('div', { class: 'q' });
    if (inlineGaps && controls[i]) {
      qEl.append(h('div', { class: 'small muted' }, `Hueco ${i + 1}`), fbSlots[i]);
      list.append(qEl);
      return;
    }
    if (q.kind === 'choice') {
      const letters = !!spec.sections?.length && q.options!.every((o) => o.length < 60);
      const radios: HTMLInputElement[] = [];
      const fs = h(
        'fieldset',
        null,
        h('legend', null, `${i + 1}. ${q.prompt ?? ''}`),
        q.options!.map((o, j) => {
          const r = h('input', { type: 'radio', name: `${uid}-q${i}`, value: String(j), id: `${uid}-q${i}-${j}` });
          radios.push(r);
          return h('label', { class: 'opt', for: `${uid}-q${i}-${j}` }, r, h('span', null, h('strong', null, `${LETTERS[j]} `), letters ? o.replace(/^[A-Z]\s*[–-]\s*/, '') : o));
        }),
      );
      controls[i] = radios;
      qEl.append(fs, fbSlots[i]);
    } else {
      const id = `${uid}-q${i}`;
      const inp = h('input', { type: 'text', id, autocomplete: 'off', autocapitalize: 'off', spellcheck: false, style: 'width:100%;max-width:520px' });
      controls[i] = inp;
      if (q.original) {
        qEl.append(
          h('p', null, h('strong', null, `${i + 1}. `), q.original),
          h('p', null, h('span', { class: 'badge' }, q.keyword ?? '')),
          h('p', null, (q.prompt ?? '').replace(/_{3,}/, ' ______ ')),
          h('label', { for: id, class: 'small muted' }, 'Tu respuesta (3-6 palabras, incluida la palabra clave):'),
          h('div', null, inp),
          fbSlots[i],
        );
      } else {
        qEl.append(h('label', { for: id }, h('strong', null, `${i + 1}. `), (q.prompt ?? '').split(' / ').map((s, k) => h('span', { style: 'display:block' }, (k ? '• ' : '') + s))), h('div', null, inp), fbSlots[i]);
      }
    }
    list.append(qEl);
  });
  root.append(list);

  const responses = () =>
    controls.map((c) => {
      if (!c) return null;
      if (Array.isArray(c)) {
        const r = c.find((x) => x.checked);
        return r ? Number(r.value) : null;
      }
      if (c instanceof HTMLSelectElement) return c.value === '' ? null : Number(c.value);
      return c.value;
    });

  return {
    el: root,
    responses,
    grade: () => gradeTask(questions, responses()),
    lock() {
      controls.forEach((c) => (Array.isArray(c) ? c.forEach((x) => (x.disabled = true)) : c && (c.disabled = true)));
    },
    reveal(g: TaskGrade) {
      const resp = responses();
      questions.forEach((q, i) => {
        const r = g.results[i];
        const c = controls[i];
        if (c && !Array.isArray(c)) c.classList.add(r.correct ? 'ok' : 'bad');
        const correctTxt =
          q.kind === 'choice' ? `${LETTERS[q.answer!]}${paragraphGaps || (q.options![q.answer!]?.length ?? 0) > 80 ? '' : ` (${q.options![q.answer!]})`}` : (q.accepted ?? []).slice(0, 4).join(' / ');
        const given = resp[i] === null || resp[i] === '' ? '(sin respuesta)' : q.kind === 'choice' ? LETTERS[Number(resp[i])] : String(resp[i]);
        const g2 = q.grammarRef ? grammarById(q.grammarRef) : undefined;
        const slot = fbSlots[i];
        slot.replaceChildren(
          h(
            'div',
            { class: `feedback ${r.correct ? 'ok' : 'bad'}` },
            r.correct ? '✔ Correcto' : `✘ ${r.score > 0 ? `Parcial (${r.score}/${r.max})` : 'Incorrecto'} — tu respuesta: ${given} · correcta: ${correctTxt}`,
            h('span', { class: 'exp' }, q.explanation),
            !r.correct && g2 ? h('span', { class: 'exp small' }, '📘 Repasa: ', h('a', { href: `#/gramatica/${g2.id}` }, g2.title)) : null,
          ),
        );
      });
    },
  };
}

/** Bloque de resumen tras corregir, con enlaces a gramática relacionada con los errores. */
export function gradeSummary(g: TaskGrade) {
  const pct = g.max ? Math.round((g.score / g.max) * 100) : 0;
  return h(
    'div',
    { class: 'card', role: 'status', 'aria-live': 'polite' },
    h('p', { class: 'result' }, `Puntuación: ${g.score}/${g.max} (${pct} %)`),
    g.grammarRefs.length
      ? h(
          'p',
          null,
          'Gramática a repasar según tus errores: ',
          g.grammarRefs.map((id, i) => {
            const r = grammarById(id);
            return r ? [i ? ', ' : '', h('a', { href: `#/gramatica/${id}` }, r.title)] : null;
          }),
        )
      : null,
  );
}
