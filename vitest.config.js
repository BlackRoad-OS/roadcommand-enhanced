import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      include: ['*.js'],
      exclude: ['eslint.config.js', 'vitest.config.js']
    }
  }
});
