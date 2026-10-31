#!/usr/bin/env node
// Valida la coherencia de todos los JSON de data/ (y data/private/ si existe).
// Uso: node scripts/validate-data.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'data');
const errors = [];
const warn = [];
const ids = new Map();

const SKILLS = ['reading', 'useofenglish', 'listening', 'writing', 'speaking', 'vocabulary'];
const LEVELS = ['C1', 'SLP3', 'C1/SLP3'];
const DOMAINS = ['general', 'industrial', 'police'];

const grammarIds = new Set(
  existsSync(join(DATA, 'grammar.json')) ? JSON.parse(readFileSync(join(DATA, 'grammar.json'), 'utf8')).map((g) => g.id) : [],
);

function err(file, msg) {
  errors.push(`${file}: ${msg}`);
}

function checkMeta(file, m, skill) {
  if (!m || typeof m !== 'object') return err(file, 'falta meta');
  for (const k of ['id', 'skill', 'level', 'topic', 'domain', 'source', 'license']) if (!m[k]) err(file, `${m.id ?? '?'} meta.${k} vacío`);
  if (typeof m.generated !== 'boolean') err(file, `${m.id} meta.generated debe ser boolean`);
  if (!SKILLS.includes(m.skill)) err(file, `${m.id} skill inválida ${m.skill}`);
  if (skill && m.skill !== skill) err(file, `${m.id} skill ${m.skill} no coincide con carpeta ${skill}`);
  if (!LEVELS.includes(m.level)) err(file, `${m.id} level inválido ${m.level}`);
  if (!DOMAINS.includes(m.domain)) err(file, `${m.id} domain inválido ${m.domain}`);
  if (ids.has(m.id)) err(file, `id duplicado ${m.id} (también en ${ids.get(m.id)})`);
  ids.set(m.id, file);
}

function checkQuestions(file, owner, qs, text) {
  if (!Array.isArray(qs) || qs.length === 0) return err(file, `${owner} sin preguntas`);
  const qids = new Set();
  qs.forEach((q, i) => {
    const where = `${owner} q${i + 1}`;
    if (!q.id) err(file, `${where} sin id`);
    if (qids.has(q.id)) err(file, `${where} id repetido ${q.id}`);
    qids.add(q.id);
    if (!q.explanation) err(file, `${where} sin explicación`);
    if (!q.tag) err(file, `${where} sin tag`);
    if (q.grammarRef && !grammarIds.has(q.grammarRef)) err(file, `${where} grammarRef desconocido ${q.grammarRef}`);
    if (q.kind === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) err(file, `${where} options insuficientes`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(file, `${where} answer fuera de rango`);
      else if (new Set(q.options).size !== q.options.length) err(file, `${where} opciones duplicadas`);
    } else if (q.kind === 'text') {
      if (!Array.isArray(q.accepted) || q.accepted.length === 0 || q.accepted.some((a) => !String(a).trim())) err(file, `${where} accepted vacío`);
    } else err(file, `${where} kind inválido ${q.kind}`);
  });
  if (text) {
    const gaps = [...text.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]));
    if (gaps.length) {
      const expected = qs.map((_, i) => i + 1);
      const sorted = [...gaps].sort((a, b) => a - b);
      if (sorted.join(',') !== expected.join(',')) err(file, `${owner} huecos [[n]] (${gaps.join(',')}) no cuadran con ${qs.length} preguntas`);
    }
  }
}

function validateFile(path, folder) {
  const file = relative(ROOT, path);
  let json;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return err(file, `JSON inválido: ${e.message}`);
  }
  if (!Array.isArray(json)) return err(file, 'debe ser un array');
  for (const item of json) {
    switch (folder) {
      case 'reading':
        checkMeta(file, item.meta, 'reading');
        if (!item.title || !item.format || !item.instructions) err(file, `${item.meta?.id} faltan title/format/instructions`);
        if (!item.text && !item.sections) err(file, `${item.meta?.id} sin text ni sections`);
        checkQuestions(file, item.meta?.id, item.questions, item.text);
        if (item.format === 'multiple-matching' || item.format === 'cross-text') {
          const n = item.sections?.length ?? 0;
          item.questions?.forEach((q) => q.options?.length !== n && err(file, `${item.meta.id} ${q.id}: options debe tener ${n} secciones`));
        }
        break;
      case 'useofenglish':
        checkMeta(file, item.meta, 'useofenglish');
        if (!item.part || !item.instructions) err(file, `${item.meta?.id} faltan part/instructions`);
        checkQuestions(file, item.meta?.id, item.questions, item.text);
        if (item.part === 'kwt') item.questions?.forEach((q) => (!q.keyword || !q.original) && err(file, `${item.meta.id} ${q.id} KWT sin keyword/original`));
        if (item.part === 'word-formation') item.questions?.forEach((q) => !q.stem && err(file, `${item.meta.id} ${q.id} sin stem`));
        break;
      case 'listening':
        checkMeta(file, item.meta, 'listening');
        if (!Array.isArray(item.script) || item.script.length === 0) err(file, `${item.meta?.id} sin script`);
        checkQuestions(file, item.meta?.id, item.questions);
        break;
      case 'vocabulary': {
        checkMeta(file, item.meta, 'vocabulary');
        if (!item.category) err(file, `${item.meta?.id} sin category`);
        if (!Array.isArray(item.cards) || !item.cards.length) err(file, `${item.meta?.id} sin cards`);
        const seen = new Set();
        item.cards?.forEach((c) => {
          if (!c.id || !c.front || !c.back) err(file, `${item.meta?.id} card incompleta ${JSON.stringify(c).slice(0, 60)}`);
          if (ids.has(c.id) || seen.has(c.id)) err(file, `card id duplicado ${c.id}`);
          seen.add(c.id);
          ids.set(c.id, file);
        });
        break;
      }
      case 'writing':
        if (path.endsWith('phrase-bank.json')) {
          json.forEach((g) => (!g.id || !g.title || !g.phrases?.length) && err(file, `grupo incompleto ${g.id}`));
          return;
        }
        checkMeta(file, item.meta, 'writing');
        for (const k of ['title', 'genre', 'prompt', 'minWords', 'maxWords', 'timeMinutes']) if (!item[k]) err(file, `${item.meta?.id} falta ${k}`);
        if (item.minWords > item.maxWords) err(file, `${item.meta?.id} minWords > maxWords`);
        if (item.model) {
          const wc = item.model.trim().split(/\s+/).length;
          if (wc < item.minWords * 0.9 || wc > item.maxWords * 1.15) warn.push(`${file}: ${item.meta.id} modelo con ${wc} palabras (rango ${item.minWords}-${item.maxWords})`);
        }
        break;
      case 'speaking':
        if (path.endsWith('debate-questions.json')) {
          json.forEach((g) => (!g.topic || !g.questions?.length) && err(file, `grupo de debate incompleto`));
          return;
        }
        checkMeta(file, item.meta, 'speaking');
        for (const k of ['title', 'part', 'prompt', 'prepSeconds', 'speakSeconds']) if (item[k] === undefined || item[k] === '') err(file, `${item.meta?.id} falta ${k}`);
        if (!Array.isArray(item.points)) err(file, `${item.meta?.id} points debe ser array`);
        break;
      case 'cuerpos': {
        checkMeta(file, item.meta, 'writing');
        if (!['IIE', 'Minas'].includes(item.cuerpo)) err(file, `${item.meta?.id} cuerpo inválido`);
        for (const k of ['title', 'modelSummary', 'modelTranslation']) if (!item[k]) err(file, `${item.meta?.id} falta ${k}`);
        if (!item.listening?.text || !item.spanish?.text) err(file, `${item.meta?.id} faltan textos`);
        const wc = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length;
        const le = wc(item.listening?.text);
        const es = wc(item.spanish?.text);
        if (le < 400 || le > 1000) warn.push(`${file}: ${item.meta?.id} texto inglés con ${le} palabras (400-1000)`);
        if (es < 400 || es > 900) warn.push(`${file}: ${item.meta?.id} texto castellano con ${es} palabras (400-900)`);
        if (!item.keyPoints?.length || !item.oralQuestions?.length || !item.glossary?.length) err(file, `${item.meta?.id} faltan keyPoints/glossary/oralQuestions`);
        break;
      }
      default:
        break;
    }
  }
}

function walk(dir, folder) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, folder ?? name);
    else if (name.endsWith('.json') && folder) validateFile(p, folder);
  }
}

for (const folder of ['reading', 'useofenglish', 'listening', 'vocabulary', 'writing', 'speaking', 'cuerpos']) {
  const d = join(DATA, folder);
  if (existsSync(d)) walk(d, folder);
  const p = join(DATA, 'private', folder);
  if (existsSync(p)) walk(p, folder);
}

const counts = {};
for (const [id, file] of ids) {
  const k = file.split('/').slice(0, -1).join('/');
  counts[k] = (counts[k] ?? 0) + 1;
}
warn.forEach((w) => console.warn('AVISO', w));
if (errors.length) {
  errors.forEach((e) => console.error('ERROR', e));
  console.error(`\n${errors.length} errores`);
  process.exit(1);
}
console.log('Datos válidos.', Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' | '));
