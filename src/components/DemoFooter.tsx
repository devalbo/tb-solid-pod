import React, { CSSProperties } from 'react'

const REPO_URL = 'https://github.com/devalbo/tb-solid-pod'

function formatBuiltLocal(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DemoFooter(): React.ReactElement {
  const versionLabel = __RELEASE_TAG__ ? `Release ${__RELEASE_TAG__}` : `v${__APP_VERSION__}`
  const builtLocal = formatBuiltLocal(__BUILD_TIMESTAMP__)

  const commitSha = __GIT_COMMIT_SHA__
  const branch = __GIT_BRANCH__
  const commitHref = commitSha && commitSha !== 'unknown' ? `${REPO_URL}/commit/${commitSha}` : REPO_URL

  return (
    <footer style={styles.footer}>
      <div style={styles.left}>
        <span style={styles.product}>tb-solid-pod {versionLabel}</span>
        <span style={styles.sep}>•</span>
        <span style={styles.meta}>Built {builtLocal}</span>
        <span style={styles.sep}>•</span>
        <a href={commitHref} target="_blank" rel="noopener noreferrer" style={styles.link}>
          Commit <span style={styles.mono}>{commitSha}</span>
        </a>
        <span style={styles.sep}>•</span>
        <span style={styles.meta}>
          Branch <span style={styles.mono}>{branch}</span>
        </span>
      </div>
      <div style={styles.right}>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>
          GitHub
        </a>
      </div>
    </footer>
  )
}

const styles: Record<string, CSSProperties> = {
  footer: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 24px',
    borderTop: '1px solid #e6e8eb',
    background: '#ffffff',
    color: '#667085',
    fontSize: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  product: {
    color: '#344054',
    fontWeight: 600,
  },
  meta: {
    color: '#667085',
  },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  sep: {
    color: '#c0c6cf',
  },
  link: {
    color: '#1d4ed8',
    textDecoration: 'none',
    fontWeight: 500,
  },
}

