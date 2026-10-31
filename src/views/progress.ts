import { allTasks, grammarRefs } from '../core/content';
import { recommend } from '../core/recommend';
import { cambridgeBand, errorTagCounts, percentToCambridge, percentToSlp, skillStats, streak } from '../core/scoring';
import { boost, store, today, defaultPlan } from '../core/store';
import type { Skill } from '../core/types';
import { bar, h, SKILL_LABEL, DOMAIN_LABEL } from '../ui/dom';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SKILLS: Skill[] = ['reading', 'useofenglish', 'listening', 'writing', 'speaking', 'vocabulary'];

/** Etiquetas de error → explicación y gramática sugerida. */
const TAG_INFO: Record<string, { label: string; refs?: string[] }> = {
  detail: { label: 'Detalle específico' },
  inference: { label: 'Inferencia / significado implícito' },
  gist: { label: 'Idea principal' },
  tone: { label: 'Tono del autor' },
  purpose: { label: 'Propósito del autor/hablante' },
  attitude: { label: 'Actitud / opinión' },
  reference: { label: 'Referencia (pronombres)', refs: ['reference-cohesion'] },
  cohesion: { label: 'Cohesión entre párrafos', refs: ['reference-cohesion'] },
  vocabulary: { label: 'Vocabulario', refs: ['collocations'] },
  collocation: { label: 'Collocations', refs: ['collocations'] },
  grammar: { label: 'Gramática' },
  phrasal: { label: 'Phrasal verbs', refs: ['phrasal-verbs'] },
  linking: { label: 'Conectores', refs: ['linking-contrast', 'linking-cause'] },
  'word-formation': { label: 'Formación de palabras', refs: ['word-formation-prefix', 'word-formation-suffix'] },
  'fixed-expression': { label: 'Expresiones fijas', refs: ['fixed-expressions'] },
  preposition: { label: 'Preposiciones', refs: ['dependent-prepositions'] },
  paraphrase: { label: 'Paráfrasis (reconocer lo mismo con otras palabras)' },
};

export function tagLabel(t: string): string {
  if (TAG_INFO[t]) return TAG_INFO[t].label;
  if (t.startsWith('writing-')) return `Writing: ${t.slice(8)}`;
  if (t.startsWith('speaking-')) return `Speaking: ${t.slice(9)}`;
  if (t.startsWith('vocab-')) return `Vocabulario: ${t.slice(6)}`;
  return t;
}

export function planEditor() {
  const box = h('div', { class: 'card' }, h('h2', null, 'Plan de estudio semanal'));
  const plan = store.data.plan;
  const tbody = h('tbody');
  plan.days.forEach((d, i) => {
    const min = h('input', { type: 'number', min: '0', max: '300', step: '5', value: String(d.minutes), 'aria-label': `Minutos ${DAYS[i]}`, style: 'width:5rem' });
    min.addEventListener('change', () => {
      d.minutes = Math.max(0, Number(min.value) || 0);
      store.save();
    });
    const checks = SKILLS.map((s) => {
      const cb = h('input', { type: 'checkbox', checked: d.skills.includes(s), id: `pl-${i}-${s}` });
      cb.addEventListener('change', () => {
        d.skills = cb.checked ? [...d.skills, s] : d.skills.filter((x) => x !== s);
        store.save();
      });
      return h('label', { for: `pl-${i}-${s}`, class: 'small', style: 'margin-right:.6rem;white-space:nowrap' }, cb, ` ${SKILL_LABEL[s]}`);
    });
    tbody.append(h('tr', null, h('th', { scope: 'row' }, DAYS[i]), h('td', null, min, ' min'), h('td', null, checks)));
  });
  const reset = h('button', { type: 'button', class: 'secondary' }, 'Restaurar plan sugerido');
  reset.addEventListener('click', () => {
    store.data.plan = defaultPlan();
    store.save();
    location.reload();
  });
  const total = plan.days.reduce((a, d) => a + d.minutes, 0);
  box.append(h('p', { class: 'small muted' }, `Total: ${Math.round(total / 6) / 10} h/semana. El plan sugerido da más peso a speaking (tu punto débil).`), h('div', { style: 'overflow-x:auto' }, h('table', null, tbody)), reset);
  return box;
}

export function todayPlan() {
  const dow = (new Date().getDay() + 6) % 7;
  return { day: DAYS[dow], ...store.data.plan.days[dow] };
}

export function progressView(main: HTMLElement) {
  const a = store.data.attempts;
  const stats = skillStats(a);
  const st = streak(store.data.studyDays, today());
  const next = recommend(a, allTasks(), { boost: boost() });
  main.append(h('h1', null, 'Progreso'));
  main.append(
    h(
      'div',
      { class: 'kpi' },
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(st)), `día${st === 1 ? '' : 's'} de racha`),
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(store.data.studyDays.length)), 'días estudiados'),
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(a.length)), 'ejercicios hechos'),
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(Object.keys(store.data.srs).length)), 'tarjetas en repaso'),
    ),
  );
  if (next) main.append(h('div', { class: 'card' }, h('strong', null, 'Siguiente recomendado: '), h('a', { href: next.route }, next.title), h('span', { class: 'small muted' }, ` (${SKILL_LABEL[next.skill]} · ${DOMAIN_LABEL[next.domain] ?? next.domain})`)));

  // Por destreza
  const tbody = h('tbody');
  for (const s of SKILLS) {
    const x = stats[s];
    const sc = percentToCambridge(x.pct);
    tbody.append(
      h('tr', null, h('th', { scope: 'row' }, SKILL_LABEL[s]), h('td', null, String(x.attempts)), h('td', { style: 'min-width:140px' }, x.attempts ? [`${x.pct} %`, bar(x.pct)] : '—'), h('td', null, x.attempts && s !== 'vocabulary' ? `${sc} (${cambridgeBand(sc)})` : '—'), h('td', null, x.attempts && ['reading', 'listening', 'writing', 'speaking'].includes(s) ? percentToSlp(x.pct) : '—')),
    );
  }
  main.append(h('h2', null, 'Por destreza (últimos 15 intentos)'), h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Destreza'), h('th', null, 'Intentos'), h('th', null, 'Acierto'), h('th', null, 'Cambridge aprox.'), h('th', null, 'SLP aprox.'))), tbody)));

  // Por ámbito y tema
  const byDomain = new Map<string, { s: number; m: number; n: number }>();
  const byTopic = new Map<string, { s: number; m: number; n: number }>();
  for (const x of a) {
    if (!x.max) continue;
    for (const [map, key] of [[byDomain, x.domain], [byTopic, x.topic]] as const) {
      const v = map.get(key) ?? { s: 0, m: 0, n: 0 };
      v.s += x.score;
      v.m += x.max;
      v.n++;
      map.set(key, v);
    }
  }
  main.append(
    h('h2', null, 'Por ámbito'),
    h('div', { class: 'card' }, byDomain.size ? [...byDomain.entries()].map(([k, v]) => h('div', { class: 'q' }, `${DOMAIN_LABEL[k] ?? k}: ${Math.round((v.s / v.m) * 100)} % (${v.n} intentos)`, bar(Math.round((v.s / v.m) * 100)))) : h('p', { class: 'muted' }, 'Aún sin datos.')),
  );
  const topics = [...byTopic.entries()].map(([k, v]) => ({ k, pct: Math.round((v.s / v.m) * 100), n: v.n })).sort((x, y) => x.pct - y.pct);
  if (topics.length) main.append(h('details', { class: 'card' }, h('summary', null, 'Por tema (peores primero)'), h('table', null, h('tbody', null, topics.slice(0, 30).map((t) => h('tr', null, h('td', null, t.k), h('td', null, `${t.pct} %`), h('td', null, `${t.n}`)))))));

  // Tipos de error
  const tags = errorTagCounts(a);
  main.append(h('h2', null, 'Tipos de error más frecuentes'));
  if (!tags.length) main.append(h('p', { class: 'muted card' }, 'Sin errores registrados todavía.'));
  else
    main.append(
      h(
        'div',
        { class: 'card' },
        h(
          'ul',
          null,
          tags.slice(0, 10).map(([t, n]) => {
            const refs = TAG_INFO[t]?.refs ?? [];
            return h('li', null, `${tagLabel(t)}: ${n}`, refs.length ? [' → repasa ', refs.map((r, i) => [i ? ', ' : '', h('a', { href: `#/gramatica/${r}` }, grammarRefs.find((g) => g.id === r)?.title ?? r)])] : null);
          }),
        ),
      ),
    );

  main.append(planEditor());

  // Historial
  const recent = [...a].reverse().slice(0, 25);
  if (recent.length) {
    const titles = new Map(allTasks().map((t) => [t.id, t.title]));
    main.append(h('h2', null, 'Últimos intentos'), h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', null, h('tbody', null, recent.map((x) => h('tr', null, h('td', null, new Date(x.date).toLocaleDateString('es-ES')), h('td', null, SKILL_LABEL[x.skill]), h('td', null, titles.get(x.taskId) ?? x.taskId), h('td', null, x.max ? `${Math.round((x.score / x.max) * 100)} %` : '—'), h('td', { class: 'small muted' }, x.mockId ? 'simulacro' : '')))))));
  }
}
