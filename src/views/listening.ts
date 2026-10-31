import { externalResources, listening } from '../core/content';
import { store } from '../core/store';
import type { ListeningPart, ListeningTask } from '../core/types';
import { badges, h } from '../ui/dom';
import { scriptPlayer, ttsAvailable, voicesReady } from '../ui/tts';
import { notFound, practice, sourceLine, taskList } from './common';

export const LISTENING_LABEL: Record<ListeningPart, string> = {
  part1: 'Part 1 · Extractos (multiple choice)',
  part2: 'Part 2 · Sentence completion',
  part3: 'Part 3 · Entrevista (multiple choice)',
  part4: 'Part 4 · Multiple matching',
  stanag: 'SLP 3 · Comprensión auditiva',
};

const audioIndexMods = import.meta.glob('../../data/private/audio-index.json', { eager: true });
const audioIndex = Object.values(audioIndexMods).flatMap((m: any) => (Array.isArray(m?.default) ? m.default : [])) as { title: string; src: string; folder: string }[];

/** Reproductor: audio real si existe; si no, síntesis de voz del guion. */
export function listeningPlayer(task: ListeningTask, opts: { showTranscriptToggle?: boolean } = {}) {
  const wrap = h('div', { class: 'card' });
  const rateSel = h(
    'select',
    { 'aria-label': 'Velocidad' },
    [0.75, 0.85, 0.9, 1, 1.1, 1.25].map((r) => h('option', { value: String(r), selected: r === (store.data.settings.voiceRate ?? 1) }, `${r}×`)),
  );
  const transcript = h(
    'div',
    { class: 'transcript', hidden: true },
    task.script.map((l, i) => h('div', { 'data-line': i }, h('span', { class: 'spk' }, `${l.speaker}: `), l.text)),
  );
  const tBtn = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Mostrar transcripción');
  tBtn.addEventListener('click', () => {
    transcript.hidden = !transcript.hidden;
    tBtn.textContent = transcript.hidden ? 'Mostrar transcripción' : 'Ocultar transcripción';
    tBtn.setAttribute('aria-expanded', String(!transcript.hidden));
  });
  const plays = h('span', { class: 'small muted' }, 'Escuchas: 0 (en el examen se oye dos veces)');
  let count = 0;
  const countPlay = () => {
    count++;
    plays.textContent = `Escuchas: ${count} (en el examen se oye dos veces)`;
  };

  if (task.audio) {
    const audio = h('audio', { controls: true, preload: 'metadata', src: task.audio, style: 'width:100%' });
    audio.addEventListener('play', () => audio.currentTime < 1 && countPlay());
    rateSel.addEventListener('change', () => (audio.playbackRate = Number(rateSel.value)));
    wrap.append(audio, h('div', { class: 'row' }, h('label', null, 'Velocidad ', rateSel), plays, h('span', { class: 'spacer' }), opts.showTranscriptToggle !== false ? tBtn : null), h('p', { class: 'small muted' }, 'Si el audio no carga, ejecuta el importador de material en local (ver README).'));
  } else if (ttsAvailable()) {
    const player = scriptPlayer(task.script, task.speakers ?? {}, Number(rateSel.value), store.data.settings.voiceName);
    const play = h('button', { type: 'button' }, '▶ Reproducir');
    const pause = h('button', { type: 'button', class: 'secondary' }, '⏸ Pausa');
    const stop = h('button', { type: 'button', class: 'secondary' }, '⏹ Parar');
    let started = false;
    play.addEventListener('click', async () => {
      await voicesReady();
      if (!started) countPlay();
      started = true;
      player.setRate(Number(rateSel.value));
      player.play();
    });
    pause.addEventListener('click', () => player.pause());
    stop.addEventListener('click', () => {
      player.stop();
      started = false;
    });
    player.onEnd = () => (started = false);
    player.onLine = (i) => transcript.querySelectorAll('[data-line]').forEach((el) => ((el as HTMLElement).style.fontWeight = el.getAttribute('data-line') === String(i) ? '700' : ''));
    rateSel.addEventListener('change', () => player.setRate(Number(rateSel.value)));
    wrap.append(
      h('div', { class: 'row' }, play, pause, stop, h('label', null, 'Velocidad ', rateSel), plays, h('span', { class: 'spacer' }), opts.showTranscriptToggle !== false ? tBtn : null),
      h('p', { class: 'small muted' }, 'Audio generado con la voz del navegador (Web Speech API). Para voces más naturales usa Chrome/Edge o instala voces inglesas (en-GB) en tu sistema.'),
    );
  } else {
    wrap.append(h('p', { class: 'notice' }, 'Tu navegador no permite síntesis de voz: lee la transcripción en voz alta o usa los recursos de audio abiertos.'), tBtn);
  }
  wrap.append(transcript);
  return wrap;
}

export function listeningView(main: HTMLElement, params: string[]) {
  if (!params[0]) {
    taskList(main, {
      title: 'Listening',
      intro: [
        h('p', null, 'Partes 1-4 del C1 y tareas de comprensión auditiva SLP 3. Escucha sin leer la transcripción; actívala solo al corregir. Ajusta la velocidad (empieza a 0.9× y sube a 1.1× para entrenar).'),
      ],
      items: listening.map((t) => ({ id: t.meta.id, title: t.title, meta: t.meta, kind: t.part, kindLabel: LISTENING_LABEL[t.part], href: `#/listening/${t.meta.id}`, extra: `${t.questions.length} preguntas` })),
    });
    if (audioIndex.length) {
      main.append(h('h2', null, 'Tus audios (material personal, solo local)'), h('div', { class: 'card' }, audioIndex.map((a) => h('div', { class: 'q' }, h('div', null, a.title), h('audio', { controls: true, preload: 'none', src: a.src, style: 'width:100%' })))));
    }
    main.append(
      h('h2', null, 'Audios abiertos recomendados'),
      h('ul', null, externalResources.filter((r) => r.skill === 'listening').map((r) => h('li', null, h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title), ` — ${r.provider}. ${r.description} `, h('span', { class: 'small muted' }, `(${r.license})`)))),
    );
    return;
  }
  const task = listening.find((t) => t.meta.id === params[0]);
  if (!task) return notFound(main, '#/listening');
  main.append(h('p', null, h('a', { href: '#/listening' }, '← Listening')), h('h1', null, task.title), h('div', { class: 'small muted' }, LISTENING_LABEL[task.part]), badges(task.meta), h('p', { class: 'notice' }, task.instructions), listeningPlayer(task));
  const box = h('div');
  main.append(box, sourceLine(task.meta));
  const stop = practice(box, task.meta, { uid: task.meta.id, questions: task.questions });
  return () => {
    stop();
    window.speechSynthesis?.cancel();
  };
}
