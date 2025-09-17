import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative asset paths so GitHub Pages works when served under /<repo>/
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
