#!/usr/bin/env node
/**
 * Importa tu material personal de material/ a formatos estructurados.
 *
 *   node scripts/import-material.mjs
 *
 * Qué hace:
 *  1. Inventario: recorre material/ y genera data/private/material-index.json
 *     (título, tipo, destreza estimada, ruta). Privado: no se publica.
 *  2. Apuntes de speaking (material/**\/speaking top.{txt,md,docx}): los convierte en
 *     mazos de flashcards por tema en data/private/vocabulary/speaking-phrases.json
 *     (frases "inglés - español" → anverso/reverso). Conserva el origen en meta.source.
 *  3. Audios (.mp3/.m4a/.ogg/.wav): los copia a public/private/audio/ y crea
 *     data/private/audio-index.json para reproducirlos en la sección Listening (solo en local).
 *
 * Los .docx se leen directamente (sin herramientas externas), también en Windows.
 */
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MATERIAL = join(ROOT, 'material');
const PRIVATE = join(ROOT, 'data', 'private');
const PUBLIC_AUDIO = join(ROOT, 'public', 'private', 'audio');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const TYPE_BY_EXT = {
  '.pdf': 'pdf', '.docx': 'documento', '.doc': 'documento', '.txt': 'texto', '.md': 'texto', '.html': 'web',
  '.mp3': 'audio', '.m4a': 'audio', '.wav': 'audio', '.ogg': 'audio', '.jpg': 'imagen', '.jpeg': 'imagen', '.png': 'imagen',
  '.mkv': 'vídeo', '.mp4': 'vídeo', '.zip': 'archivo', '.rar': 'archivo',
};

export function guessSkill(name) {
  const n = name.toLowerCase();
  if (/listening|audio|track|cd\d|\.mp3$/.test(n)) return 'listening';
  if (/speaking/.test(n)) return 'speaking';
  if (/writing|essay|report|proposal/.test(n)) return 'writing';
  if (/use of english|rephras|phrasal|grammar|vocabulary|connector/.test(n)) return 'useofenglish';
  if (/reading/.test(n)) return 'reading';
  if (/test|exam|sample|paper/.test(n)) return 'simulacro';
  return 'general';
}

const isHeading = (l) => {
  const letters = l.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  return letters.length >= 3 && l.length <= 60 && letters === letters.toUpperCase() && !/ - /.test(l);
};

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Convierte el texto de apuntes en mazos por tema. Exportada para pruebas. */
export function parseSpeakingNotes(text, sourceName) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\\\./g, '.').replace(/\\/g, '').trim()).filter(Boolean);
  // Saltar el índice inicial: empezar en la primera línea "1. ..."
  let start = lines.findIndex((l) => /^1\.\s*[A-Z]/.test(l));
  if (start < 0) start = 0;
  const decks = [];
  let current = null;
  for (const l of lines.slice(start)) {
    if (/^\d+\s*\.\s*\S/.test(l) || (isHeading(l) && !current)) {
      const title = l.replace(/^\d+\s*\.\s*/, '').trim();
      current = { title, sub: '', cards: [] };
      decks.push(current);
      continue;
    }
    if (!current) continue;
    if (isHeading(l)) {
      current.sub = l;
      continue;
    }
    if (l.length < 3 || l.length > 220) continue;
    const m = l.match(/^(.*?)\s+[-–]\s+(.*)$/);
    const front = (m ? m[1] : l).trim();
    const back = m ? m[2].trim() : 'Frase útil (apuntes): úsala en tu respuesta';
    current.cards.push({ front, back, note: current.sub ? `Subtema: ${current.sub}` : undefined });
  }
  return decks
    .filter((d) => d.cards.length >= 3)
    .map((d, i) => {
      const id = `mat-sp-${String(i + 1).padStart(2, '0')}-${slug(d.title).slice(0, 30)}`;
      const seen = new Set();
      const cards = d.cards
        .filter((c) => (seen.has(c.front.toLowerCase()) ? false : seen.add(c.front.toLowerCase())))
        .map((c, j) => ({ id: `${id}-${String(j + 1).padStart(3, '0')}`, ...c }));
      return {
        meta: {
          id, skill: 'vocabulary', level: 'C1', topic: d.title.toLowerCase(), domain: /crime|law/i.test(d.title) ? 'police' : 'general',
          source: `Material propio: ${sourceName} (apuntes de clase)`, license: 'Uso personal (apuntes del usuario)', generated: false,
        },
        title: `Speaking: ${d.title.charAt(0) + d.title.slice(1).toLowerCase()}`,
        category: 'speaking-phrases',
        cards,
      };
    });
}

/** Lee una entrada de un ZIP (un .docx lo es) sin herramientas externas: funciona igual en Windows, macOS y Linux. */
export function readZipEntry(buf, name) {
  // Directorio central: buscar el registro de fin (EOCD) desde el final
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('ZIP no válido');
  let ptr = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(ptr + 10);
    const csize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const local = buf.readUInt32LE(ptr + 42);
    const entry = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    if (entry === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + csize);
      return method === 0 ? data : inflateRawSync(data);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`No existe ${name} en el ZIP`);
}

function readText(path) {
  if (extname(path).toLowerCase() === '.docx') {
    const xml = readZipEntry(readFileSync(path), 'word/document.xml').toString('utf8');
    return xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"');
  }
  return readFileSync(path, 'utf8');
}

function main() {
  const files = walk(MATERIAL).filter((p) => !basename(p).startsWith('.') && basename(p) !== 'README.md');
  mkdirSync(PRIVATE, { recursive: true });

  // 1. Inventario
  const index = files.map((p) => {
    const rel = relative(MATERIAL, p);
    const ext = extname(p).toLowerCase();
    return { title: basename(p), type: TYPE_BY_EXT[ext] ?? ext.slice(1), skill: guessSkill(rel), folder: rel.split('/').slice(0, -1).join('/'), url: `material/${rel}`, usage: 'local' };
  });
  writeFileSync(join(PRIVATE, 'material-index.json'), JSON.stringify(index, null, 2));
  console.log(`Inventario: ${index.length} archivos → data/private/material-index.json`);

  // 2. Apuntes de speaking
  const notes = files.filter((p) => /speaking top\.(txt|md|docx)$/i.test(basename(p)));
  const decks = notes.flatMap((p) => parseSpeakingNotes(readText(p), basename(p)));
  if (decks.length) {
    mkdirSync(join(PRIVATE, 'vocabulary'), { recursive: true });
    writeFileSync(join(PRIVATE, 'vocabulary', 'speaking-phrases.json'), JSON.stringify(decks, null, 1));
    console.log(`Apuntes de speaking: ${decks.length} temas, ${decks.reduce((a, d) => a + d.cards.length, 0)} tarjetas → data/private/vocabulary/speaking-phrases.json (privado)`);
  }

  // 3. Audios
  const audios = files.filter((p) => ['.mp3', '.m4a', '.wav', '.ogg'].includes(extname(p).toLowerCase()));
  if (audios.length) {
    mkdirSync(PUBLIC_AUDIO, { recursive: true });
    const audioIndex = audios.map((p) => {
      const rel = relative(MATERIAL, p);
      const safe = slug(rel.replace(extname(rel), '')) + extname(p).toLowerCase();
      copyFileSync(p, join(PUBLIC_AUDIO, safe));
      return { title: rel.replace(extname(rel), ''), src: `private/audio/${safe}`, folder: rel.split('/').slice(0, -1).join('/') };
    });
    writeFileSync(join(PRIVATE, 'audio-index.json'), JSON.stringify(audioIndex, null, 2));
    console.log(`Audios: ${audios.length} copiados a public/private/audio (solo local)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('import-material.mjs')) main();
