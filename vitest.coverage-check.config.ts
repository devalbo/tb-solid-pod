import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// CI/quality gate: enforce minimum coverage thresholds (global).
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        // Re-declare provider to keep types narrow.
        provider: 'v8',
        thresholds: {
          lines: 20,
          functions: 20,
          branches: 20,
          statements: 20,
        },
      },
    },
  })
);

