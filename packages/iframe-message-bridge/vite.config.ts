import { resolve } from 'path';

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'IframeMessageBridge',
      formats: ['es', 'umd'],
      fileName: 'index',
    },
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, 'src'),
    },
  },
});
