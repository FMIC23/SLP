import { phraseBank, writingTasks } from '../core/content';
import { countWords } from '../core/grading';
import { rubricPercent } from '../core/scoring';
import { store } from '../core/store';
import type { WritingGenre, WritingTask } from '../core/types';
import { badges, download, h, timer } from '../ui/dom';
import { notFound, sourceLine, taskList } from './common';

export const GENRE_LABEL: Record<WritingGenre, string> = {
  essay: 'Essay (Part 1)',
  report: 'Report (Part 2)',
  proposal: 'Proposal (Part 2)',
  email: 'Email (Part 2)',
  letter: 'Letter (Part 2)',
  review: 'Review (Part 2)',
  'technical-report': 'Informe técnico (profesional)',
  'executive-summary': 'Resumen ejecutivo (profesional)',
  'formal-email': 'Correo formal (profesional)',
  'slp-memo': 'Memorando / opinión (SLP 3)',
};

/** Rúbrica de Writing del C1 (4 escalas de 0 a 5). Descripciones resumidas con palabras propias. */
export const WRITING_RUBRIC = [
  { key: 'content', label: 'Content (contenido)', hint: 'Todo el contenido es relevante y el lector queda totalmente informado. ¿Has cubierto TODOS los puntos?' },
  { key: 'communicative', label: 'Communicative achievement', hint: 'Registro, formato y tono adecuados al género y al lector; ideas complejas transmitidas con eficacia.' },
  { key: 'organisation', label: 'Organisation', hint: 'Texto bien estructurado, párrafos claros, variedad de conectores y mecanismos de cohesión.' },
  { key: 'language', label: 'Language', hint: 'Gama de vocabulario (incluido menos común) y estructuras complejas con control; los errores no dificultan.' },
];

const CHECKLIST: Record<string, string[]> = {
  common: [
    'He respondido a TODAS las partes de la tarea',
    'Estoy dentro del rango de palabras',
    'Registro coherente (formal/semiformal) de principio a fin',
    'Párrafos con una idea principal cada uno',
    'Al menos 5 conectores variados (no solo and/but/because)',
    'Al menos 2 estructuras avanzadas (inversión, cleft, condicional mixta, pasiva impersonal, participio)',
    'Vocabulario preciso: collocations y algún término C1',
    'He revisado concordancia, tiempos verbales, artículos y preposiciones',
  ],
  essay: ['Introducción que parafrasea el tema', 'Desarrollo de DOS de los tres puntos de las notas', 'Conclusión con opinión razonada sobre cuál es más importante/eficaz'],
  report: ['Título y encabezados', 'Propósito del informe en la introducción', 'Recomendaciones claras al final', 'Tono impersonal (it was found that...)'],
  proposal: ['Título y encabezados', 'Situación actual → propuesta → beneficios', 'Lenguaje persuasivo y de recomendación'],
  review: ['Título atractivo', 'Descripción + valoración (no solo resumen)', 'Recomendación final al lector'],
  email: ['Saludo y despedida adecuados', 'Motivo del correo al inicio', 'Peticiones/acciones claras'],
  letter: ['Saludo y despedida formales (Dear Sir or Madam / Yours faithfully)', 'Motivo al inicio', 'Petición/acción clara'],
  'technical-report': ['Resumen/objeto, antecedentes, hallazgos, causas, acciones correctoras', 'Datos concretos (fechas, horas, cifras, unidades)', 'Voz pasiva y nominalización'],
  'executive-summary': ['Conclusión/recomendación al principio', 'Cifras clave', 'Frases cortas, sin jerga innecesaria'],
  'formal-email': ['Asunto claro', 'Petición concreta y plazo', 'Despedida formal y datos de contacto'],
  'slp-memo': ['TO/FROM/DATE/SUBJECT', 'Opinión defendida con argumentos', 'Hipótesis (if..., were..., should...) y consecuencias'],
};

function writingList(main: HTMLElement) {
  taskList(main, {
    title: 'Writing',
    intro: [
      h('p', null, 'Tareas C1 (essay obligatorio de 220-260 palabras y Part 2 a elegir) y tareas profesionales/SLP 3. Editor con contador de palabras, temporizador, checklist, rúbrica de autoevaluación, modelo de respuesta y exportación en Markdown para pedir corrección externa.'),
      h('p', null, h('a', { href: '#/writing/frases' }, '→ Banco de conectores, estructuras y frases modelo')),
    ],
    items: writingTasks.map((t) => ({ id: t.meta.id, title: t.title, meta: t.meta, kind: t.genre, kindLabel: GENRE_LABEL[t.genre] ?? t.genre, href: `#/writing/${t.meta.id}`, extra: `${t.minWords}-${t.maxWords} palabras · ${t.timeMinutes} min` })),
  });
}

function phraseView(main: HTMLElement) {
  main.append(h('p', null, h('a', { href: '#/writing' }, '← Writing')), h('h1', null, 'Banco de frases para Writing'));
  const q = h('input', { type: 'search', placeholder: 'Buscar (p. ej. however, recommend)…', 'aria-label': 'Buscar frase' });
  const box = h('div');
  const draw = () => {
    const term = q.value.toLowerCase();
    box.replaceChildren(
      ...phraseBank
        .map((g) => ({ g, ph: g.phrases.filter((p) => !term || p.toLowerCase().includes(term) || g.title.toLowerCase().includes(term)) }))
        .filter((x) => x.ph.length)
        .map(({ g, ph }) => h('details', { class: 'card', open: !!term }, h('summary', null, g.title), h('p', { class: 'small muted' }, g.use), h('ul', null, ph.map((p) => h('li', null, p))))),
    );
  };
  q.addEventListener('input', draw);
  main.append(h('div', { class: 'filters' }, q), box);
  draw();
}

export function exportMarkdown(task: WritingTask, text: string, scores: Record<string, number>): string {
  const wc = countWords(text);
  return [
    `# ${task.title}`,
    '',
    `- Tipo: ${GENRE_LABEL[task.genre]} · Nivel objetivo: ${task.meta.level}`,
    `- Extensión: ${wc} palabras (pedidas ${task.minWords}-${task.maxWords})`,
    `- Fecha: ${new Date().toLocaleString('es-ES')}`,
    '',
    '## Enunciado',
    '',
    task.prompt,
    ...(task.notes?.length ? ['', ...task.notes.map((n) => `- ${n}`)] : []),
    '',
    '## Mi texto',
    '',
    text,
    '',
    '## Autoevaluación (0-5)',
    '',
    ...WRITING_RUBRIC.map((r) => `- ${r.label}: ${scores[r.key] ?? '-'}`),
    '',
    '## Petición de corrección',
    '',
    `Por favor, corrige este texto como un examinador del Cambridge C1 Advanced${task.meta.level !== 'C1' ? ' y del SLP nivel 3 (STANAG 6001)' : ''}: puntúa de 0 a 5 Content, Communicative Achievement, Organisation y Language, señala los errores con su corrección y explicación en español, y sugiere 5 mejoras de vocabulario/estructuras de nivel C1.`,
  ].join('\n');
}

function editorView(main: HTMLElement, task: WritingTask) {
  const saved = store.data.writings[task.meta.id];
  main.append(h('p', null, h('a', { href: '#/writing' }, '← Writing')), h('h1', null, task.title), h('div', { class: 'small muted' }, GENRE_LABEL[task.genre]), badges(task.meta));
  main.append(
    h('div', { class: 'card' }, h('h2', null, 'Enunciado'), task.prompt.split(/\n+/).map((p) => h('p', null, p)), task.notes?.length ? h('ul', null, task.notes.map((n) => h('li', null, n))) : null, h('p', { class: 'small muted' }, `Escribe entre ${task.minWords} y ${task.maxWords} palabras. Tiempo recomendado: ${task.timeMinutes} minutos.`)),
    h('details', { class: 'card' }, h('summary', null, 'Consejos para esta tarea'), h('ul', null, task.tips.map((t) => h('li', null, t)))),
  );
  const ta = h('textarea', { id: 'w-text', 'aria-label': 'Tu texto', spellcheck: true, lang: 'en' });
  ta.value = saved?.text ?? '';
  const wc = h('span', { class: 'wordcount', 'aria-live': 'polite' });
  const t = timer({ countdown: task.timeMinutes * 60, label: 'Tiempo restante' });
  const startBtn = h('button', { type: 'button', class: 'secondary' }, '▶ Iniciar tiempo');
  startBtn.addEventListener('click', () => {
    if (t.running) {
      t.stop();
      startBtn.textContent = '▶ Reanudar';
    } else {
      t.start();
      startBtn.textContent = '⏸ Pausar';
    }
  });
  let saveTimer = 0;
  const update = () => {
    const n = countWords(ta.value);
    wc.textContent = `${n} palabras`;
    wc.className = `wordcount ${n >= task.minWords && n <= task.maxWords ? 'ok' : n > 0 ? 'bad' : ''}`;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      store.data.writings[task.meta.id] = { ...(store.data.writings[task.meta.id] ?? {}), text: ta.value, updated: new Date().toISOString() };
      store.save();
    }, 600);
  };
  ta.addEventListener('input', update);
  update();
  main.append(h('label', { for: 'w-text', class: 'visually-hidden' }, 'Tu texto'), h('div', { class: 'card' }, ta, h('div', { class: 'sticky-bar' }, startBtn, t.el, h('span', { class: 'spacer' }), wc, h('span', { class: 'small muted' }, '· guardado automático'))));

  // Checklist
  const items = [...CHECKLIST.common, ...(CHECKLIST[task.genre] ?? [])];
  main.append(h('details', { class: 'card' }, h('summary', null, 'Checklist de autoevaluación'), items.map((it, i) => h('label', { class: 'opt', for: `ck-${i}` }, h('input', { type: 'checkbox', id: `ck-${i}` }), it))));

  // Rúbrica
  const scores: Record<string, number> = { ...(saved?.selfScore ?? {}) };
  const rub = h('div', { class: 'card' }, h('h2', null, 'Rúbrica (0-5 por criterio)'));
  for (const r of WRITING_RUBRIC) {
    const sel = h('select', { id: `rb-${r.key}`, 'aria-describedby': `rbh-${r.key}` }, h('option', { value: '' }, '—'), [0, 1, 2, 3, 4, 5].map((v) => h('option', { value: String(v), selected: scores[r.key] === v }, String(v))));
    sel.addEventListener('change', () => (sel.value === '' ? delete scores[r.key] : (scores[r.key] = Number(sel.value))));
    rub.append(h('div', { class: 'q' }, h('label', { for: `rb-${r.key}` }, h('strong', null, r.label), ' '), sel, h('div', { class: 'small muted', id: `rbh-${r.key}` }, r.hint)));
  }
  const res = h('div', { 'aria-live': 'polite' });
  const saveBtn = h('button', { type: 'button' }, 'Guardar autoevaluación');
  saveBtn.addEventListener('click', () => {
    if (Object.keys(scores).length < 4) {
      res.textContent = 'Puntúa los 4 criterios.';
      return;
    }
    const n = countWords(ta.value);
    const pct = rubricPercent(scores);
    store.data.writings[task.meta.id] = { text: ta.value, updated: new Date().toISOString(), selfScore: { ...scores } };
    store.addAttempt({ taskId: task.meta.id, skill: 'writing', topic: task.meta.topic, domain: task.meta.domain, score: Object.values(scores).reduce((a, b) => a + b, 0), max: 20, errorTags: Object.entries(scores).filter(([, v]) => v < 3).map(([k]) => `writing-${k}`), durationSec: t.elapsed });
    res.replaceChildren(h('p', { class: 'result' }, `Autoevaluación: ${pct} % · ${n} palabras`), h('p', { class: 'small' }, 'En el C1, 3/5 en cada criterio equivale aproximadamente al aprobado (C1). Pide corrección externa con el botón Exportar.'));
  });
  rub.append(h('div', { class: 'row' }, saveBtn), res);
  main.append(rub);

  // Exportación y modelo
  const exp = h('button', { type: 'button' }, 'Exportar Markdown');
  exp.addEventListener('click', () => download(`${task.meta.id}.md`, exportMarkdown(task, ta.value, scores), 'text/markdown'));
  const copy = h('button', { type: 'button', class: 'secondary' }, 'Copiar para corrección externa');
  const copied = h('span', { class: 'small', 'aria-live': 'polite' });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(exportMarkdown(task, ta.value, scores));
      copied.textContent = 'Copiado. Pégalo en Write & Improve, a tu profesor o a un asistente de IA.';
    } catch {
      copied.textContent = 'No se pudo copiar: usa Exportar.';
    }
  });
  main.append(h('div', { class: 'card row' }, exp, copy, copied));
  if (task.model) {
    main.append(h('details', { class: 'card' }, h('summary', null, 'Ver respuesta modelo (después de escribir la tuya)'), h('div', { class: 'text-body' }, task.model.split(/\n+/).map((p) => h('p', null, p))), h('p', { class: 'small muted' }, `${countWords(task.model)} palabras · modelo generado para el proyecto`)));
  }
  main.append(sourceLine(task.meta));
  return () => t.stop();
}

export function writingView(main: HTMLElement, params: string[]) {
  if (!params[0]) return writingList(main);
  if (params[0] === 'frases') return phraseView(main);
  const task = writingTasks.find((t) => t.meta.id === params[0]);
  if (!task) return notFound(main, '#/writing');
  return editorView(main, task);
}
