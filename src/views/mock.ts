import { listening, reading, speakingCards, useOfEnglish, writingTasks } from '../core/content';
import { countWords, type TaskGrade } from '../core/grading';
import { cambridgeBand, overallCambridge, percentToCambridge, percentToSlp, slpProfile } from '../core/scoring';
import { store } from '../core/store';
import type { Meta, Skill } from '../core/types';
import { bar, beep, fmtTime, h, shuffle, timer, SKILL_LABEL } from '../ui/dom';
import { buildExercise, type ExerciseHandle } from '../ui/exercise';
import { listeningPlayer } from './listening';
import { SPEAKING_RUBRIC } from './speaking';
import { WRITING_RUBRIC } from './writing';

interface Picked<T> {
  meta: Meta;
  item: T;
}

function pick<T extends { meta: Meta }>(list: T[], pred: (t: T) => boolean, n = 1): T[] {
  const done = new Set(store.data.attempts.map((a) => a.taskId));
  const pool = list.filter(pred);
  const fresh = shuffle(pool.filter((t) => !done.has(t.meta.id)));
  const old = shuffle(pool.filter((t) => done.has(t.meta.id)));
  return [...fresh, ...old].slice(0, n);
}

interface SectionResult {
  skill: Skill;
  score: number;
  max: number;
  tasks: { meta: Meta; score: number; max: number; errorTags: string[] }[];
}

interface Section {
  skill: Skill;
  title: string;
  minutes: number;
  /** Construye la sección; devuelve el elemento y una función que corrige. */
  build(): { el: HTMLElement; finish(): SectionResult; dispose?(): void };
}

// ---------- Secciones ----------

function objectiveSection(skill: Skill, title: string, minutes: number, items: Picked<any>[]): Section {
  return {
    skill,
    title,
    minutes,
    build() {
      const el = h('div');
      const handles: { meta: Meta; ex: ExerciseHandle }[] = [];
      items.forEach(({ meta, item }, k) => {
        const head = h('h2', null, `${k + 1}. ${item.title}`);
        const instr = h('p', { class: 'notice' }, item.instructions ?? '');
        const player = skill === 'listening' ? listeningPlayer(item, { showTranscriptToggle: false }) : null;
        const ex = buildExercise({ uid: `mock-${meta.id}`, questions: item.questions, text: item.text, sections: item.sections, gapStyle: item.format === 'gapped-text' ? 'paragraph' : 'inline' });
        handles.push({ meta, ex });
        el.append(head, instr, player ?? '', ex.el);
      });
      return {
        el,
        finish() {
          const tasks = handles.map(({ meta, ex }) => {
            const g: TaskGrade = ex.grade();
            ex.reveal(g);
            ex.lock();
            return { meta, score: g.score, max: g.max, errorTags: g.errorTags };
          });
          window.speechSynthesis?.cancel();
          return { skill, score: tasks.reduce((a, t) => a + t.score, 0), max: tasks.reduce((a, t) => a + t.max, 0), tasks };
        },
        dispose: () => window.speechSynthesis?.cancel(),
      };
    },
  };
}

function rubricBlock(rubric: { key: string; label: string; hint: string }[], prefix: string) {
  const scores: Record<string, number> = {};
  const el = h(
    'div',
    { class: 'card' },
    h('h3', null, 'Autoevaluación (0-5)'),
    rubric.map((r) => {
      const sel = h('select', { id: `${prefix}-${r.key}` }, h('option', { value: '' }, '—'), [0, 1, 2, 3, 4, 5].map((v) => h('option', { value: String(v) }, String(v))));
      sel.addEventListener('change', () => (sel.value === '' ? delete scores[r.key] : (scores[r.key] = Number(sel.value))));
      return h('div', { class: 'q' }, h('label', { for: `${prefix}-${r.key}` }, h('strong', null, r.label), ' '), sel, h('div', { class: 'small muted' }, r.hint));
    }),
  );
  return { el, scores };
}

function writingSection(title: string, minutes: number, tasks: typeof writingTasks): Section {
  return {
    skill: 'writing',
    title,
    minutes,
    build() {
      const el = h('div', null, h('p', { class: 'notice' }, 'Escribe ambos textos. Al terminar la sección podrás autoevaluarlos con la rúbrica (sé estricto; mejor aún: exporta y pide corrección externa desde la sección Writing).'));
      const parts = tasks.map((t, k) => {
        const ta = h('textarea', { 'aria-label': `Texto ${k + 1}`, lang: 'en', style: 'min-height:260px' });
        const wc = h('span', { class: 'wordcount' }, '0 palabras');
        ta.addEventListener('input', () => {
          const n = countWords(ta.value);
          wc.textContent = `${n} palabras (${t.minWords}-${t.maxWords})`;
          wc.className = `wordcount ${n >= t.minWords && n <= t.maxWords ? 'ok' : 'bad'}`;
        });
        const rb = rubricBlock(WRITING_RUBRIC, `mw${k}`);
        rb.el.hidden = true;
        el.append(h('h2', null, `${k + 1}. ${t.title}`), h('div', { class: 'card' }, t.prompt.split(/\n+/).map((p) => h('p', null, p)), t.notes?.length ? h('ul', null, t.notes.map((n) => h('li', null, n))) : null), ta, wc, rb.el);
        return { t, ta, rb };
      });
      return {
        el,
        finish() {
          parts.forEach((p) => {
            p.rb.el.hidden = false;
            p.ta.readOnly = true;
            store.data.writings[p.t.meta.id] = { text: p.ta.value, updated: new Date().toISOString() };
          });
          store.save();
          return {
            skill: 'writing',
            score: 0,
            max: 0,
            tasks: parts.map((p) => ({ meta: p.t.meta, score: 0, max: 0, errorTags: [] })),
            // la puntuación real se lee después de la autoevaluación (ver evaluateSelf)
            _parts: parts,
          } as any;
        },
      };
    },
  };
}

function speakingSection(title: string, minutes: number, cards: typeof speakingCards): Section {
  return {
    skill: 'speaking',
    title,
    minutes,
    build() {
      const el = h('div', null, h('p', { class: 'notice' }, 'Haz cada parte en voz alta con su temporizador (grábate desde la sección Speaking si quieres escucharte después). Al terminar, autoevalúa la prueba completa.'));
      const timers: ReturnType<typeof timer>[] = [];
      cards.forEach((c, k) => {
        const t = timer({ countdown: c.speakSeconds, onEnd: () => beep(440, 500) });
        timers.push(t);
        const b = h('button', { type: 'button' }, `▶ Empezar ${c.prepSeconds ? `(prep. ${c.prepSeconds}s)` : ''}`);
        b.addEventListener('click', () => {
          if (c.prepSeconds) {
            const p = timer({ countdown: c.prepSeconds, onEnd: () => { beep(990); t.start(); } });
            timers.push(p);
            b.replaceWith(h('span', null, 'Preparación ', p.el, ' · Intervención ', t.el));
            p.start();
          } else {
            b.replaceWith(h('span', null, 'Intervención ', t.el));
            beep(990);
            t.start();
          }
        });
        el.append(h('h2', null, `${k + 1}. ${c.title}`), h('div', { class: 'card' }, c.prompt.split(/\n+/).map((p) => h('p', null, p)), h('ul', null, c.points.map((p) => h('li', null, p))), h('div', { class: 'row' }, b, h('span', { class: 'small muted' }, fmtTime(c.speakSeconds)))));
      });
      const rb = rubricBlock(SPEAKING_RUBRIC, 'ms');
      rb.el.hidden = true;
      el.append(rb.el);
      return {
        el,
        finish() {
          timers.forEach((t) => t.stop());
          rb.el.hidden = false;
          return { skill: 'speaking', score: 0, max: 0, tasks: cards.map((c) => ({ meta: c.meta, score: 0, max: 0, errorTags: [] })), _rb: rb } as any;
        },
        dispose: () => timers.forEach((t) => t.stop()),
      };
    },
  };
}

// ---------- Definición de simulacros ----------

const P = <T extends { meta: Meta }>(xs: T[]): Picked<T>[] => xs.map((x) => ({ meta: x.meta, item: x }));

export interface MockDef {
  id: string;
  title: string;
  description: string;
  target: 'C1' | 'SLP3';
  sections: () => Section[];
}

const rue = () =>
  objectiveSection('reading', 'Reading and Use of English', 90, [
    ...P(pick(useOfEnglish, (t) => t.part === 'mc-cloze')),
    ...P(pick(useOfEnglish, (t) => t.part === 'open-cloze')),
    ...P(pick(useOfEnglish, (t) => t.part === 'word-formation')),
    ...P(pick(useOfEnglish, (t) => t.part === 'kwt')),
    ...P(pick(reading, (t) => t.format === 'multiple-choice')),
    ...P(pick(reading, (t) => t.format === 'cross-text')),
    ...P(pick(reading, (t) => t.format === 'gapped-text')),
    ...P(pick(reading, (t) => t.format === 'multiple-matching')),
  ]);
const lis = () =>
  objectiveSection('listening', 'Listening', 40, [
    ...P(pick(listening, (t) => t.part === 'part1', 3)),
    ...P(pick(listening, (t) => t.part === 'part2')),
    ...P(pick(listening, (t) => t.part === 'part3')),
    ...P(pick(listening, (t) => t.part === 'part4')),
  ]);
const wri = () => writingSection('Writing', 90, [...pick(writingTasks, (t) => t.genre === 'essay'), ...pick(writingTasks, (t) => ['report', 'proposal', 'email', 'letter', 'review'].includes(t.genre))]);
const spk = () =>
  speakingSection('Speaking', 15, [
    ...pick(speakingCards, (c) => c.part === 'interview'),
    ...pick(speakingCards, (c) => c.part === 'long-turn'),
    ...pick(speakingCards, (c) => c.part === 'collaborative'),
    ...pick(speakingCards, (c) => c.part === 'discussion'),
  ]);

export const MOCKS: MockDef[] = [
  { id: 'c1-rue', title: 'C1 · Reading and Use of English', description: '8 partes, 90 minutos.', target: 'C1', sections: () => [rue()] },
  { id: 'c1-lis', title: 'C1 · Listening', description: 'Parts 1-4 (aprox. 40 minutos). En el examen real cada audio se oye dos veces.', target: 'C1', sections: () => [lis()] },
  { id: 'c1-wri', title: 'C1 · Writing', description: 'Essay + una tarea de Part 2, 90 minutos, autoevaluada.', target: 'C1', sections: () => [wri()] },
  { id: 'c1-spk', title: 'C1 · Speaking', description: 'Partes 1-4 (15 minutos), autoevaluado.', target: 'C1', sections: () => [spk()] },
  { id: 'c1-full', title: 'C1 Advanced completo', description: 'Las cuatro pruebas seguidas (≈ 4 h). Hazlo en sábado por la mañana para simular el día del examen.', target: 'C1', sections: () => [rue(), wri(), lis(), spk()] },
  { id: 'slp-r', title: 'SLP 3 · Comprensión lectora', description: '3 textos profesionales, 50 minutos.', target: 'SLP3', sections: () => [objectiveSection('reading', 'Comprensión lectora', 50, P(pick(reading, (t) => t.format === 'stanag', 3)))] },
  { id: 'slp-l', title: 'SLP 3 · Comprensión auditiva', description: '3 audios profesionales, 30 minutos.', target: 'SLP3', sections: () => [objectiveSection('listening', 'Comprensión auditiva', 30, P(pick(listening, (t) => t.part === 'stanag', 3)))] },
  { id: 'slp-w', title: 'SLP 3 · Expresión escrita', description: 'Memorando de opinión + correo/informe profesional, 75 minutos.', target: 'SLP3', sections: () => [writingSection('Expresión escrita', 75, [...pick(writingTasks, (t) => t.genre === 'slp-memo'), ...pick(writingTasks, (t) => ['formal-email', 'technical-report', 'executive-summary'].includes(t.genre))])] },
  { id: 'slp-s', title: 'SLP 3 · Expresión oral', description: 'Entrevista + briefing + role-play (≈ 20 min).', target: 'SLP3', sections: () => [speakingSection('Expresión oral', 25, [...pick(speakingCards, (c) => c.part === 'slp-interview'), ...pick(speakingCards, (c) => c.part === 'slp-briefing'), ...pick(speakingCards, (c) => c.part === 'slp-roleplay')])] },
  {
    id: 'slp-full',
    title: 'SLP 3.3.3.3 completo',
    description: 'Las cuatro destrezas STANAG seguidas (≈ 3 h).',
    target: 'SLP3',
    sections: () => [
      objectiveSection('listening', 'Comprensión auditiva', 30, P(pick(listening, (t) => t.part === 'stanag', 3))),
      objectiveSection('reading', 'Comprensión lectora', 50, P(pick(reading, (t) => t.format === 'stanag', 3))),
      writingSection('Expresión escrita', 75, [...pick(writingTasks, (t) => t.genre === 'slp-memo'), ...pick(writingTasks, (t) => t.genre === 'formal-email')]),
      speakingSection('Expresión oral', 25, [...pick(speakingCards, (c) => c.part === 'slp-interview'), ...pick(speakingCards, (c) => c.part === 'slp-briefing'), ...pick(speakingCards, (c) => c.part === 'slp-roleplay')]),
    ],
  },
];

// ---------- Ejecución ----------

function runMock(main: HTMLElement, def: MockDef) {
  const sections = def.sections();
  const mockId = `${def.id}-${Date.now()}`;
  const results: SectionResult[] = [];
  let idx = 0;
  let current: ReturnType<Section['build']> | null = null;
  let t: ReturnType<typeof timer> | null = null;
  const head = h('div');
  const body = h('div');
  const bar0 = h('div', { class: 'sticky-bar' });
  main.append(h('p', null, h('a', { href: '#/simulacros' }, '← Simulacros')), h('h1', null, def.title), head, body, bar0);

  const next = () => {
    if (idx >= sections.length) return showResults();
    const s = sections[idx];
    current = s.build();
    head.replaceChildren(h('p', { class: 'muted' }, `Sección ${idx + 1} de ${sections.length}: ${s.title} · ${s.minutes} minutos`));
    body.replaceChildren(current.el);
    t = timer({ countdown: s.minutes * 60, label: 'Tiempo restante de la sección', onEnd: () => { beep(440, 600); endSection(); } });
    const endBtn = h('button', { type: 'button' }, 'Terminar sección y corregir');
    endBtn.addEventListener('click', () => confirm('¿Terminar esta sección?') && endSection());
    bar0.replaceChildren(endBtn, h('span', { class: 'spacer' }), t.el);
    t.start();
    window.scrollTo(0, 0);
  };
  const endSection = () => {
    t?.stop();
    const r = current!.finish();
    results.push(r);
    const nextBtn = h('button', { type: 'button' }, idx + 1 < sections.length ? 'Siguiente sección →' : 'Ver resultados');
    nextBtn.addEventListener('click', () => {
      current?.dispose?.();
      idx++;
      next();
    });
    const isSelf = r.skill === 'writing' || r.skill === 'speaking';
    bar0.replaceChildren(h('span', null, isSelf ? 'Rellena la autoevaluación de cada texto/prueba y continúa.' : `Resultado de la sección: ${r.score}/${r.max}. Revisa las explicaciones.`), h('span', { class: 'spacer' }), nextBtn);
  };
  const showResults = () => {
    // Completa puntuaciones autoevaluadas
    for (const r of results as any[]) {
      if (r._parts) {
        r.tasks = r._parts.map((p: any) => ({ meta: p.t.meta, score: Object.values(p.rb.scores as Record<string, number>).reduce((a, b) => a + b, 0), max: 20, errorTags: Object.entries(p.rb.scores as Record<string, number>).filter(([, v]) => v < 3).map(([k]) => `writing-${k}`) }));
      }
      if (r._rb) {
        const sc = r._rb.scores as Record<string, number>;
        const sum = Object.values(sc).reduce((a, b) => a + b, 0);
        r.tasks = [{ meta: r.tasks[0].meta, score: sum, max: 25, errorTags: Object.entries(sc).filter(([, v]) => v < 3).map(([k]) => `speaking-${k}`) }];
      }
      r.score = r.tasks.reduce((a: number, t: any) => a + t.score, 0);
      r.max = r.tasks.reduce((a: number, t: any) => a + t.max, 0);
      for (const tk of r.tasks) if (tk.max) store.addAttempt({ taskId: tk.meta.id, skill: r.skill, topic: tk.meta.topic, domain: tk.meta.domain, score: tk.score, max: tk.max, errorTags: tk.errorTags, mockId });
    }
    head.replaceChildren();
    bar0.remove();
    body.replaceChildren(mockReport(results, def.target));
    window.scrollTo(0, 0);
  };
  next();
  return () => {
    t?.stop();
    current?.dispose?.();
  };
}

export function mockReport(results: SectionResult[], target: 'C1' | 'SLP3') {
  const rows = results.map((r) => {
    const pct = r.max ? Math.round((r.score / r.max) * 100) : 0;
    return { skill: r.skill, label: r.skill === 'reading' && target === 'C1' ? 'Reading and Use of English' : SKILL_LABEL[r.skill], pct, scale: percentToCambridge(pct), slp: percentToSlp(pct), r };
  });
  const scaleAll = overallCambridge(rows.flatMap((x) => (x.skill === 'reading' && target === 'C1' ? [x.scale, x.scale] : [x.scale])));
  const slpLevels: Record<string, string> = {};
  rows.forEach((x) => (slpLevels[x.skill] = x.slp));
  return h(
    'div',
    null,
    h('h2', null, 'Resultados'),
    h(
      'div',
      { class: 'card', style: 'overflow-x:auto' },
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', null, 'Destreza'), h('th', null, 'Aciertos'), h('th', null, '%'), h('th', null, 'Escala Cambridge (aprox.)'), h('th', null, 'SLP (aprox.)'))),
        h('tbody', null, rows.map((x) => h('tr', null, h('td', null, x.label), h('td', null, `${x.r.score}/${x.r.max}`), h('td', null, `${x.pct} %`, bar(x.pct)), h('td', null, `${x.scale} (${cambridgeBand(x.scale)})`), h('td', null, x.slp)))),
      ),
    ),
    rows.length > 1
      ? h('p', { class: 'result' }, target === 'C1' ? `Global estimado: ${scaleAll} → ${cambridgeBand(scaleAll)}` : `Perfil SLP estimado (L.S.R.W): ${slpProfile(slpLevels as any)}`)
      : null,
    h('p', { class: 'small muted' }, 'Estimaciones orientativas: Cambridge ≈ 60 % → 180 (C1) y ≈ 80 % → 200 (C2); SLP 3 ≈ 70 % de acierto en tareas de nivel 3. En el C1 real, Reading and Use of English cuenta doble (Reading y Use of English por separado). Writing y Speaking proceden de tu autoevaluación.'),
    h('p', null, h('a', { class: 'btn', href: '#/progreso' }, 'Ver progreso'), ' ', h('a', { class: 'btn secondary', href: '#/simulacros' }, 'Otro simulacro')),
  );
}

export function mockView(main: HTMLElement, params: string[]) {
  const def = MOCKS.find((m) => m.id === params[0]);
  if (def) return runMock(main, def);
  main.append(
    h('h1', null, 'Simulacros'),
    h('p', { class: 'muted' }, 'Exámenes cronometrados por destreza o completos, compuestos con ejercicios del banco (prioriza los que no has hecho). Al terminar obtienes una puntuación estimada en la escala Cambridge y en niveles SLP.'),
  );
  main.append(h('div', { class: 'card' }, h('strong', null, 'Oposiciones IIE y Minas: '), 'el ejercicio de inglés del cuerpo (resumen de un texto leído dos veces + traducción directa + oral con el tribunal) tiene su propia sección: ', h('a', { href: '#/cuerpos' }, 'Inglés IIE/Minas'), '.'));
  for (const target of ['C1', 'SLP3'] as const) {
    main.append(h('h2', null, target === 'C1' ? 'Cambridge C1 Advanced' : 'SLP 3 (STANAG 6001)'));
    main.append(h('div', { class: 'grid' }, MOCKS.filter((m) => m.target === target).map((m) => h('a', { class: 'tile', href: `#/simulacros/${m.id}` }, h('h3', null, m.title), h('p', { class: 'small muted' }, m.description)))));
  }
  const history = new Map<string, { date: string; skill: string; score: number; max: number }[]>();
  for (const a of store.data.attempts) if (a.mockId) history.set(a.mockId, [...(history.get(a.mockId) ?? []), { date: a.date, skill: a.skill, score: a.score, max: a.max }]);
  if (history.size) {
    main.append(h('h2', null, 'Historial'));
    const tbody = h('tbody');
    [...history.entries()].reverse().slice(0, 20).forEach(([id, list]) => {
      const def2 = MOCKS.find((m) => id.startsWith(m.id + '-'));
      const sc = list.reduce((a, b) => a + b.score, 0);
      const mx = list.reduce((a, b) => a + b.max, 0);
      const pct = mx ? Math.round((sc / mx) * 100) : 0;
      tbody.append(h('tr', null, h('td', null, new Date(list[0].date).toLocaleDateString('es-ES')), h('td', null, def2?.title ?? id), h('td', null, `${pct} %`), h('td', null, def2?.target === 'SLP3' ? `SLP ≈ ${percentToSlp(pct)}` : `≈ ${percentToCambridge(pct)} (${cambridgeBand(percentToCambridge(pct))})`)));
    });
    main.append(h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Fecha'), h('th', null, 'Simulacro'), h('th', null, '%'), h('th', null, 'Estimación'))), tbody)));
  }
}
