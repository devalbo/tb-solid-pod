import { defineConfig } from 'vitest/config';
import base from './vitest.config';

// CI/quality gate: enforce minimum coverage thresholds (global).
export default defineConfig({
  ...(base as unknown as Record<string, unknown>),
  test: {
    // @ts-expect-error - base config shape is compatible at runtime
    ...(base.test ?? {}),
    coverage: {
      // @ts-expect-error - base config shape is compatible at runtime
      ...(base.test?.coverage ?? {}),
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
    },
  },
});

