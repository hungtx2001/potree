import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/entry.js'),
      name: 'Potree',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'potree.js' : 'potree.cjs'),
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
