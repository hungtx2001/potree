import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      outDir: 'dist/types',
      insertTypesEntry: true,
    }),
  ],
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        potree: resolve(__dirname, 'src/Potree.ts'),
        core: resolve(__dirname, 'src/core/index.ts'),
        react: resolve(__dirname, 'src/react/index.ts'),
        cesium: resolve(__dirname, 'src/cesium/index.ts'),
        'workers/DecoderWorker': resolve(__dirname, 'src/workers/DecoderWorker.ts'),
        'workers/DecoderWorker_brotli': resolve(__dirname, 'src/workers/DecoderWorker_brotli.ts'),
        'workers/BinaryDecoderWorker': resolve(__dirname, 'src/workers/BinaryDecoderWorker.ts'),
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
        'json5',
        'copc',
        'i18next',
        '@ngageoint/geopackage',
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      output: {
        globals: {
          three: 'THREE',
          react: 'React',
          'react-dom': 'ReactDOM',
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
  },
});
