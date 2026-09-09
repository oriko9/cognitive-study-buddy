import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 is wired as a Vite plugin. There is no postcss.config.js and no
// tailwind.config.js: v4 discovers content itself and is configured from CSS.
// Mixing in the v3 PostCSS + @tailwind directive style leaves Tailwind inert.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // api/ is included: adapter tests live beside the adapter, and a pattern
    // that silently excludes them reports green over an untested boundary.
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  },
});
