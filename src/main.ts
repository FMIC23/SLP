import './ui/styles.css';
import { h, clear } from './ui/dom';
import { store } from './core/store';
import { IS_OPO } from './core/edition';
import { homeView } from './views/home';
import { readingView } from './views/reading';
import { uoeView } from './views/uoe';
import { listeningView } from './views/listening';
import { writingView } from './views/writing';
import { speakingView } from './views/speaking';
import { vocabView } from './views/vocab';
import { mockView } from './views/mock';
import { cuerposView } from './views/cuerpos';
import { progressView } from './views/progress';
import { grammarView, resourcesView, settingsView, guideView } from './views/misc';

export type View = (main: HTMLElement, params: string[]) => void | (() => void);

const routes: { path: string; label?: string; view: View }[] = [
  { path: '', label: 'Inicio', view: homeView },
  { path: 'reading', label: 'Reading', view: readingView },
  { path: 'uoe', label: 'Use of English', view: uoeView },
  { path: 'listening', label: 'Listening', view: listeningView },
  { path: 'writing', label: 'Writing', view: writingView },
  { path: 'speaking', label: 'Speaking', view: speakingView },
  { path: 'vocabulario', label: 'Vocabulario', view: vocabView },
  { path: 'simulacros', label: 'Simulacros', view: mockView },
  { path: 'cuerpos', label: 'Inglés IIE/Minas', view: cuerposView },
  { path: 'progreso', label: 'Progreso', view: progressView },
  { path: 'guia', label: IS_OPO ? 'Guía C1' : 'Guía C1/SLP', view: guideView },
  { path: 'recursos', label: 'Recursos', view: resourcesView },
  { path: 'gramatica', view: grammarView },
  { path: 'ajustes', label: 'Ajustes', view: settingsView },
];

const main = document.getElementById('main')!;
if (IS_OPO) document.querySelector('.brand')!.textContent = 'Inglés · OpoIndustriales';
const nav = document.getElementById('nav')!;
const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
let cleanup: void | (() => void);

nav.append(...routes.filter((r) => r.label).map((r) => h('a', { href: `#/${r.path}`, 'data-path': r.path }, r.label!)));
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

const profileSel = document.getElementById('profile') as HTMLSelectElement;
export function renderProfiles() {
  profileSel.replaceChildren(
    ...store.profiles.map((p) => h('option', { value: p.id, selected: p.id === store.profileId }, `👤 ${p.name}`)),
    h('option', { value: '__manage' }, 'Gestionar perfiles…'),
  );
}
profileSel.addEventListener('change', () => {
  if (profileSel.value === '__manage') {
    renderProfiles();
    location.hash = '#/ajustes';
    return;
  }
  store.switchProfile(profileSel.value);
  render();
});
renderProfiles();

function render() {
  if (typeof cleanup === 'function') cleanup();
  window.speechSynthesis?.cancel();
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, ...params] = hash.split('/').map(decodeURIComponent);
  const route = routes.find((r) => r.path === path) ?? routes[0];
  nav.querySelectorAll('a').forEach((a) => (a.getAttribute('data-path') === route.path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  clear(main);
  try {
    cleanup = route.view(main, params.filter(Boolean));
  } catch (e) {
    console.error(e);
    main.append(h('div', { class: 'card' }, h('h1', null, 'Error'), h('p', null, String(e))));
  }
  const title = main.querySelector('h1')?.textContent;
  const brand = IS_OPO ? 'Inglés · OpoIndustriales' : 'C1 · SLP 3';
  document.title = title ? `${title} · ${brand}` : IS_OPO ? brand : 'Entrenador C1 · SLP 3';
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
