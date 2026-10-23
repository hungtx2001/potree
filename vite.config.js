import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        potree: resolve(__dirname, 'src/index.js'),
        core: resolve(__dirname, 'src/core.js'),
      },
      name: 'Potree',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'three',
        'three/examples/jsm/lines/Line2.js',
        'three/examples/jsm/lines/LineGeometry.js',
        'three/examples/jsm/lines/LineMaterial.js',
        'three/examples/jsm/webxr/VRButton.js',
        'three/examples/jsm/webxr/XRControllerModelFactory.js',
        '@tweenjs/tween.js',
        'proj4',
        'd3',
        'json5',
      ],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: false,
  },
});
