import { defineConfig } from 'vite';

// base relativa: funciona en GitHub Pages (/SLP/) y en local
export default defineConfig({
  base: './',
  // Mismo puerto en desarrollo y en la app local: el progreso (localStorage) depende del origen http://localhost:4173
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
