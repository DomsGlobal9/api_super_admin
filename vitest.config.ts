import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests import the code under test the way the app does: "@/..." is src/.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
