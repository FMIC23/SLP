import { externalResources, grammarRefs, materialIndex } from '../core/content';
import { store } from '../core/store';
import { download, h, SKILL_LABEL } from '../ui/dom';
import { englishVoices, voicesReady } from '../ui/tts';

export function grammarView(main: HTMLElement, params: string[]) {
  main.append(h('h1', null, 'Gramática de referencia'), h('p', { class: 'muted' }, 'Resúmenes breves enlazados desde las correcciones. Cada ficha incluye un enlace a una explicación ampliada.'));
  for (const g of grammarRefs) {
    const open = params[0] === g.id;
    const d = h(
      'details',
      { class: 'card', id: `g-${g.id}`, open },
      h('summary', null, g.title),
      h('p', null, g.summary),
      h('ul', null, g.examples.map((e) => h('li', { lang: 'en' }, e))),
      g.url ? h('p', { class: 'small' }, h('a', { href: g.url, target: '_blank', rel: 'noopener' }, 'Explicación ampliada (Cambridge Dictionary Grammar)')) : null,
    );
    main.append(d);
    if (open) setTimeout(() => d.scrollIntoView({ block: 'start' }), 0);
  }
}

export function resourcesView(main: HTMLElement) {
  main.append(h('h1', null, 'Recursos abiertos y enlaces'), h('p', { class: 'muted' }, 'Recursos legales y gratuitos. Los que tienen derechos se enlazan (no se copian). Ver docs/LICENSES.md.'));
  const groups = new Map<string, typeof externalResources>();
  for (const r of externalResources) groups.set(r.skill, [...(groups.get(r.skill) ?? []), r]);
  for (const [skill, list] of groups) {
    main.append(h('h2', null, skill === 'general' ? 'Exámenes y general' : SKILL_LABEL[skill] ?? skill), h('ul', { class: 'card' }, list.map((r) => h('li', { style: 'margin-bottom:.5rem' }, h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title), ` — ${r.provider}. ${r.description} `, h('span', { class: 'small muted' }, `(${r.license})`)))));
  }
  if (materialIndex.length) {
    main.append(h('h2', null, 'Tu material (solo local)'), h('p', { class: 'small muted' }, 'Inventario generado por scripts/import-material.mjs. No se publica.'), h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', null, h('tbody', null, materialIndex.map((m) => h('tr', null, h('td', null, m.title), h('td', null, m.type), h('td', null, m.skill), h('td', { class: 'small muted' }, m.folder)))))));
  }
}

export function settingsView(main: HTMLElement) {
  main.append(h('h1', null, 'Ajustes y copia de seguridad'));
  // Exportar / importar
  const exp = h('button', { type: 'button' }, 'Exportar progreso (JSON)');
  exp.addEventListener('click', () => download(`progreso-c1-slp-${new Date().toISOString().slice(0, 10)}.json`, store.exportJson(), 'application/json'));
  const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp' });
  const msg = h('p', { 'aria-live': 'polite' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      store.importJson(await f.text());
      msg.textContent = `Progreso importado: ${store.data.attempts.length} intentos, ${Object.keys(store.data.srs).length} tarjetas.`;
    } catch (e) {
      msg.textContent = `No se pudo importar: ${(e as Error).message}`;
    }
  });
  const reset = h('button', { type: 'button', class: 'secondary' }, 'Borrar todo el progreso');
  reset.addEventListener('click', () => {
    if (confirm('¿Seguro? Exporta antes una copia. Esta acción no se puede deshacer.')) {
      store.reset();
      msg.textContent = 'Progreso borrado.';
    }
  });
  main.append(
    h('div', { class: 'card' }, h('h2', { style: 'margin-top:0' }, 'Copia de seguridad'), h('p', { class: 'small muted' }, 'El progreso vive solo en este navegador (localStorage). Exporta una copia periódicamente o para pasarla a otro dispositivo.'), h('div', { class: 'row' }, exp, h('label', { for: 'imp', class: 'btn secondary' }, 'Importar JSON…'), file, reset), msg),
  );
  file.style.display = 'none';

  // Preferencias
  const rate = h('input', { type: 'number', min: '0.6', max: '1.5', step: '0.05', value: String(store.data.settings.voiceRate), id: 'rate', style: 'width:6rem' });
  rate.addEventListener('change', () => {
    store.data.settings.voiceRate = Math.min(1.5, Math.max(0.6, Number(rate.value) || 1));
    store.save();
  });
  const newCards = h('input', { type: 'number', min: '0', max: '100', value: String(store.data.settings.dailyNewCards), id: 'newc', style: 'width:6rem' });
  newCards.addEventListener('change', () => {
    store.data.settings.dailyNewCards = Math.max(0, Number(newCards.value) || 0);
    store.save();
  });
  const voiceSel = h('select', { id: 'voice' }, h('option', { value: '' }, 'Automática (británica si existe)'));
  voicesReady().then(() => {
    for (const v of englishVoices()) voiceSel.append(h('option', { value: v.name, selected: v.name === store.data.settings.voiceName }, `${v.name} (${v.lang})`));
  });
  voiceSel.addEventListener('change', () => {
    store.data.settings.voiceName = voiceSel.value || undefined;
    store.save();
  });
  main.append(
    h(
      'div',
      { class: 'card' },
      h('h2', { style: 'margin-top:0' }, 'Preferencias'),
      h('p', null, h('label', { for: 'rate' }, 'Velocidad de voz por defecto (Listening): '), rate),
      h('p', null, h('label', { for: 'voice' }, 'Voz principal: '), voiceSel),
      h('p', null, h('label', { for: 'newc' }, 'Tarjetas nuevas por sesión de vocabulario: '), newCards),
    ),
  );
}

export function guideView(main: HTMLElement) {
  const sec = (title: string, ...children: (Node | string)[]) => h('div', { class: 'card' }, h('h2', { style: 'margin-top:0' }, title), ...children);
  const tbl = (head: string[], rows: string[][]) => h('div', { style: 'overflow-x:auto' }, h('table', null, h('thead', null, h('tr', null, head.map((x) => h('th', null, x)))), h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, c)))))));
  main.append(
    h('h1', null, 'Guía: C1 Advanced y SLP 3'),
    sec(
      'Cambridge C1 Advanced (formato vigente)',
      tbl(
        ['Prueba', 'Duración', 'Partes', 'Qué evalúa'],
        [
          ['Reading and Use of English', '1 h 30 min', '8 partes, 56 preguntas', 'P1 MC cloze (8) · P2 open cloze (8) · P3 word formation (8) · P4 key word transformations (6) · P5 multiple choice (6) · P6 cross-text matching (4) · P7 gapped text (6) · P8 multiple matching (10)'],
          ['Writing', '1 h 30 min', '2 partes', 'P1 essay obligatorio (220-260 palabras) · P2 a elegir: email/letter, proposal, report o review (220-260)'],
          ['Listening', '≈ 40 min', '4 partes, 30 preguntas', 'P1 tres extractos (6) · P2 sentence completion (8) · P3 entrevista MC (6) · P4 multiple matching (10)'],
          ['Speaking', '15 min (en pareja)', '4 partes', 'Entrevista · long turn con fotos · tarea colaborativa · discusión'],
        ],
      ),
      h('p', { class: 'small' }, 'Puntuación en la Cambridge English Scale: 180-199 = C1 (aprobado); 200-210 = C2; 160-179 = certificado B2. Cada destreza pesa 20 % (Reading y Use of English se puntúan por separado). Writing: 4 criterios (Content, Communicative Achievement, Organisation, Language) de 0 a 5. Speaking: Grammatical & Lexical Resource, Discourse Management, Pronunciation, Interactive Communication.'),
    ),
    sec(
      'STANAG 6001 – nivel 3 (Professional) por destreza',
      h('p', { class: 'small muted' }, 'Resumen propio de los descriptores públicos de STANAG 6001 (ed. 5). El perfil SLP se escribe en el orden Listening.Speaking.Reading.Writing; 3.3.3.3 = nivel 3 en las cuatro.'),
      tbl(
        ['Destreza', 'Nivel 3: qué debes poder hacer', 'Dónde se practica en la app'],
        [
          ['Comprensión auditiva (L)', 'Entender la mayor parte del discurso formal e informal sobre temas prácticos, sociales y profesionales (incluido el propio campo): reuniones, conferencias, briefings, noticias, conversaciones rápidas. Captar ideas implícitas, actitud y tono.', 'Listening (Parts 1-4 y SLP 3), simulacros SLP'],
          ['Expresión oral (S)', 'Conversar con eficacia en situaciones formales e informales sobre temas profesionales y abstractos; defender opiniones, formular hipótesis, explicar asuntos complejos. Errores ocasionales que no afectan a la comunicación.', 'Speaking: entrevista SLP, briefings, role-plays, presentaciones técnicas, debate'],
          ['Comprensión lectora (R)', 'Leer con casi total comprensión textos auténticos generales y profesionales (informes, normativa, prensa, editoriales), inferir, distinguir hechos de opiniones y captar intención y tono del autor.', 'Reading (Parts 5-8 y SLP 3)'],
          ['Expresión escrita (W)', 'Redactar con eficacia correspondencia y documentos formales e informales (informes, memorandos, resúmenes) sobre temas profesionales y abstractos, argumentando y formulando hipótesis, con buena organización y control gramatical.', 'Writing: informes técnicos, memorandos SLP, correos formales, essays'],
        ],
      ),
      h('div', { class: 'notice small' }, 'Formato del examen SLP en España (Guardia Civil / FAS): lo organiza el Ministerio de Defensa (Escuela de Idiomas / centros evaluadores). Las pruebas suelen ser multinivel: comprensión auditiva y lectora con preguntas de opción múltiple sobre textos de dificultad creciente, expresión escrita con tareas por nivel y expresión oral mediante entrevista con evaluadores (≈ 20-30 min). Se suele requerir en torno a un 70 % en las tareas de un nivel para alcanzarlo. Comprueba el formato exacto en la convocatoria vigente: si difiere de lo que te hayan contado, prevalece la convocatoria (ver README).'),
    ),
    sec(
      'Correspondencia aproximada',
      tbl(
        ['MCER', 'Cambridge Scale', 'STANAG 6001', 'APTIS (escala MCER)'],
        [
          ['B2', '160-179', '2 / 2+', 'B2'],
          ['C1', '180-199', '3', 'C (C1)'],
          ['C2', '200-230', '3+ / 4', 'C (C2, solo Aptis Advanced)'],
        ],
      ),
      h('p', { class: 'small muted' }, 'La equivalencia MCER ↔ STANAG no es oficial y es solo orientativa: STANAG evalúa competencia profesional en contexto militar/policial. Para la AGE suelen valer Cambridge, APTIS, EOI, Trinity, TOEFL, IELTS u Oxford Test: revisa siempre las bases de la convocatoria.'),
    ),
  );
}
