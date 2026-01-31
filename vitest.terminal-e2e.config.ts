/**
 * Config for terminal-only CLI E2E (no browser).
 * Use: vitest run tests/e2e-cli-terminal.spec.ts --config vitest.terminal-e2e.config.ts
 * This config does not exclude the terminal E2E spec so it can run.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e-cli-terminal.spec.ts'],
    exclude: ['tests/terminal/**'],
    testTimeout: 30_000,
  },
});
