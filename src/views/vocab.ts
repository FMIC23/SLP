import { decks } from '../core/content';
import { QUALITY, isDue, newSrsState, review } from '../core/sm2';
import { store, today } from '../core/store';
import type { Card, Deck, DeckCategory } from '../core/types';
import { badges, h, shuffle } from '../ui/dom';

export const CATEGORY_LABEL: Record<DeckCategory, string> = {
  general: 'General C1',
  industrial: 'Técnico-industrial',
  police: 'Policial / seguridad',
  collocations: 'Collocations',
  'phrasal-verbs': 'Phrasal verbs',
  idioms: 'Idioms',
  'false-friends': 'False friends',
  connectors: 'Conectores',
  'speaking-phrases': 'Frases de speaking (tus apuntes)',
};

function deckStats(d: Deck) {
  const t = today();
  let due = 0;
  let fresh = 0;
  let learned = 0;
  for (const c of d.cards) {
    const s = store.data.srs[c.id];
    if (!s) fresh++;
    else {
      if (isDue(s, t)) due++;
      if (s.interval >= 21) learned++;
    }
  }
  return { due, fresh, learned };
}

/** Cola de estudio: repasos vencidos + nuevas (límite diario). */
export function buildQueue(selected: Deck[], newLimit: number): { card: Card; deck: Deck }[] {
  const t = today();
  const due: { card: Card; deck: Deck }[] = [];
  const fresh: { card: Card; deck: Deck }[] = [];
  for (const d of selected)
    for (const c of d.cards) {
      const s = store.data.srs[c.id];
      if (!s) fresh.push({ card: c, deck: d });
      else if (isDue(s, t)) due.push({ card: c, deck: d });
    }
  return [...shuffle(due), ...fresh.slice(0, newLimit)];
}

function study(main: HTMLElement, selected: Deck[], reverse: boolean) {
  const queue = buildQueue(selected, store.data.settings.dailyNewCards);
  main.append(h('p', null, h('a', { href: '#/vocabulario' }, '← Vocabulario')), h('h1', null, 'Repaso con repetición espaciada'));
  if (!queue.length) {
    main.append(h('p', { class: 'card' }, '¡Nada pendiente hoy en estos mazos! Vuelve mañana o añade más mazos.'));
    return;
  }
  let i = 0;
  let good = 0;
  let total = 0;
  const failedTags: string[] = [];
  const counter = h('p', { class: 'muted', 'aria-live': 'polite' });
  const cardEl = h('div', { class: 'card flashcard', tabindex: '0', 'aria-live': 'polite' });
  const btnRow = h('div', { class: 'row', style: 'justify-content:center' });
  main.append(counter, cardEl, btnRow, h('p', { class: 'small muted' }, 'Atajos: Espacio = mostrar; 1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil.'));

  const show = (flipped: boolean) => {
    const { card, deck } = queue[i];
    counter.textContent = `Tarjeta ${i + 1} de ${queue.length} · ${deck.title}`;
    const isPhrase = deck.category === 'speaking-phrases';
    const front = isPhrase ? `Di una frase usando: «${card.front}»` : reverse ? card.back : card.front;
    const back = isPhrase ? card.back : reverse ? card.front : card.back;
    cardEl.replaceChildren(
      h('div', null, front),
      h('div', { class: 'back', hidden: !flipped }, back),
      h('div', { class: 'example', hidden: !(flipped && card.example) }, card.example ?? ''),
      h('div', { class: 'small muted', hidden: !(flipped && card.note) }, card.note ?? ''),
    );
    btnRow.replaceChildren();
    if (!flipped) {
      const b = h('button', { type: 'button' }, 'Mostrar respuesta');
      b.addEventListener('click', () => show(true));
      btnRow.append(b);
      b.focus();
    } else {
      (
        [
          ['Otra vez', QUALITY.again],
          ['Difícil', QUALITY.hard],
          ['Bien', QUALITY.good],
          ['Fácil', QUALITY.easy],
        ] as const
      ).forEach(([label, q], k) => {
        const b = h('button', { type: 'button', class: k === 0 ? 'secondary' : '' }, `${k + 1}. ${label}`);
        b.addEventListener('click', () => rate(q));
        btnRow.append(b);
      });
    }
  };
  const rate = (q: number) => {
    const { card, deck } = queue[i];
    const prev = store.data.srs[card.id] ?? newSrsState(today());
    store.setSrs(card.id, review(prev, q, today()));
    total++;
    if (q >= 3) good++;
    else {
      failedTags.push(`vocab-${deck.category}`);
      queue.push(queue[i]); // vuelve a salir en esta sesión
    }
    i++;
    if (i >= queue.length) return done();
    show(false);
  };
  const done = () => {
    document.removeEventListener('keydown', keys);
    store.addAttempt({ taskId: `vocab-session-${today()}`, skill: 'vocabulary', topic: selected.map((d) => d.meta.topic).join(', ').slice(0, 80), domain: selected[0].meta.domain, score: good, max: total, errorTags: failedTags });
    cardEl.replaceChildren(h('div', null, `Sesión completada: ${good}/${total} respuestas buenas a la primera o tras repetir.`));
    btnRow.replaceChildren(h('a', { class: 'btn', href: '#/vocabulario' }, 'Volver'));
  };
  const keys = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const flipped = btnRow.children.length > 1;
    if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      show(true);
    } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate([QUALITY.again, QUALITY.hard, QUALITY.good, QUALITY.easy][Number(e.key) - 1]);
  };
  document.addEventListener('keydown', keys);
  show(false);
  return () => document.removeEventListener('keydown', keys);
}

function browse(main: HTMLElement, deck: Deck) {
  main.append(h('p', null, h('a', { href: '#/vocabulario' }, '← Vocabulario')), h('h1', null, deck.title), badges(deck.meta), h('p', { class: 'small muted' }, `Fuente: ${deck.meta.source} · Licencia: ${deck.meta.license}`));
  const q = h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar en el mazo' });
  const tbody = h('tbody');
  const draw = () => {
    const term = q.value.toLowerCase();
    tbody.replaceChildren(
      ...deck.cards
        .filter((c) => !term || `${c.front} ${c.back} ${c.example ?? ''}`.toLowerCase().includes(term))
        .map((c) => {
          const s = store.data.srs[c.id];
          return h('tr', null, h('td', null, h('strong', null, c.front)), h('td', null, c.back, c.note ? h('div', { class: 'small muted' }, c.note) : null), h('td', { class: 'small' }, c.example ?? ''), h('td', { class: 'small' }, s ? `próx. ${s.due}` : 'nueva'));
        }),
    );
  };
  q.addEventListener('input', draw);
  const studyBtn = h('a', { class: 'btn', href: `#/vocabulario/estudiar/${deck.meta.id}` }, 'Estudiar este mazo');
  main.append(h('div', { class: 'filters' }, q, studyBtn), h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Inglés'), h('th', null, 'Español / nota'), h('th', null, 'Ejemplo'), h('th', null, 'Repaso'))), tbody)));
  draw();
}

export function vocabView(main: HTMLElement, params: string[]) {
  if (params[0] === 'estudiar') {
    const ids = (params[1] ?? '').split(',').filter(Boolean);
    const reverse = params[2] === 'inverso';
    const sel = ids.length ? decks.filter((d) => ids.includes(d.meta.id)) : decks;
    return study(main, sel, reverse);
  }
  if (params[0]) {
    const d = decks.find((x) => x.meta.id === params[0]);
    if (d) return browse(main, d);
  }
  main.append(
    h('h1', null, 'Vocabulario y fraseología'),
    h('p', { class: 'muted' }, 'Flashcards con repetición espaciada (algoritmo SM-2): las tarjetas que fallas vuelven pronto; las que dominas se espacian días o semanas. Selecciona mazos y pulsa «Estudiar».'),
  );
  const cats = [...new Set(decks.map((d) => d.category))];
  const checks: HTMLInputElement[] = [];
  const totalDue = decks.reduce((a, d) => a + deckStats(d).due, 0);
  main.append(h('div', { class: 'kpi' }, h('div', { class: 'card' }, h('div', { class: 'num' }, String(totalDue)), 'repasos pendientes hoy'), h('div', { class: 'card' }, h('div', { class: 'num' }, String(decks.reduce((a, d) => a + d.cards.length, 0))), 'tarjetas en total'), h('div', { class: 'card' }, h('div', { class: 'num' }, String(Object.values(store.data.srs).filter((s) => s.interval >= 21).length)), 'tarjetas dominadas (≥21 días)')));
  const reverse = h('input', { type: 'checkbox', id: 'rev' });
  const studyBtn = h('button', { type: 'button' }, 'Estudiar seleccionados');
  studyBtn.addEventListener('click', () => {
    const ids = checks.filter((c) => c.checked).map((c) => c.value);
    location.hash = `#/vocabulario/estudiar/${ids.join(',')}${reverse.checked ? '/inverso' : ''}`;
  });
  main.append(h('div', { class: 'filters' }, studyBtn, h('label', { for: 'rev' }, reverse, ' Modo inverso (español → inglés)')));
  for (const cat of cats) {
    main.append(h('h2', null, CATEGORY_LABEL[cat] ?? cat));
    const grid = h('div', { class: 'grid' });
    for (const d of decks.filter((x) => x.category === cat)) {
      const st = deckStats(d);
      const cb = h('input', { type: 'checkbox', value: d.meta.id, id: `dk-${d.meta.id}`, checked: st.due > 0 });
      checks.push(cb);
      grid.append(
        h('div', { class: 'tile' }, h('label', { for: `dk-${d.meta.id}` }, cb, ' ', h('strong', null, d.title)), h('div', { class: 'small muted' }, `${d.cards.length} tarjetas · ${st.due} pendientes · ${st.fresh} nuevas · ${st.learned} dominadas`), badges(d.meta), h('a', { href: `#/vocabulario/${d.meta.id}`, class: 'small' }, 'Ver lista')),
      );
    }
    main.append(grid);
  }
}
