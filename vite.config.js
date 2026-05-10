import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(currentDir, 'src'),
  publicDir: resolve(currentDir, 'assets'),
  server: {
    host: '0.0.0.0',
  },
});
