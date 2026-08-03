/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` doit correspondre au nom du dépôt GitHub Pages : le site est servi
// depuis https://<utilisateur>.github.io/boggle/ et non depuis la racine.
// Surchargeable via BASE_PATH pour un déploiement sur un autre chemin.
const base = process.env.BASE_PATH ?? '/boggle/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
