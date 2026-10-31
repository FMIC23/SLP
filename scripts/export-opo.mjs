#!/usr/bin/env node
/**
 * Exporta la versión PÚBLICA (sin material privado) al proyecto OpoIndustriales.
 *   node scripts/export-opo.mjs ../opoindustriales      → copia el build en ../opoindustriales/public/ingles/
 * Aparta temporalmente data/private y public/private para que el build no los incluya.
 */
import { cpSync, existsSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
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
  status = spawnSync(npm, ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;
} finally {
  moves.forEach(([a, b]) => renameSync(b, a));
}
if (status !== 0) process.exit(status);
rmSync(dest, { recursive: true, force: true });
cpSync(join(ROOT, 'dist'), dest, { recursive: true });
rmSync(join(dest, 'private'), { recursive: true, force: true });
console.log(`✔ Versión pública copiada en ${dest} (servida en /ingles/index.html)`);
