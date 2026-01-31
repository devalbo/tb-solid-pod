import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/terminal/**', 'tests/e2e-cli-terminal.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Demo app & UI components (coverage focuses on the library/CLI layers)
        'src/App.tsx',
        'src/components/**/*.{ts,tsx}',
        'src/examples/**/*.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/main.tsx',
        'src/index.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
