import { cuerpoExams } from '../core/content';
import { countWords } from '../core/grading';
import { store } from '../core/store';
import type { CuerpoExam } from '../core/types';
import { badges, beep, download, h, timer } from '../ui/dom';
import { scriptPlayer, ttsAvailable, voicesReady } from '../ui/tts';
import { notFound, sourceLine } from './common';
import { recorder } from './speaking';

/** Calificación por niveles MCER usada por los tribunales (IIE 2024): C2 = 10, C1 = 7, B2 = 5, < B2 = no apto. */
export const MCER_GRADES = [
  { label: 'C2 (10)', value: 10 },
  { label: 'C1 (7)', value: 7 },
  { label: 'B2 (5)', value: 5 },
  { label: 'Inferior a B2 (no apto)', value: 0 },
];

export function cuerpoGrade(written: number, oral: number): { grade: number; apto: boolean } {
  // Escrito y oral se valoran en conjunto; tomamos la media y exigimos mínimo 5 en ambas partes.
  const grade = Math.round(((written + oral) / 2) * 10) / 10;
  return { grade, apto: written >= 5 && oral >= 5 };
}

/** Divide un texto en «líneas» para la síntesis de voz (frases agrupadas por párrafo). */
export function toReadingScript(text: string) {
  return text
    .split(/\n\s*\n/)
    .flatMap((p) => p.split(/(?<=[.!?]["')\]]?)\s+/))
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ speaker: 'Asesor', text: t }));
}

function listView(main: HTMLElement) {
  main.append(
    h('h1', null, 'Inglés de los Cuerpos IIE y Minas'),
    h(
      'div',
      { class: 'card' },
      h('p', null, 'Simulacros del 2.º ejercicio (inglés, obligatorio y eliminatorio) de los Cuerpos de Ingenieros Industriales y de Ingenieros de Minas del Estado, según las memorias de los tribunales:'),
      h(
        'ol',
        null,
        h('li', null, h('strong', null, 'Resumen: '), 'el asesor lingüístico lee un texto en inglés dos veces seguidas; tomas notas y escribes un resumen en inglés.'),
        h('li', null, h('strong', null, 'Traducción directa: '), 'traduces al inglés un texto en castellano (nota de prensa o texto técnico-administrativo).'),
        h('li', null, 'Tienes ', h('strong', null, '2 horas'), ' para ambas partes desde el final de la segunda lectura, a mano y ', h('strong', null, 'sin diccionario'), '.'),
        h('li', null, h('strong', null, 'Oral: '), 'lees tu resumen y tu traducción ante el tribunal y conversas en inglés hasta 10 minutos.'),
      ),
      h('p', { class: 'small muted' }, 'Calificación por niveles MCER: C2 = 10, C1 = 7, B2 = 5; por debajo de B2, no apto. Desde 2021-22 (IIE) y 2023 (Minas) puede sustituirse por un certificado oficial B2 o superior. Detalle en docs/EXAMEN-INGLES-CUERPOS.md.'),
    ),
  );
  for (const c of ['IIE', 'Minas'] as const) {
    const list = cuerpoExams.filter((e) => e.cuerpo === c);
    main.append(
      h('h2', null, c === 'IIE' ? 'Ingenieros Industriales del Estado' : 'Ingenieros de Minas del Estado'),
      list.length
        ? h(
            'div',
            { class: 'grid' },
            list.map((e) => {
              const done = store.data.attempts.filter((a) => a.taskId === e.meta.id);
              return h(
                'a',
                { class: `tile${done.length ? ' done' : ''}`, href: `#/cuerpos/${e.meta.id}` },
                h('h3', null, e.title),
                h('div', { class: 'small muted' }, `${countWords(e.listening.text)} palabras para resumir · ${countWords(e.spanish.text)} para traducir`),
                badges(e.meta),
                done.length ? h('div', { class: 'small' }, `Hecho ${done.length} ${done.length === 1 ? 'vez' : 'veces'} · última nota ${done[done.length - 1].score}/10`) : null,
              );
            }),
          )
        : h('p', { class: 'muted' }, 'Sin simulacros todavía.'),
    );
  }
}

function examView(main: HTMLElement, ex: CuerpoExam) {
  const stops: (() => void)[] = [];
  main.append(h('p', null, h('a', { href: '#/cuerpos' }, '← Inglés IIE / Minas')), h('h1', null, ex.title), badges(ex.meta));
  const stage = h('div');
  main.append(stage, sourceLine(ex.meta));
  const notes = h('textarea', { 'aria-label': 'Notas durante la lectura', lang: 'en', style: 'min-height:180px', placeholder: 'Toma notas aquí durante las dos lecturas…' });
  const summary = h('textarea', { 'aria-label': 'Resumen en inglés', lang: 'en', style: 'min-height:260px' });
  const translation = h('textarea', { 'aria-label': 'Traducción al inglés', lang: 'en', style: 'min-height:320px' });
  let elapsedWriting = 0;

  // ---- Fase 1: modo y lectura doble ----
  const phaseReading = () => {
    const strict = h('input', { type: 'checkbox', id: 'strict', checked: true });
    const rate = h('select', { 'aria-label': 'Velocidad de lectura' }, [0.85, 0.9, 0.95, 1, 1.05].map((r) => h('option', { value: String(r), selected: r === 0.95 }, `${r}×`)));
    const status = h('p', { class: 'result', 'aria-live': 'assertive' }, 'Preparado');
    const start = h('button', { type: 'button' }, '▶ Empezar la lectura (2 veces)');
    const skip = h('button', { type: 'button', class: 'secondary' }, 'Saltar a la parte escrita');
    const script = toReadingScript(ex.listening.text);
    let player: ReturnType<typeof scriptPlayer> | null = null;
    start.addEventListener('click', async () => {
      if (!ttsAvailable()) {
        status.textContent = 'Tu navegador no tiene síntesis de voz: pide a alguien que te lea el texto (aparece al corregir) o usa Chrome/Edge.';
        return;
      }
      await voicesReady();
      start.disabled = true;
      strict.disabled = true;
      let round = 1;
      player = scriptPlayer(script, { Asesor: 'male' }, Number(rate.value), store.data.settings.voiceName);
      stops.push(() => player?.stop());
      status.textContent = 'Primera lectura…';
      player.onEnd = () => {
        if (round === 1) {
          round = 2;
          status.textContent = 'Pausa breve… segunda lectura';
          setTimeout(() => {
            status.textContent = 'Segunda lectura…';
            player?.play();
          }, 4000);
        } else {
          beep(990);
          phaseWriting(strict.checked);
        }
      };
      player.play();
    });
    skip.addEventListener('click', () => {
      player?.stop();
      phaseWriting(strict.checked);
    });
    stage.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('h2', { style: 'margin-top:0' }, 'Parte 1 · Lectura del texto en inglés'),
        h('p', null, `«${ex.listening.title}» · unas ${countWords(ex.listening.text)} palabras. Escucharás el texto dos veces seguidas. No verás el texto hasta la corrección.`),
        h('div', { class: 'row' }, h('label', { for: 'strict' }, strict, ' Modo examen (2 h estrictas y sin ver modelos hasta entregar)'), h('label', null, 'Velocidad ', rate)),
        h('div', { class: 'row', style: 'margin-top:.6rem' }, start, skip),
        status,
      ),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Notas'), notes),
    );
  };

  // ---- Fase 2: resumen + traducción en 2 h ----
  const phaseWriting = (strict: boolean) => {
    const t = timer({ countdown: 120 * 60, label: 'Tiempo restante (2 h)', onEnd: () => { beep(440, 700); phaseCorrection(); } });
    stops.push(() => t.stop());
    const wcS = h('span', { class: 'wordcount' });
    const wcT = h('span', { class: 'wordcount' });
    const upd = () => {
      const s = countWords(summary.value);
      wcS.textContent = `${s} palabras (orientativo: 150-250)`;
      wcS.className = `wordcount ${s >= 150 && s <= 260 ? 'ok' : s ? 'bad' : ''}`;
      wcT.textContent = `${countWords(translation.value)} palabras`;
    };
    summary.addEventListener('input', upd);
    translation.addEventListener('input', upd);
    upd();
    const submit = h('button', { type: 'button' }, 'Entregar y corregir');
    submit.addEventListener('click', () => {
      if (confirm('¿Entregar el ejercicio escrito?')) {
        elapsedWriting = t.elapsed;
        t.stop();
        phaseCorrection();
      }
    });
    stage.replaceChildren(
      h('p', { class: 'notice' }, strict ? 'Modo examen: sin diccionario ni traductor. Escribe como lo harías a mano.' : 'Modo práctica.'),
      h('div', { class: 'card' }, h('h2', { style: 'margin-top:0' }, 'Tus notas'), notes),
      h('div', { class: 'card' }, h('h2', { style: 'margin-top:0' }, 'Parte 1 · Resumen en inglés'), summary, wcS),
      h(
        'div',
        { class: 'card' },
        h('h2', { style: 'margin-top:0' }, 'Parte 2 · Traducción directa al inglés'),
        h('h3', null, ex.spanish.title),
        h('div', { class: 'text-body', lang: 'es' }, ex.spanish.text.split(/\n\s*\n/).map((p) => h('p', null, p))),
        translation,
        wcT,
      ),
      h('div', { class: 'sticky-bar' }, submit, h('span', { class: 'spacer' }), t.el),
    );
    t.start();
    summary.focus();
  };

  // ---- Fase 3: corrección ----
  const phaseCorrection = () => {
    window.speechSynthesis?.cancel();
    const kp = ex.keyPoints.map((k, i) => h('label', { class: 'opt', for: `kp-${i}` }, h('input', { type: 'checkbox', id: `kp-${i}` }), k));
    const level = h('select', { id: 'lvl-w', 'aria-label': 'Nivel MCER del escrito' }, h('option', { value: '' }, '—'), MCER_GRADES.map((g) => h('option', { value: String(g.value) }, g.label)));
    const toOral = h('button', { type: 'button' }, 'Continuar al oral →');
    const msg = h('p', { 'aria-live': 'polite', class: 'small' });
    toOral.addEventListener('click', () => {
      if (level.value === '') {
        msg.textContent = 'Elige tu nivel estimado del escrito.';
        return;
      }
      phaseOral(Number(level.value), kp.filter((x) => (x.querySelector('input') as HTMLInputElement).checked).length);
    });
    const exp = h('button', { type: 'button', class: 'secondary' }, 'Exportar Markdown para corrección');
    exp.addEventListener('click', () => download(`${ex.meta.id}-escrito.md`, exportMd(ex, notes.value, summary.value, translation.value), 'text/markdown'));
    store.data.writings[ex.meta.id] = { text: `## Resumen\n\n${summary.value}\n\n## Traducción\n\n${translation.value}`, updated: new Date().toISOString() };
    store.save();
    const side = (title: string, mine: string, model: string) =>
      h(
        'div',
        { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(300px,1fr))' },
        h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, `${title}: tu versión`), h('div', { class: 'text-body', style: 'white-space:pre-wrap' }, mine || '(vacío)')),
        h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, `${title}: modelo`), h('div', { class: 'text-body' }, model.split(/\n\s*\n/).map((p) => h('p', null, p)))),
      );
    stage.replaceChildren(
      h('h2', null, 'Corrección del escrito'),
      h('details', { class: 'card' }, h('summary', null, `Texto leído: «${ex.listening.title}»`), h('div', { class: 'text-body' }, ex.listening.text.split(/\n\s*\n/).map((p) => h('p', null, p)))),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '¿Qué ideas clave recoge tu resumen?'), kp),
      side('Resumen', summary.value, ex.modelSummary),
      side('Traducción', translation.value, ex.modelTranslation),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Glosario de la traducción'), h('ul', null, ex.glossary.map((g) => h('li', null, g)))),
      h(
        'div',
        { class: 'card' },
        h('h3', { style: 'margin-top:0' }, 'Autoevaluación del escrito'),
        h('p', { class: 'small muted' }, 'Criterios del tribunal: comprensión y expresión, coherencia y organización, corrección gramatical y ortográfica, fidelidad del resumen a las ideas del texto. Sé exigente; mejor aún, exporta y pide corrección externa.'),
        h('label', { for: 'lvl-w' }, 'Nivel estimado: '),
        level,
        h('div', { class: 'row', style: 'margin-top:.6rem' }, toOral, exp),
        msg,
      ),
    );
    window.scrollTo(0, 0);
  };

  // ---- Fase 4: oral ----
  const phaseOral = (written: number, keyHits: number) => {
    const rec = recorder();
    stops.push(() => rec.dispose());
    const t = timer({ countdown: 600, label: 'Conversación (10 min)', onEnd: () => beep(440, 700) });
    stops.push(() => t.stop());
    const qBox = h('div', { class: 'card flashcard', 'aria-live': 'polite' }, 'Pulsa «Siguiente pregunta» cuando termines de leer.');
    let qi = 0;
    const next = h('button', { type: 'button' }, 'Siguiente pregunta del tribunal');
    next.addEventListener('click', async () => {
      if (!t.running) t.start();
      const q = ex.oralQuestions[qi % ex.oralQuestions.length];
      qi++;
      qBox.replaceChildren(h('div', null, q), h('div', { class: 'small muted' }, `Pregunta ${qi}`));
      if (ttsAvailable()) {
        await voicesReady();
        const p = scriptPlayer([{ speaker: 'Tribunal', text: q }], { Tribunal: 'female' }, 0.95, store.data.settings.voiceName);
        p.play();
      }
    });
    const level = h('select', { id: 'lvl-o', 'aria-label': 'Nivel MCER del oral' }, h('option', { value: '' }, '—'), MCER_GRADES.map((g) => h('option', { value: String(g.value) }, g.label)));
    const res = h('div', { 'aria-live': 'polite' });
    const finish = h('button', { type: 'button' }, 'Terminar y guardar');
    finish.addEventListener('click', () => {
      if (level.value === '') {
        res.textContent = 'Elige tu nivel estimado del oral.';
        return;
      }
      t.stop();
      rec.stop();
      const oral = Number(level.value);
      const g = cuerpoGrade(written, oral);
      const tags = [...(written < 7 ? ['cuerpo-escrito'] : []), ...(oral < 7 ? ['cuerpo-oral'] : []), ...(keyHits < ex.keyPoints.length * 0.7 ? ['cuerpo-resumen-ideas'] : [])];
      store.addAttempt({ taskId: ex.meta.id, skill: 'writing', topic: ex.meta.topic, domain: ex.meta.domain, score: written, max: 10, errorTags: tags, durationSec: elapsedWriting });
      store.addAttempt({ taskId: `${ex.meta.id}-oral`, skill: 'speaking', topic: ex.meta.topic, domain: ex.meta.domain, score: oral, max: 10, errorTags: oral < 7 ? ['cuerpo-oral'] : [] });
      res.replaceChildren(
        h('p', { class: 'result' }, `Calificación estimada: ${g.grade}/10 · ${g.apto ? 'APTO' : 'NO APTO'} (escrito ${written}, oral ${oral})`),
        h('p', null, `Ideas clave recogidas en el resumen: ${keyHits}/${ex.keyPoints.length}.`),
        h('p', null, h('a', { href: '#/cuerpos' }, 'Otro simulacro'), ' · ', h('a', { href: '#/progreso' }, 'Ver progreso')),
      );
    });
    stage.replaceChildren(
      h('h2', null, 'Parte oral (sesión pública)'),
      h(
        'div',
        { class: 'card' },
        h('ol', null, h('li', null, 'Pulsa «Grabar» y lee en voz alta tu resumen y tu traducción, como ante el tribunal.'), h('li', null, 'Después pulsa «Siguiente pregunta»: el tribunal te pregunta en voz alta. Responde 1-2 minutos cada vez, hasta 10 minutos.'), h('li', null, 'Escucha la grabación y autoevalúa (fluidez, corrección, pronunciación, vocabulario, comprensión).')),
        rec.el,
      ),
      h('details', { class: 'card' }, h('summary', null, 'Tu resumen y tu traducción (para leer)'), h('div', { class: 'text-body', style: 'white-space:pre-wrap' }, `${summary.value}\n\n${translation.value}`)),
      h('div', { class: 'row' }, next, t.el),
      qBox,
      h('div', { class: 'card' }, h('label', { for: 'lvl-o' }, 'Nivel estimado del oral: '), level, ' ', finish, res),
    );
    window.scrollTo(0, 0);
  };

  phaseReading();
  return () => stops.forEach((s) => s());
}

export function exportMd(ex: CuerpoExam, notes: string, summary: string, translation: string): string {
  return [
    `# ${ex.title} (${ex.cuerpo})`,
    '',
    `Simulacro del ejercicio de inglés del Cuerpo de ${ex.cuerpo === 'IIE' ? 'Ingenieros Industriales' : 'Ingenieros de Minas'} del Estado.`,
    '',
    '## Texto leído (inglés)',
    '',
    ex.listening.text,
    '',
    '## Mis notas',
    '',
    notes || '(sin notas)',
    '',
    `## Mi resumen (${countWords(summary)} palabras)`,
    '',
    summary,
    '',
    '## Texto a traducir (castellano)',
    '',
    ex.spanish.text,
    '',
    '## Mi traducción',
    '',
    translation,
    '',
    '## Petición de corrección',
    '',
    'Corrige este ejercicio como el tribunal del cuerpo: valora comprensión y expresión, coherencia y organización, corrección gramatical y ortográfica y fidelidad del resumen. Asigna un nivel MCER (C2 = 10, C1 = 7, B2 = 5, inferior = no apto), señala errores con su corrección y explica en español los fallos de traducción más importantes.',
  ].join('\n');
}

export function cuerposView(main: HTMLElement, params: string[]) {
  if (!params[0]) return listView(main);
  const ex = cuerpoExams.find((e) => e.meta.id === params[0]);
  if (!ex) return notFound(main, '#/cuerpos');
  return examView(main, ex);
}
