#!/usr/bin/env node
/**
 * Exporta la versión PÚBLICA (sin material privado) al proyecto OpoIndustriales.
 *   node scripts/export-opo.mjs ../opoindustriales      → copia el build en ../opoindustriales/public/ingles/
 * Compila con VITE_EDITION=opo (perfil «Alumno/a», textos sin ámbito policial).
 * Aparta temporalmente data/private y public/private para que el build no los incluya.
 */
import { fileURLToPath } from 'node:url';
import { cpSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(process.argv[2] ?? '../opoindustriales');
const dest = join(target, 'public', 'ingles');
if (!existsSync(join(target, 'package.json'))) {
  console.error(`No encuentro el proyecto OpoIndustriales en ${target}`);
  process.exit(1);
}
const moves = [
  [join(ROOT, 'data', 'private'), join(ROOT, 'data', '.private-aparte')],
  [join(ROOT, 'public', 'private'), join(ROOT, 'public', '.private-aparte')],
].filter(([a]) => existsSync(a));
let status = 1;
try {
  moves.forEach(([a, b]) => renameSync(a, b));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  status = spawnSync(npm, ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, VITE_EDITION: 'opo' } }).status ?? 1;
} finally {
  moves.forEach(([a, b]) => renameSync(b, a));
}
if (status !== 0) process.exit(status);
rmSync(dest, { recursive: true, force: true });
cpSync(join(ROOT, 'dist'), dest, { recursive: true });
rmSync(join(dest, 'private'), { recursive: true, force: true });
// Textos estáticos de la edición opo (sin ámbito policial)
for (const f of ['index.html', 'manifest.webmanifest']) {
  const p = join(dest, f);
  if (!existsSync(p)) continue;
  const out = readFileSync(p, 'utf8')
    .replaceAll('Entrenador de inglés C1 Advanced y SLP 3 (STANAG 6001) con vocabulario industrial y policial', 'Inglés C1 y ejercicio de idioma de los Cuerpos de Ingenieros Industriales y de Minas del Estado')
    .replaceAll('Inglés C1 Advanced y SLP 3 (STANAG 6001) con vocabulario industrial y policial', 'Inglés C1 y ejercicio de idioma de los Cuerpos de Ingenieros Industriales y de Minas del Estado')
    .replaceAll('Entrenador C1 · SLP 3', 'Inglés · OpoIndustriales')
    .replaceAll('"short_name": "C1·SLP3"', '"short_name": "Inglés"')
    .replaceAll('>C1 · SLP 3<', '>Inglés · OpoIndustriales<');
  if (/SLP|STANAG|policial/.test(out)) throw new Error(`Quedan textos SLP/STANAG/policial en ${f}`);
  writeFileSync(p, out);
}
console.log(`✔ Versión pública copiada en ${dest} (servida en /ingles/index.html)`);
