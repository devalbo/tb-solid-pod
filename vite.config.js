import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { inkWebPlugin } from 'ink-web/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// BASE_PATH: set in CI (e.g. '/tb-solid-pod/') for GitHub Pages; local dev uses '/'
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [inkWebPlugin(), react()],
  resolve: {
    // Browser bundle uses ink-web so the same CLI JSX runs in both terminal (ink) and browser (ink-web).
    alias: {
      ink: 'ink-web',
      os: path.resolve(__dirname, 'node_modules/ink-web/src/shims/os.ts'),
      'node:os': path.resolve(__dirname, 'node_modules/ink-web/src/shims/os.ts'),
    },
  },
})
