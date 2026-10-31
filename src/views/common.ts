import { store, attemptsFor } from '../core/store';
import type { Meta } from '../core/types';
import { badges, h, timer, DOMAIN_LABEL } from '../ui/dom';
import { IS_OPO } from '../core/edition';
import { buildExercise, gradeSummary, type ExerciseSpec } from '../ui/exercise';

export interface ListItem {
  id: string;
  title: string;
  meta: Meta;
  kind: string;
  kindLabel: string;
  href: string;
  extra?: string;
}

/** Listado filtrable por tipo y dominio. */
export function taskList(main: HTMLElement, opts: { title: string; intro: (string | Node)[]; items: ListItem[]; empty?: string }) {
  main.append(h('h1', null, opts.title), h('div', { class: 'muted' }, ...opts.intro));
  const kinds = [...new Map(opts.items.map((i) => [i.kind, i.kindLabel])).entries()];
  const kindSel = h('select', { 'aria-label': 'Filtrar por tipo' }, h('option', { value: '' }, 'Todos los tipos'), kinds.map(([k, l]) => h('option', { value: k }, l)));
  const domSel = h('select', { 'aria-label': 'Filtrar por ámbito' }, h('option', { value: '' }, 'Todos los ámbitos'), Object.entries(DOMAIN_LABEL).filter(([k]) => !IS_OPO || k !== 'police').map(([k, l]) => h('option', { value: k }, l)));
  const levelSel = h('select', { 'aria-label': 'Filtrar por nivel' }, h('option', { value: '' }, 'C1 y SLP 3'), h('option', { value: 'C1' }, 'Formato C1'), h('option', { value: 'SLP3' }, 'Estilo SLP 3'));
  const grid = h('div', { class: 'grid' });
  const draw = () => {
    grid.replaceChildren();
    const list = opts.items.filter(
      (i) => (!kindSel.value || i.kind === kindSel.value) && (!domSel.value || i.meta.domain === domSel.value) && (!levelSel.value || i.meta.level.includes(levelSel.value)),
    );
    if (!list.length) grid.append(h('p', { class: 'muted' }, opts.empty ?? 'No hay ejercicios con esos filtros.'));
    for (const i of list) {
      const att = attemptsFor(i.id);
      const best = att.length ? Math.max(...att.map((a) => (a.max ? Math.round((a.score / a.max) * 100) : 0))) : null;
      grid.append(
        h(
          'a',
          { class: `tile${best !== null ? ' done' : ''}`, href: i.href },
          h('h3', null, i.title),
          h('div', { class: 'small muted' }, i.kindLabel, i.extra ? ` · ${i.extra}` : ''),
          badges(i.meta),
          best !== null ? h('div', { class: 'small' }, `Mejor resultado: ${best} % (${att.length} intento${att.length > 1 ? 's' : ''})`) : null,
        ),
      );
    }
  };
  [kindSel, domSel, levelSel].forEach((s) => s.addEventListener('change', draw));
  main.append(h('div', { class: 'filters' }, kindSel, domSel, levelSel), grid);
  draw();
}

export function sourceLine(meta: Meta) {
  return h(
    'p',
    { class: 'small muted' },
    `Fuente: ${meta.source}`,
    meta.sourceUrl ? [' · ', h('a', { href: meta.sourceUrl, target: '_blank', rel: 'noopener' }, 'enlace')] : null,
    ` · Licencia: ${meta.license}`,
    meta.generated ? ' · Contenido generado (revisado)' : '',
  );
}

/** Ejecuta un ejercicio en modo práctica: temporizador, botón corregir, registro del intento. */
export function practice(container: HTMLElement, meta: Meta, spec: ExerciseSpec, opts: { timeMinutes?: number; before?: Node[] } = {}) {
  const ex = buildExercise(spec);
  const t = timer({ countdown: opts.timeMinutes ? opts.timeMinutes * 60 : undefined, label: 'Tiempo' });
  const summary = h('div');
  const btn = h('button', { type: 'button' }, 'Corregir');
  const retry = h('button', { type: 'button', class: 'secondary', hidden: true }, 'Repetir');
  btn.addEventListener('click', () => {
    const g = ex.grade();
    ex.reveal(g);
    ex.lock();
    t.stop();
    btn.disabled = true;
    retry.hidden = false;
    store.addAttempt({ taskId: meta.id, skill: meta.skill, topic: meta.topic, domain: meta.domain, score: g.score, max: g.max, errorTags: g.errorTags, durationSec: t.elapsed });
    summary.replaceChildren(gradeSummary(g));
    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  retry.addEventListener('click', () => {
    container.replaceChildren();
    practice(container, meta, spec, opts);
  });
  container.append(...(opts.before ?? []), ex.el, summary, h('div', { class: 'sticky-bar' }, btn, retry, h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, opts.timeMinutes ? 'Tiempo restante ' : 'Tiempo '), t.el));
  t.start();
  return () => t.stop();
}

export function notFound(main: HTMLElement, back: string) {
  main.append(h('h1', null, 'No encontrado'), h('p', null, h('a', { href: back }, 'Volver')));
}
