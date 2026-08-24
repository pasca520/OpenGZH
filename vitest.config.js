import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'assets/scripts/**/*.test.js',
      'extension/tests/**/*.test.js',
      'scripts/**/*.test.js',
    ],
  },
});
