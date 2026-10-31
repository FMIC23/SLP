import { allTasks, decks, listening, reading, speakingCards, useOfEnglish, writingTasks } from '../core/content';
import { recommend } from '../core/recommend';
import { isDue } from '../core/sm2';
import { skillStats, streak } from '../core/scoring';
import { boost, store, today } from '../core/store';
import { bar, h, SKILL_LABEL, DOMAIN_LABEL } from '../ui/dom';
import { todayPlan } from './progress';

const SKILL_ROUTE: Record<string, string> = { reading: '#/reading', useofenglish: '#/uoe', listening: '#/listening', writing: '#/writing', speaking: '#/speaking', vocabulary: '#/vocabulario' };

export function homeView(main: HTMLElement) {
  const a = store.data.attempts;
  const t = today();
  const due = decks.reduce((n, d) => n + d.cards.filter((c) => store.data.srs[c.id] && isDue(store.data.srs[c.id], t)).length, 0);
  const plan = todayPlan();
  const stats = skillStats(a);
  const tasks = allTasks();
  const recs = [recommend(a, tasks, { boost: boost() })];
  const r2 = recommend(a, tasks, { exclude: recs.filter(Boolean).map((x) => x!.id), boost: boost(), focusDomain: 'police' });
  if (r2) recs.push(r2);
  const pr = store.data.settings.prioritySkill;
  const r3 = pr ? recommend(a, tasks.filter((x) => x.skill === pr), { exclude: recs.filter(Boolean).map((x) => x!.id) }) : undefined;
  if (r3) recs.push(r3);

  main.append(
    h('h1', null, `Hola, ${store.profile.name}: tu entrenamiento de hoy`),
    h('p', { class: 'muted' }, 'Inglés C1 Advanced y SLP 3 (STANAG 6001) con vocabulario industrial y policial. Todo tu progreso se guarda en este navegador.'),
    h(
      'div',
      { class: 'kpi' },
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(streak(store.data.studyDays, t))), 'días de racha'),
      h('a', { class: 'card', href: '#/vocabulario', style: 'text-decoration:none;color:inherit' }, h('div', { class: 'num' }, String(due)), 'tarjetas para repasar'),
      h('div', { class: 'card' }, h('div', { class: 'num' }, `${plan.minutes}′`), `plan del ${plan.day.toLowerCase()}`),
      h('div', { class: 'card' }, h('div', { class: 'num' }, String(a.length)), 'ejercicios hechos'),
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', { style: 'margin-top:0' }, `Plan de hoy (${plan.day})`),
      plan.skills.length
        ? h('div', { class: 'row' }, plan.skills.map((s) => h('a', { class: 'btn secondary', href: SKILL_ROUTE[s] }, SKILL_LABEL[s])))
        : h('p', null, 'Día de descanso. Si te apetece, 10 minutos de vocabulario.'),
      h('p', { class: 'small muted' }, h('a', { href: '#/progreso' }, 'Configurar plan semanal')),
    ),
    h('h2', null, 'Recomendado para ti'),
    h(
      'div',
      { class: 'grid' },
      recs.filter(Boolean).map((r) => h('a', { class: 'tile', href: r!.route }, h('h3', null, r!.title), h('div', { class: 'small muted' }, `${SKILL_LABEL[r!.skill]} · ${DOMAIN_LABEL[r!.domain] ?? r!.domain}`))),
    ),
    h('p', { class: 'small muted' }, store.data.settings.prioritySkill ? `La recomendación prioriza tus destrezas más flojas y da un plus a ${SKILL_LABEL[store.data.settings.prioritySkill]} (cámbialo en Ajustes).` : 'La recomendación prioriza tus destrezas más flojas.'),
    h('h2', null, 'Destrezas'),
    h(
      'div',
      { class: 'grid' },
      (
        [
          ['reading', reading.length, 'textos'],
          ['useofenglish', useOfEnglish.length, 'tareas'],
          ['listening', listening.length, 'audios'],
          ['writing', writingTasks.length, 'tareas'],
          ['speaking', speakingCards.length, 'tarjetas'],
          ['vocabulary', decks.reduce((n, d) => n + d.cards.length, 0), 'tarjetas'],
        ] as const
      ).map(([s, n, unit]) =>
        h('a', { class: 'tile', href: SKILL_ROUTE[s] }, h('h3', null, SKILL_LABEL[s]), h('div', { class: 'small muted' }, `${n} ${unit}`), stats[s].attempts ? [h('div', { class: 'small' }, `Acierto reciente: ${stats[s].pct} %`), bar(stats[s].pct)] : h('div', { class: 'small muted' }, 'Sin empezar')),
      ),
    ),
    h('p', null, h('a', { class: 'btn', href: '#/simulacros' }, 'Hacer un simulacro'), ' ', h('a', { class: 'btn secondary', href: '#/guia' }, 'Qué evalúa el C1 y el SLP 3')),
  );
}
