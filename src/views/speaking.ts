import { IS_OPO } from '../core/edition';
import { debateQuestions, speakingCards } from '../core/content';
import { rubricPercent } from '../core/scoring';
import { analyzeTranscript } from '../core/speech';
import { store } from '../core/store';
import type { SpeakingCard, SpeakingPart } from '../core/types';
import { badges, beep, fmtTime, h, shuffle, timer } from '../ui/dom';
import { notFound, sourceLine, taskList } from './common';

export const PART_LABEL: Record<SpeakingPart, string> = {
  interview: 'Part 1 · Interview',
  'long-turn': 'Part 2 · Long turn',
  collaborative: 'Part 3 · Collaborative task',
  discussion: 'Part 4 · Discussion',
  presentation: 'Presentación técnica (2-3 min)',
  'slp-interview': 'SLP 3 · Entrevista profesional',
  'slp-briefing': 'SLP 3 · Briefing',
  'slp-roleplay': 'SLP 3 · Role-play situacional',
};

export const SPEAKING_RUBRIC = [
  { key: 'grammar', label: 'Grammatical resource', hint: 'Estructuras simples y complejas con buen control.' },
  { key: 'lexis', label: 'Lexical resource', hint: 'Vocabulario variado y preciso, también para temas poco familiares.' },
  { key: 'discourse', label: 'Discourse management', hint: 'Turnos extensos, coherentes y bien enlazados, poca vacilación.' },
  { key: 'pronunciation', label: 'Pronunciation', hint: 'Inteligible; entonación, acento de palabra y frase adecuados.' },
  { key: 'interaction', label: 'Interactive communication', hint: 'Inicias, respondes, negocias y llevas la conversación hacia un resultado.' },
];

/** Grabadora local (MediaRecorder). Nada se sube: el audio queda en memoria y puedes descargarlo. */
export function recorder() {
  const wrap = h('div', { class: 'row' });
  const btn = h('button', { type: 'button' }, '● Grabar');
  const status = h('span', { class: 'small', 'aria-live': 'polite' });
  const out = h('div', { style: 'width:100%' });
  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
    wrap.append(h('span', { class: 'small muted' }, 'Tu navegador no permite grabar audio.'));
    return { el: wrap, start: async () => undefined, stop: () => undefined, dispose: () => undefined };
  }
  const start = async () => {
    if (rec) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rec = new MediaRecorder(stream);
      chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        out.replaceChildren(h('audio', { controls: true, src: url, style: 'width:100%' }), h('a', { href: url, download: `speaking-${new Date().toISOString().slice(0, 16)}.webm` }, 'Descargar grabación'));
        stream?.getTracks().forEach((t) => t.stop());
        rec = null;
        btn.textContent = '● Grabar';
        status.replaceChildren('Grabación lista. Escúchate y autoevalúate.');
      };
      rec.start();
      btn.textContent = '■ Parar';
      status.replaceChildren(h('span', { class: 'rec-dot', 'aria-hidden': 'true' }), ' Grabando (solo en tu dispositivo)');
    } catch {
      status.textContent = 'No se pudo acceder al micrófono (revisa permisos).';
    }
  };
  const stop = () => rec?.state === 'recording' && rec.stop();
  btn.addEventListener('click', () => (rec ? stop() : start()));
  wrap.append(btn, status, out);
  return { el: wrap, start, stop, dispose: () => { stop(); stream?.getTracks().forEach((t) => t.stop()); } };
}

/** Reconocimiento de voz opcional (Chrome/Edge/Safari). */
function recognizer(onText: (finalText: string, interim: string) => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-GB';
  r.continuous = true;
  r.interimResults = true;
  let finalText = '';
  let active = false;
  r.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript + ' ';
      else interim += res[0].transcript;
    }
    onText(finalText, interim);
  };
  r.onend = () => active && r.start(); // reinicia si el navegador corta por silencio
  return {
    start() {
      finalText = '';
      active = true;
      try { r.start(); } catch { /* ya iniciado */ }
    },
    stop() {
      active = false;
      try { r.stop(); } catch { /* */ }
    },
    get text() {
      return finalText;
    },
  };
}

function cardView(main: HTMLElement, card: SpeakingCard) {
  main.append(h('p', null, h('a', { href: '#/speaking' }, '← Speaking')), h('h1', null, card.title), h('div', { class: 'small muted' }, PART_LABEL[card.part]), badges(card.meta));
  main.append(
    h('div', { class: 'card' }, card.prompt.split(/\n+/).map((p) => h('p', null, p)), card.points.length ? h('ul', null, card.points.map((p) => h('li', null, p))) : null, card.followUp?.length ? h('details', null, h('summary', null, 'Preguntas de seguimiento'), h('ul', null, card.followUp.map((p) => h('li', null, p)))) : null),
    h('details', { class: 'card' }, h('summary', null, 'Lenguaje útil'), h('ul', null, card.usefulLanguage.map((p) => h('li', null, p)))),
  );

  // Temporizador de preparación + intervención
  const phase = h('div', { class: 'result', 'aria-live': 'assertive' }, 'Listo');
  let current: ReturnType<typeof timer> | null = null;
  const rec = recorder();
  const transcriptBox = h('div', { class: 'transcript', hidden: true, 'aria-live': 'off' });
  const analysisBox = h('div', { 'aria-live': 'polite' });
  let spoken = 0;
  const sr = recognizer((fin, interim) => {
    transcriptBox.hidden = false;
    transcriptBox.textContent = fin + (interim ? ` ${interim}…` : '');
  });
  const useSr = h('input', { type: 'checkbox', id: 'use-sr', checked: !!sr, disabled: !sr });
  const timerSlot = h('span');
  const startBtn = h('button', { type: 'button' }, card.prepSeconds ? `▶ Empezar (${card.prepSeconds}s de preparación)` : '▶ Empezar a hablar');
  const stopBtn = h('button', { type: 'button', class: 'secondary' }, '■ Terminar');

  const finish = () => {
    current?.stop();
    if (current) spoken = Math.max(spoken, current.elapsed);
    rec.stop();
    sr?.stop();
    phase.textContent = 'Terminado. Escucha tu grabación y autoevalúate.';
    if (sr && useSr.checked && sr.text.trim()) {
      const a = analyzeTranscript(sr.text, spoken || card.speakSeconds, card.usefulLanguage);
      analysisBox.replaceChildren(
        h('div', { class: 'card' },
          h('h3', null, 'Análisis automático (aproximado)'),
          h('ul', null,
            h('li', null, `${a.words} palabras en ${fmtTime(spoken)} → ${a.wpm} palabras/minuto (orientativo: 120-160 es fluido)`),
            h('li', null, `Muletillas: ${a.fillers}${a.fillers ? ` (${Object.entries(a.fillerDetail).map(([k, v]) => `${k} ×${v}`).join(', ')})` : ''}`),
            h('li', null, `Variedad léxica (palabras distintas/total): ${a.uniqueRatio}`),
            h('li', null, `Frases útiles usadas: ${a.usedPhrases.length ? a.usedPhrases.join(' · ') : 'ninguna detectada — intenta incorporar 2-3'}`),
          ),
          h('p', { class: 'small muted' }, 'El reconocimiento de voz puede fallar con acentos; úsalo como indicador, no como nota.'),
        ),
      );
    }
  };
  const speak = () => {
    beep(990);
    phase.textContent = `¡Habla! (${fmtTime(card.speakSeconds)})`;
    current = timer({ countdown: card.speakSeconds, label: 'Tiempo de intervención', onEnd: () => { spoken = card.speakSeconds; beep(440, 500); finish(); } });
    timerSlot.replaceChildren(current.el);
    current.start();
    rec.start();
    if (sr && useSr.checked) sr.start();
  };
  startBtn.addEventListener('click', () => {
    current?.stop();
    analysisBox.replaceChildren();
    if (card.prepSeconds) {
      phase.textContent = 'Preparación: piensa en ideas y estructura, no escribas frases completas';
      current = timer({ countdown: card.prepSeconds, label: 'Tiempo de preparación', onEnd: speak });
      timerSlot.replaceChildren(current.el);
      current.start();
    } else speak();
  });
  stopBtn.addEventListener('click', finish);
  main.append(
    h('div', { class: 'card' },
      h('div', { class: 'row' }, startBtn, stopBtn, timerSlot),
      phase,
      h('div', { class: 'row' }, h('label', { for: 'use-sr' }, useSr, ' Transcribir con reconocimiento de voz', sr ? '' : ' (no disponible en este navegador)')),
      h('h3', null, 'Grabación'),
      rec.el,
      transcriptBox,
      analysisBox,
    ),
  );

  // Rúbrica
  const scores: Record<string, number> = {};
  const rub = h('div', { class: 'card' }, h('h2', null, 'Autoevaluación (0-5)'), h('p', { class: 'small muted' }, IS_OPO ? 'Escucha la grabación. 3/5 en cada escala ≈ C1. Sé exigente con la fluidez y la variedad.' : 'Escucha la grabación. 3/5 en cada escala ≈ C1/SLP 3. Sé exigente con la fluidez y la variedad.'));
  for (const r of SPEAKING_RUBRIC) {
    const sel = h('select', { id: `sr-${r.key}` }, h('option', { value: '' }, '—'), [0, 1, 2, 3, 4, 5].map((v) => h('option', { value: String(v) }, String(v))));
    sel.addEventListener('change', () => (sel.value === '' ? delete scores[r.key] : (scores[r.key] = Number(sel.value))));
    rub.append(h('div', { class: 'q' }, h('label', { for: `sr-${r.key}` }, h('strong', null, r.label), ' '), sel, h('div', { class: 'small muted' }, r.hint)));
  }
  const res = h('div', { 'aria-live': 'polite' });
  const save = h('button', { type: 'button' }, 'Guardar práctica');
  save.addEventListener('click', () => {
    if (Object.keys(scores).length < SPEAKING_RUBRIC.length) {
      res.textContent = 'Puntúa las 5 escalas.';
      return;
    }
    store.addAttempt({ taskId: card.meta.id, skill: 'speaking', topic: card.meta.topic, domain: card.meta.domain, score: Object.values(scores).reduce((a, b) => a + b, 0), max: 25, errorTags: Object.entries(scores).filter(([, v]) => v < 3).map(([k]) => `speaking-${k}`), durationSec: spoken });
    res.replaceChildren(h('p', { class: 'result' }, `Guardado: ${rubricPercent(scores)} %`), h('p', null, h('a', { href: '#/speaking' }, 'Otra tarjeta'), ' · Consejo: repite esta misma tarjeta mañana e intenta subir un punto en tu escala más baja.'));
  });
  rub.append(save, res);
  main.append(rub, sourceLine(card.meta));
  return () => {
    current?.stop();
    rec.dispose();
    sr?.stop();
  };
}

function debateView(main: HTMLElement) {
  main.append(h('p', null, h('a', { href: '#/speaking' }, '← Speaking')), h('h1', null, 'Preguntas de debate'), h('p', { class: 'muted' }, `Pulsa «Pregunta al azar», piensa 10 segundos y habla 1-2 minutos. Ideal para práctica diaria corta (Part 4 / ${IS_OPO ? 'conversación con el tribunal' : 'entrevista SLP'}).`));
  const all = debateQuestions.flatMap((g) => g.questions.map((q) => ({ q, topic: g.topic })));
  const shown = h('div', { class: 'card flashcard', 'aria-live': 'polite' }, 'Pulsa el botón para empezar');
  const t = timer({ countdown: 120, onEnd: () => beep(440, 400) });
  const rnd = h('button', { type: 'button' }, '🎲 Pregunta al azar');
  rnd.addEventListener('click', () => {
    const x = shuffle(all)[0];
    if (!x) return;
    shown.replaceChildren(h('div', null, x.q), h('div', { class: 'small muted' }, x.topic));
    t.reset();
    t.start();
  });
  main.append(h('div', { class: 'row' }, rnd, t.el), shown);
  for (const g of debateQuestions) main.append(h('details', { class: 'card' }, h('summary', null, g.topic), h('ol', null, g.questions.map((q) => h('li', null, q)))));
  return () => t.stop();
}

export function speakingView(main: HTMLElement, params: string[]) {
  if (!params[0]) {
    taskList(main, {
      title: 'Speaking',
      intro: [
        h('p', null, 'Tu destreza prioritaria. Rutina recomendada: 15-20 min diarios. Prepara, habla con el temporizador, grábate (todo queda en tu dispositivo), escúchate y autoevalúate con la rúbrica. Repite la misma tarjeta otro día para medir tu mejora.'),
        h('p', null, h('a', { href: '#/speaking/debate' }, '→ Preguntas de debate sobre ingeniería, industria y seguridad'), ' · ', h('a', { href: '#/vocabulario' }, '→ Frases de speaking por temas (vocabulario)')),
      ],
      items: speakingCards.map((c) => ({ id: c.meta.id, title: c.title, meta: c.meta, kind: c.part, kindLabel: PART_LABEL[c.part], href: `#/speaking/${c.meta.id}`, extra: `${c.prepSeconds ? `${c.prepSeconds}s prep + ` : ''}${fmtTime(c.speakSeconds)}` })),
    });
    return;
  }
  if (params[0] === 'debate') return debateView(main);
  const card = speakingCards.find((c) => c.meta.id === params[0]);
  if (!card) return notFound(main, '#/speaking');
  return cardView(main, card);
}
