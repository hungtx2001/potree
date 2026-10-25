import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

function resolveJsToTs() {
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && source.startsWith('.') && source.endsWith('.js')) {
        const tsPath = resolve(dirname(importer), source.replace(/\.js$/, '.ts'));
        if (existsSync(tsPath)) {
          return tsPath;
        }
        const tsxPath = resolve(dirname(importer), source.replace(/\.js$/, '.tsx'));
        if (existsSync(tsxPath)) {
          return tsxPath;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    resolveJsToTs(),
    react(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      outDir: 'dist/types',
      insertTypesEntry: true,
    }),
  ],
  worker: {
    plugins: () => [resolveJsToTs()],
  },
  build: {
    lib: {
      entry: {
        potree: resolve(__dirname, 'src/Potree.ts'),
        core: resolve(__dirname, 'src/core.ts'),
        react: resolve(__dirname, 'src/react/index.ts'),
        cesium: resolve(__dirname, 'src/cesium/index.ts'),
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
    emptyOutDir: false,
  },
});
