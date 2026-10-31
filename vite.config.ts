import { defineConfig } from 'vite';

// base relativa: funciona en GitHub Pages (/SLP/) y en local
export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
