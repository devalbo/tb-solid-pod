# Versioning and Build Information

This document describes the versioning strategy for **tb-solid-pod** and how build version information is tracked and displayed in the demo application.

## Terms

- **SHA** (Secure Hash Algorithm) — Git commit identifier (e.g., `abc1234`); we use the short 7-character form.
- **SemVer** (Semantic Versioning) — Version numbering scheme: MAJOR.MINOR.PATCH (e.g., `0.1.0`).
- **CI** (Continuous Integration) — Automated build and deployment via GitHub Actions.
- **UTC** (Coordinated Universal Time) — The primary time standard; all timestamps are generated and stored in UTC, then converted to local time for display.

## Overview

The project tracks three types of version information:

1. **Release version** — Semantic version from `package.json` (`0.1.0`)
2. **Build metadata** — Git commit hash, branch, build timestamp (UTC)
3. **Release tag** — Optional git tag for production releases (e.g., `v0.1.0`)

This information is injected at build time via Vite's `define` feature and displayed on the demo page.

**Time handling:** All timestamps are generated and stored in UTC (Coordinated Universal Time) using ISO 8601 format. When displayed to users, timestamps are converted to the user's local timezone for readability. The raw UTC timestamp is always available for debugging and programmatic access.

### Visual Examples

**Development build footer:**
```
tb-solid-pod v0.1.0  •  Build abc1234  •  Jan 31, 2026
```

**Release build footer:**
```
tb-solid-pod Release v0.2.0  •  Build def5678  •  Feb 15, 2026
```

**Detailed view (About tab):**
```
┌─────────────────────────────────────────────────────────┐
│ Version Information                                     │
├─────────────────────────────────────────────────────────┤
│ Version:          Release v0.2.0                        │
│ Commit:           def5678 (view on GitHub)              │
│ Branch:           main                                  │
│ Built:            Jan 31, 2026, 10:30:45 AM             │
│ Build Timestamp:  2026-01-31T18:30:45.123Z (UTC)        │
│ Environment:      production                            │
│                                                         │
│ [View release notes →]                                  │
└─────────────────────────────────────────────────────────┘
```

**Note:** The "Built" field shows local time (user's timezone), while "Build Timestamp" shows the original UTC timestamp for reference.

## Version Information Structure

The application exposes version metadata through global constants:

```ts
// Available at runtime in the browser
__APP_VERSION__      // "0.1.0" from package.json
__GIT_COMMIT_SHA__   // "abc1234" (short SHA)
__GIT_BRANCH__       // "main" or feature branch name
__BUILD_TIMESTAMP__  // ISO 8601: "2026-01-31T10:30:00.000Z"
__BUILD_ENV__        // "development" | "production"
__RELEASE_TAG__      // "v0.1.0" | undefined (set in CI for tagged releases)
```

### Build Timestamp Details

The `__BUILD_TIMESTAMP__` constant captures the exact moment the build was executed:

- **Format:** ISO 8601 string in UTC (e.g., `"2026-01-31T18:30:45.123Z"`)
- **Timezone:** Always UTC (Coordinated Universal Time) for storage
- **Precision:** Milliseconds included
- **Generated:** At the start of the Vite build process
- **Display:** Converted to user's local timezone for readability

**Display formats:**

```ts
// Parse the timestamp
const buildDate = new Date(__BUILD_TIMESTAMP__)

// User-friendly local time (preferred for UI)
buildDate.toLocaleString()  // "1/31/2026, 10:30:45 AM" (user's timezone)
buildDate.toLocaleDateString()  // "1/31/2026"
buildDate.toLocaleTimeString()  // "10:30:45 AM"

// More readable format with options
buildDate.toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})  // "Jan 31, 2026, 10:30:45 AM"

// ISO format (for debugging, logs, programmatic access)
buildDate.toISOString()  // "2026-01-31T18:30:45.123Z" (always UTC)

// Relative time (timezone-agnostic)
const hoursAgo = Math.floor((Date.now() - buildDate.getTime()) / (1000 * 60 * 60))
`Built ${hoursAgo}h ago`
```

**Best practices:**

- **User-facing displays:** Use `toLocaleString()` or `toLocaleDateString()` to show time in user's timezone
- **Technical displays:** Show both local time and UTC timestamp for reference
- **Logs and storage:** Always use ISO 8601 UTC format (`toISOString()`)
- **API responses:** Return UTC ISO 8601; let clients convert to local time

**Why store in UTC, display in local?**
- **Storage consistency:** UTC ensures all builds have unambiguous timestamps
- **User experience:** Local time is more intuitive for users ("2:30 PM" vs "19:30 UTC")
- **Debugging:** Always keep UTC available for troubleshooting across timezones
- **Standard practice:** Matches industry best practices (databases, APIs, logs use UTC)

**Build age indicator:** For development builds, showing how old the build is helps developers know if they need to rebuild:

```tsx
function BuildAge({ timestamp }: { timestamp: string }) {
  const age = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(age / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return <span>{days}d ago</span>
  if (hours > 0) return <span>{hours}h ago</span>
  return <span>Just built</span>
}
```

## Implementation Strategy

### 1. Build-Time Injection

The `vite.config.js` defines global constants using Vite's `define` option:

- Reads `version` from `package.json`
- Executes git commands (`git rev-parse`, `git branch`) to capture commit and branch
- Generates ISO 8601 build timestamp
- Checks for `VITE_RELEASE_TAG` environment variable (set in CI for releases)

```js
// vite.config.js
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT_SHA__: JSON.stringify(gitSHA),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __BUILD_ENV__: JSON.stringify(process.env.NODE_ENV || 'development'),
    __RELEASE_TAG__: JSON.stringify(process.env.VITE_RELEASE_TAG),
  },
  // ... other config
})
```

### 2. TypeScript Declarations

Add global type declarations so TypeScript recognizes these constants:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __GIT_COMMIT_SHA__: string
declare const __GIT_BRANCH__: string
declare const __BUILD_TIMESTAMP__: string
declare const __BUILD_ENV__: 'development' | 'production'
declare const __RELEASE_TAG__: string | undefined
```

### 3. Version Display Component

Create a reusable component that formats and displays version information:

```tsx
// src/components/VersionInfo.tsx
export function VersionInfo() {
  const isRelease = !!__RELEASE_TAG__
  const buildDate = new Date(__BUILD_TIMESTAMP__)
  
  // Format build date/time in user's local timezone
  const localDateStr = buildDate.toLocaleDateString()
  const localTimeStr = buildDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  return (
    <div className="version-info">
      <div className="version-primary">
        {isRelease ? `Release ${__RELEASE_TAG__}` : `v${__APP_VERSION__}`}
      </div>
      <div className="version-meta">
        Build: {__GIT_COMMIT_SHA__} on {__GIT_BRANCH__}
        <br />
        Built: {localDateStr} at {localTimeStr}
      </div>
    </div>
  )
}
```

**Compact version for footer:**

```tsx
// src/components/VersionBadge.tsx
export function VersionBadge() {
  const buildDate = new Date(__BUILD_TIMESTAMP__)
  const version = __RELEASE_TAG__ || `v${__APP_VERSION__}`
  
  // Show local date for user readability
  const localDateStr = buildDate.toLocaleDateString()
  
  return (
    <div className="version-badge">
      {version} • Build {__GIT_COMMIT_SHA__} • {localDateStr}
    </div>
  )
}
```

**Detailed version for About tab:**

```tsx
// src/components/VersionDetail.tsx
export function VersionDetail() {
  const isRelease = !!__RELEASE_TAG__
  const buildDate = new Date(__BUILD_TIMESTAMP__)
  const repoUrl = 'https://github.com/devalbo/tb-solid-pod'
  
  // Format for display: local time for users, UTC for reference
  const localDateTime = buildDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  return (
    <div className="version-detail">
      <h3>Version Information</h3>
      
      <dl>
        <dt>Version</dt>
        <dd>{isRelease ? __RELEASE_TAG__ : `${__APP_VERSION__} (development)`}</dd>
        
        <dt>Commit</dt>
        <dd>
          <a href={`${repoUrl}/commit/${__GIT_COMMIT_SHA__}`} target="_blank">
            {__GIT_COMMIT_SHA__}
          </a>
        </dd>
        
        <dt>Branch</dt>
        <dd>{__GIT_BRANCH__}</dd>
        
        <dt>Built</dt>
        <dd>{localDateTime}</dd>
        
        <dt>Build Timestamp (UTC)</dt>
        <dd><code>{buildDate.toISOString()}</code></dd>
        
        <dt>Environment</dt>
        <dd>{__BUILD_ENV__}</dd>
      </dl>
      
      {isRelease && (
        <a href={`${repoUrl}/releases/tag/${__RELEASE_TAG__}`} target="_blank">
          View release notes
        </a>
      )}
    </div>
  )
}
```

**Note:** The "Built" field shows local time for user convenience, while "Build Timestamp (UTC)" shows the original UTC value for debugging and reference.
```

### 4. Integration in App

The version info appears in the demo page (`App.tsx`), typically in:
- **Footer** — Always visible, subtle styling
- **About tab** — Detailed build information with links
- **CLI info command** — Terminal output for programmatic access

```tsx
// App.tsx
<footer className="app-footer">
  <VersionInfo />
</footer>
```

## GitHub Actions Integration

### Development Builds (Push to main)

The `.github/workflows/pages.yml` workflow builds on every push to `main`:

```yaml
- name: Build
  env:
    BASE_PATH: "/tb-solid-pod/"
  run: npm run build
```

Development builds show:
- Version from `package.json` (e.g., `v0.1.0`)
- Latest commit SHA on `main`
- "Development build" indicator
- **Build timestamp:** UTC time when GitHub Actions runner executed the build

**Build time considerations:**

- GitHub Actions runs in UTC timezone
- Build time is stored in UTC (ISO 8601 format)
- Users see build time converted to their local timezone in the UI
- Typical build takes 2-3 minutes from push to deployment

**Example timeline:**

```
18:30:00 UTC — Developer pushes to main (10:30 AM PST)
18:30:05 UTC — GitHub Actions starts workflow
18:30:45 UTC — Build completes (timestamp: 2026-01-31T18:30:45.123Z)
18:31:30 UTC — Deployed to GitHub Pages
18:32:00 UTC — User visits page
              - PST user sees: "Built: 1/31/2026 at 10:30 AM"
              - EST user sees: "Built: 1/31/2026 at 1:30 PM"
              - UTC user sees: "Built: 1/31/2026 at 6:30 PM"
              - All can view UTC timestamp for reference: 2026-01-31T18:30:45.123Z
```

### Release Builds (Git tags)

For tagged releases, extend the workflow to detect tags:

```yaml
- name: Build release
  if: startsWith(github.ref, 'refs/tags/')
  env:
    BASE_PATH: "/tb-solid-pod/"
    VITE_RELEASE_TAG: ${{ github.ref_name }}
  run: npm run build
```

Release builds show:
- Release tag (e.g., `Release v0.1.0`)
- Commit SHA and branch
- **Build timestamp:** UTC time when release build executed
- Link to GitHub releases page

**Release build timing:**

When you push a tag, the build is triggered immediately:

```bash
# Developer pushes tag at 19:00 UTC (2:00 PM EST on Jan 31, 2026)
git push origin v0.2.0

# GitHub Actions starts: ~19:00 UTC
# Build completes: ~19:03 UTC
# Build timestamp: 2026-01-31T19:03:15.456Z (stored in UTC)

# Users see in their local timezone:
# EST: "Built: Jan 31, 2026, 2:03 PM"
# PST: "Built: Jan 31, 2026, 11:03 AM"
# UTC: "Built: Jan 31, 2026, 7:03 PM"
# With UTC reference always available: 2026-01-31T19:03:15.456Z
```

**Timestamp accuracy:**

- **Commit time** vs **Build time:** The git commit has its own timestamp. The build timestamp is when the CI system compiled the code, typically a few minutes later.
- **Build vs Deploy:** GitHub Pages deployment adds another 30-60 seconds after the build completes.
- Users care about **build time** (when the code was compiled), not deploy time.
- Timestamps stored in UTC, displayed in user's local timezone for better UX.

### Workflow Trigger Update

To build on tags, update the workflow trigger:

```yaml
on:
  push:
    branches: [main]
    tags:
      - 'v*'  # Trigger on version tags (v0.1.0, v1.2.3, etc.)
```

## Versioning Strategy

### SemVer Principles

We follow **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR** (0.x.x → 1.0.0) — Breaking changes, incompatible API changes
- **MINOR** (0.1.x → 0.2.0) — New features, backward-compatible additions
- **PATCH** (0.1.0 → 0.1.1) — Bug fixes, backward-compatible fixes

### Pre-1.0 Status

The project is currently **0.1.0** (pre-release):
- API is not stable
- Breaking changes may occur in minor versions
- Once stable, we'll release 1.0.0

### Release Process

Follow these steps to cut a new release:

#### Quick Checklist

Before you start:
- [ ] All changes merged to `main`
- [ ] Tests passing locally
- [ ] Build succeeds locally
- [ ] You've decided on version number (patch/minor/major)

To release:
- [ ] Run `npm version [patch|minor|major]` to bump version and create tag
- [ ] Push commits: `git push origin main`
- [ ] Push tag: `git push --tags`
- [ ] Wait for GitHub Actions to complete
- [ ] Create GitHub Release with notes
- [ ] Verify live demo shows correct version

#### Step 1: Prepare the Release

1. **Ensure all changes are merged** — All features and fixes for the release should be merged to `main`
2. **Run tests locally** — Verify all tests pass:
   ```bash
   npm run test:run
   npm run test:e2e
   ```
3. **Build locally** — Ensure the build succeeds:
   ```bash
   npm run build
   ```
4. **Review changes** — Look at commits since last release:
   ```bash
   git log v0.1.0..HEAD --oneline
   ```
   (Replace `v0.1.0` with the last release tag)

#### Step 2: Update Version

Choose the appropriate version bump based on changes:

- **Patch** (0.1.0 → 0.1.1) — Bug fixes only, no new features
- **Minor** (0.1.0 → 0.2.0) — New features, backward-compatible
- **Major** (0.1.0 → 1.0.0) — Breaking changes

Use npm version commands (recommended):

```bash
# For a minor release (new features)
npm version minor -m "Release v%s"

# This does three things:
# 1. Updates package.json version (0.1.0 → 0.2.0)
# 2. Creates a git commit with message "Release v0.2.0"
# 3. Creates a git tag "v0.2.0"
```

Or manually:

```bash
# 1. Edit package.json, change version: "0.2.0"
# 2. Commit the change
git add package.json
git commit -m "Bump version to 0.2.0"
# 3. Create annotated tag
git tag -a v0.2.0 -m "Release v0.2.0"
```

#### Step 3: Push the Release

```bash
# Push the commit
git push origin main

# Push the tag (triggers release build in CI)
git push origin v0.2.0

# Or push all tags at once
git push --tags
```

**Important:** The tag push triggers the GitHub Actions workflow to build the release with `VITE_RELEASE_TAG` set.

#### Step 4: Create GitHub Release (Optional but Recommended)

1. Go to the repository on GitHub
2. Click **Releases** (right sidebar)
3. Click **Draft a new release**
4. Select the tag you just pushed (e.g., `v0.2.0`)
5. Set release title: `Release v0.2.0` or `v0.2.0`
6. Add release notes:
   ```markdown
   ## What's New in v0.2.0
   
   ### Features
   - Added version display to demo page
   - Implemented contact search
   
   ### Bug Fixes
   - Fixed persona form validation
   
   ### Internal
   - Updated dependencies
   - Improved build process
   
   **Full Changelog**: https://github.com/devalbo/tb-solid-pod/compare/v0.1.0...v0.2.0
   ```
7. Optionally attach artifacts (e.g., `dist.zip` of built files)
8. Click **Publish release**

#### Step 5: Verify the Release

1. **Check GitHub Actions** — Verify the workflow completed successfully:
   - Go to **Actions** tab in GitHub
   - Look for the workflow triggered by the tag push
   - Ensure "Deploy to GitHub Pages" succeeded

2. **Check the live demo** — Visit the deployed page and verify version:
   - Open browser console, look for version log
   - Check footer shows correct version
   - Verify "Release v0.2.0" appears (not "Development build")

3. **Test the tagged build** — Clone fresh and test:
   ```bash
   git clone https://github.com/devalbo/tb-solid-pod.git test-release
   cd test-release
   git checkout v0.2.0
   npm install
   npm run build
   npm run preview
   ```

#### Step 6: Announce (Optional)

- Update README.md if needed (version number, new features)
- Notify users/collaborators
- Update any external documentation

### Version Bumping Quick Reference

```bash
# Patch release (0.1.0 → 0.1.1) - Bug fixes
npm version patch -m "Release v%s"

# Minor release (0.1.0 → 0.2.0) - New features
npm version minor -m "Release v%s"

# Major release (0.1.0 → 1.0.0) - Breaking changes
npm version major -m "Release v%s"

# Always push the tag after versioning
git push origin main && git push --tags
```

These commands update `package.json` and create a git tag automatically.

### Hotfix Release Process

For urgent bug fixes on a released version:

1. **Create hotfix branch from tag:**
   ```bash
   git checkout -b hotfix-0.1.1 v0.1.0
   ```

2. **Apply fixes and test:**
   ```bash
   # Make fixes, commit changes
   git commit -m "Fix critical bug in contact form"
   ```

3. **Version bump (patch only):**
   ```bash
   npm version patch -m "Hotfix v%s"
   ```

4. **Merge back to main:**
   ```bash
   git checkout main
   git merge hotfix-0.1.1
   ```

5. **Push tag:**
   ```bash
   git push origin main
   git push origin v0.1.1
   ```

### Pre-release Versions

For alpha/beta releases, use npm version with pre-release identifier:

```bash
# Alpha release (0.2.0-alpha.1)
npm version prerelease --preid=alpha -m "Release v%s"

# Beta release (0.2.0-beta.1)
npm version prerelease --preid=beta -m "Release v%s"

# Release candidate (0.2.0-rc.1)
npm version prerelease --preid=rc -m "Release v%s"
```

Pre-release versions should be tagged but typically don't get a full GitHub Release.

## Display Locations

### 1. Demo Page Footer

Visible on all tabs, minimal design:

```
tb-solid-pod v0.1.0  •  Build abc1234  •  Jan 31, 2026
```

**Implementation:**

```tsx
// App.tsx footer
<footer className="app-footer">
  <VersionBadge />
</footer>
```

**CSS styling:**

```css
.app-footer {
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #666;
  border-top: 1px solid #eee;
}

.version-badge {
  font-family: monospace;
}
```

**Note:** Date shown in user's local format. For detailed timestamp, see About tab.

### 2. About/Info Tab

Detailed version panel with:
- Full version and release status
- Git commit with link to GitHub commit
- Branch name
- Build date/time in user's local timezone
- Build timestamp in UTC for reference
- Environment (dev/prod)
- Link to GitHub releases page

**Example output:**

```
Version Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version:               Release v0.2.0
Commit:                abc1234 (view on GitHub)
Branch:                main
Built:                 Jan 31, 2026, 10:30:45 AM
Build Timestamp (UTC): 2026-01-31T18:30:45.123Z
Environment:           production

[View release notes →]
```

**Note:** "Built" shows local time for user convenience. "Build Timestamp (UTC)" shows the original UTC value for debugging.

**Implementation:**

```tsx
// App.tsx - About tab content
<div className="about-tab">
  <h2>About tb-solid-pod</h2>
  <p>Browser-based Solid-style data pod...</p>
  
  <VersionDetail />
</div>
```

### 3. CLI Info Command

Terminal command for programmatic access:

```bash
> info version
tb-solid-pod v0.1.0
Build: abc1234 on main
Built: 2026-01-31T18:30:45.123Z (6h ago)
Environment: production
```

**Implementation:**

```tsx
// src/cli/commands/info.tsx
export function InfoCommand() {
  const buildDate = new Date(__BUILD_TIMESTAMP__)
  const hoursAgo = Math.floor((Date.now() - buildDate.getTime()) / (1000 * 60 * 60))
  
  return (
    <Box flexDirection="column">
      <Text>tb-solid-pod v{__APP_VERSION__}</Text>
      <Text>Build: {__GIT_COMMIT_SHA__} on {__GIT_BRANCH__}</Text>
      <Text>Built: {__BUILD_TIMESTAMP__} ({hoursAgo}h ago)</Text>
      <Text>Environment: {__BUILD_ENV__}</Text>
    </Box>
  )
}
```

**JSON output option:**

```bash
> info version --json
{
  "version": "0.1.0",
  "commit": "abc1234",
  "branch": "main",
  "buildTimestamp": "2026-01-31T18:30:45.123Z",
  "environment": "production",
  "releaseTag": "v0.1.0"
}
```

**Note:** CLI output shows UTC ISO 8601 format (not local time) for consistency with logs and programmatic use. The relative time ("6h ago") is timezone-agnostic.

### 4. Browser Console

For debugging, version info is logged on app load (all times in UTC):

```ts
console.log('tb-solid-pod', {
  version: __APP_VERSION__,
  commit: __GIT_COMMIT_SHA__,
  branch: __GIT_BRANCH__,
  built: __BUILD_TIMESTAMP__,  // ISO 8601 UTC: "2026-01-31T18:30:45.123Z"
  environment: __BUILD_ENV__,
})
```

**Console output example:**

```
tb-solid-pod {
  version: "0.1.0",
  commit: "abc1234",
  branch: "main",
  built: "2026-01-31T18:30:45.123Z",
  environment: "production"
}
```

## Library Usage Considerations

When **tb-solid-pod** is used as a library (installed via `npm install github:devalbo/tb-solid-pod`):

- Version constants are **not included** in library exports
- Consumers use `package.json` version directly
- Build metadata is relevant only for the demo app
- Library consumers should implement their own versioning for their apps

The version display component (`VersionInfo`) is **not exported** from `src/index.ts` since it references build-time constants that don't exist in library context.

## Git Integration Details

### Commit SHA Extraction

```bash
# Short SHA (7 characters)
git rev-parse --short=7 HEAD

# Output: abc1234
```

### Branch Detection

```bash
# Current branch name
git rev-parse --abbrev-ref HEAD

# Output: main (or feature-branch-name)
```

### Fallback for Detached HEAD

In CI, the repository may be in "detached HEAD" state:

```bash
# Check if HEAD is detached
if git symbolic-ref --short HEAD 2>/dev/null; then
  # Normal branch
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
else
  # Detached HEAD (use tag or SHA)
  BRANCH=$(git describe --tags --exact-match 2>/dev/null || echo "detached")
fi
```

### Git Availability

The build process **requires git** to be available:
- Local development: git is typically installed
- CI: GitHub Actions runners include git
- Docker: Include git in the build image if building in containers

If git is unavailable, fall back to safe defaults:
- SHA: `"unknown"`
- Branch: `"unknown"`
- Log a build warning but don't fail the build

## Future Enhancements

### 1. Changelog Integration

Link version display to `CHANGELOG.md`:

```tsx
<a href={`${getAssetBase()}/CHANGELOG.md#v${__APP_VERSION__}`}>
  Release notes
</a>
```

### 2. Update Notifications

Compare current version with latest from GitHub API:

```ts
async function checkForUpdates() {
  const res = await fetch('https://api.github.com/repos/devalbo/tb-solid-pod/releases/latest')
  const latest = await res.json()
  if (latest.tag_name !== `v${__APP_VERSION__}`) {
    showUpdateNotification(latest.tag_name)
  }
}
```

### 3. Version History

Store version history in LocalStorage to track updates:

```ts
const versionHistory = [
  { version: '0.1.0', firstSeen: '2026-01-15T...' },
  { version: '0.2.0', firstSeen: '2026-01-31T...' },
]
```

### 4. Build Number

Add CI build number for traceability:

```yaml
env:
  VITE_BUILD_NUMBER: ${{ github.run_number }}
```

### 5. Commit Message

Include commit message in build info:

```bash
git log -1 --pretty=%B
```

Useful for "What changed in this build?" context.

## Related Documentation

- [AGENTS.md](../AGENTS.md) — Project overview and conventions
- [PRINCIPLES_AND_GOALS.md](PRINCIPLES_AND_GOALS.md) — Core principles
- [SDLC_PROCESS.md](SDLC_PROCESS.md) — Development lifecycle and release process
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Vite define documentation](https://vite.dev/config/shared-options.html#define)
- [Semantic Versioning](https://semver.org/)

## Troubleshooting

### Build shows wrong timestamp

**Problem:** Build timestamp shows an old date or incorrect time.

**Causes:**
1. Cached build artifacts — Vite cached the previous build
2. Browser caching — Browser is showing an old version of the page
3. Incorrect local timezone interpretation — Browser timezone settings may be wrong

**Solutions:**

```bash
# Clear Vite cache and rebuild
rm -rf node_modules/.vite dist/
npm run build

# For browser caching
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
# Or open DevTools → Network → Disable cache

# Check browser timezone (if local time seems wrong)
# JavaScript console: Intl.DateTimeFormat().resolvedOptions().timeZone
# Should return your expected timezone like "America/New_York"
```

**If local time display seems wrong:**

```javascript
// In browser console, check the timestamp and your timezone:
console.log('Stored UTC:', __BUILD_TIMESTAMP__)
console.log('As Date:', new Date(__BUILD_TIMESTAMP__))
console.log('Local string:', new Date(__BUILD_TIMESTAMP__).toLocaleString())
console.log('Your timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone)
```

### Release tag not showing

**Problem:** Pushed a tag but version shows "Development build" instead of "Release v0.2.0"

**Checklist:**
1. ✓ Tag was pushed: `git ls-remote --tags origin`
2. ✓ Workflow triggered on tag: Check GitHub Actions → workflow run shows tag name
3. ✓ `VITE_RELEASE_TAG` was set in workflow
4. ✓ Build completed successfully
5. ✓ Deployment to GitHub Pages succeeded

**Verify workflow trigger:**

```yaml
# .github/workflows/pages.yml should include:
on:
  push:
    branches: [main]
    tags:
      - 'v*'
```

**Check environment variable:**

```yaml
# Build step should set VITE_RELEASE_TAG for tags
- name: Build
  if: startsWith(github.ref, 'refs/tags/')
  env:
    VITE_RELEASE_TAG: ${{ github.ref_name }}
  run: npm run build
```

### Git commands fail in Docker builds

**Problem:** Building in Docker container, git commands in `vite.config.js` fail.

**Solution:** Install git in the Docker image:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY . .
RUN npm ci && npm run build
```

**Fallback:** Modify `vite.config.js` to handle git failures gracefully:

```js
function getGitSHA() {
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim()
  } catch (e) {
    console.warn('Git not available, using fallback SHA')
    return 'unknown'
  }
}
```

### Version mismatch between package.json and display

**Problem:** Updated `package.json` to `0.2.0` but app still shows `v0.1.0`.

**Causes:**
1. Didn't rebuild after updating `package.json`
2. Browser cached old bundle
3. Deployed wrong branch/commit

**Solutions:**

```bash
# 1. Rebuild
npm run build

# 2. Check package.json is correct
cat package.json | grep version

# 3. Verify bundle has new version (after build)
grep -r "__APP_VERSION__" dist/assets/*.js

# 4. Hard refresh browser
```

### Build time shows future date

**Problem:** Build timestamp shows a date in the future (in user's local time).

**Causes:**
1. Clock skew on build machine (rare with GitHub Actions)
2. Browser timezone is incorrect
3. System clock is wrong on user's machine

**Verification:**

```bash
# Check build server time (GitHub Actions uses UTC, should be correct)
date -u

# Check your local system time
date

# Verify timezone setting
# macOS: System Preferences → Date & Time
# Linux: timedatectl
# Windows: Settings → Time & Language
```

**Fix for local builds with wrong time:**

```bash
# macOS: Enable automatic time sync
sudo systemsetup -setusingnetworktime on

# Linux: Sync with NTP
sudo ntpdate -s time.nist.gov

# Verify
date -u  # Should show correct UTC time
```

**Important:** Build systems should use UTC (GitHub Actions does). User browsers convert UTC to local time for display.

### Release process failed mid-way

**Problem:** Tagged release but GitHub Actions failed, or build succeeded but deployment failed.

**Recovery:**

```bash
# If workflow failed, fix the issue and re-run the workflow:
# 1. Go to GitHub Actions → Failed workflow
# 2. Click "Re-run failed jobs"

# If you need to delete and recreate the tag:
git tag -d v0.2.0              # Delete local tag
git push origin :refs/tags/v0.2.0  # Delete remote tag
# Fix the issue, then recreate tag
git tag v0.2.0
git push origin v0.2.0
```

**Important:** Deleting and recreating tags should be done carefully and only before anyone has installed/used that release.
