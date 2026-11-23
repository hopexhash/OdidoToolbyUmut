import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// The toolkit itself: one self-contained IIFE (JS + CSS inlined) that the loader injects
// into the ServiceNow page. Post-processed by scripts/postbuild.mjs into a versioned file.
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist/_toolkit',
    emptyOutDir: true,
    target: 'es2019',
    cssCodeSplit: false,
    lib: {
      entry: 'src/toolkit/main.tsx',
      name: 'ITSMToolkit',
      formats: ['iife'],
      fileName: () => 'toolkit.js',
    },
  },
});
