import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        potree: resolve(__dirname, 'src/index.js'),
        core: resolve(__dirname, 'src/core.js'),
        'workers/DecoderWorker': resolve(__dirname, 'src/modules/loader/2.0/DecoderWorker.js'),
        'workers/DecoderWorker_brotli': resolve(__dirname, 'src/modules/loader/2.0/DecoderWorker_brotli.js'),
        'workers/BinaryDecoderWorker': resolve(__dirname, 'src/workers/BinaryDecoderWorker.js'),
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'potree.css';
          }
          return assetInfo.name || '[name][extname]';
        },
      },
    },
    sourcemap: true,
    emptyOutDir: false,
  },
});
