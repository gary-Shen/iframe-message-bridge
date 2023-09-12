import { defineConfig } from 'vite';
import tsMonoAlias from 'vite-plugin-ts-mono-alias';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',

  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },

  plugins: [
    react(),
    tsMonoAlias({}),
    ],
  build: {
    target: 'es2015',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
      },
    },
  },
});
