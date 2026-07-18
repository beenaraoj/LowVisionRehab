import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same build works at the repo root locally
  // and under /LowVisionRehab/ on GitHub Pages.
  base: './',
});
