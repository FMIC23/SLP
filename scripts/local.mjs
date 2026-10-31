#!/usr/bin/env node
/**
 * App local completa (con tu material privado):
 *   1. Importa material/ si contiene archivos (apuntes, audios, inventario).
 *   2. Valida datos y construye (incluye data/private/).
 *   3. Sirve la app en http://localhost:4173 y abre el navegador.
 * Uso: npm run local   (o doble clic en iniciar-windows.bat / iniciar-mac-linux.command)
 */
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (args) => {
  const r = spawnSync(npm, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!existsSync(join(ROOT, 'node_modules'))) run(['install']);
const material = join(ROOT, 'material');
const hasMaterial = existsSync(material) && readdirSync(material).some((n) => n !== 'README.md' && !n.startsWith('.'));
if (hasMaterial) run(['run', 'import:material']);
else console.log('ℹ material/ vacío: se usa solo el contenido público (copia tu carpeta de Drive en material/ para añadir el tuyo).');
run(['run', 'build']);
console.log('\n✔ App lista en http://localhost:4173  (Ctrl+C para cerrar)\n');
run(['exec', '--', 'vite', 'preview', '--open']);
