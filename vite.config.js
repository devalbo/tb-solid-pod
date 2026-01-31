import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { inkWebPlugin } from 'ink-web/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function safeExec(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return undefined
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const gitCommitSha =
  safeExec('git rev-parse --short=7 HEAD') ?? (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : undefined) ?? 'unknown'
const gitBranch = (() => {
  const b = safeExec('git rev-parse --abbrev-ref HEAD')
  if (b && b !== 'HEAD') return b
  return process.env.GITHUB_REF_NAME ?? (process.env.GITHUB_REF ? process.env.GITHUB_REF.split('/').slice(-1)[0] : undefined) ?? 'unknown'
})()
const buildTimestamp = new Date().toISOString()
const releaseTag = process.env.VITE_RELEASE_TAG ?? null

// https://vite.dev/config/
// BASE_PATH: set in CI (e.g. '/tb-solid-pod/') for GitHub Pages; local dev uses '/'
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT_SHA__: JSON.stringify(gitCommitSha),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __RELEASE_TAG__: JSON.stringify(releaseTag),
  },
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
