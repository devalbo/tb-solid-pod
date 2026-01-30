# GitHub & Library Plan

Make this repo suitable for **three uses**:

1. **Runnable on checkout** – clone, install, run so people can try the demo app.
2. **Usable as a library** – install (from GitHub or npm) and import schemas, components, and CLI into another project.
3. **Live demo on GitHub Pages** – built app deployed so visitors can try it at `https://<user>.github.io/<repo>/` without cloning.

---

## Goals

Goals follow the same order as the implementation steps below.

| Goal | Outcome (aligned with step) |
|------|-----------------------------|
| **1. GitHub-ready** | Repo created on GitHub; code pushed; LICENSE in repo; description and topics set (step 1). |
| **2. Runnable on checkout** | `git clone` → `npm install` → `npm run dev` works; README “Getting Started” accurate (step 2). |
| **3. Use as library** | package.json and entry point in place; consumers can install from GitHub/npm and import; README “Use as a library” section (step 3). |
| **4. GitHub Pages demo** | Vite `base` set; Pages workflow deploys `dist/` to `gh-pages`; Settings → Pages enabled; “Live demo” link in README (steps 4–5). |
| **5. Clear docs** | README explains run locally, use as library, and try the live demo (across steps 2–5). |
| **6. Publish (optional)** | npm publish or install-from-GitHub documented (step 6). |

---

## 1. Runnable on Checkout

### 1.1 Keep current app as default

- **Entry**: `index.html` + `src/main.tsx` → full demo app (existing behavior).
- **Scripts**: Keep `dev`, `build`, `preview`; no change required for “run on checkout.”

### 1.2 Getting Started in README

- README already has “Getting Started (Demo App)” with `npm install` and `npm run dev`.
- Add one line if useful: “Requires Node 18+ (or 20+).” Optionally add `.nvmrc` with e.g. `20` so `nvm use` works.

### 1.3 Optional: Node version hint

- Add **`.nvmrc`** with a single line: `20` (or your preferred LTS).
- In README Getting Started, add: “Requires Node 18+ (or use `nvm use` if you use nvm).”

### 1.4 Checklist (runnable)

- [ ] `npm install` and `npm run dev` work on a clean clone.
- [ ] README “Getting Started” matches actual commands.
- [ ] (Optional) `.nvmrc` added; README mentions Node version.

---

## 2. Usable as a Library

Two ways to “use as a library”:

- **A) Install and import** – consumer adds the package (from npm or GitHub) and imports from it.
- **B) Copy-paste** – consumer copies `src/schemas`, selected `src/components`, `src/cli`, etc. (already documented in README).

Plan focuses on **A** so the repo is a proper installable package; **B** stays as an alternative in the README.

### 2.1 Package identity

- **name**: Keep `tb-solid-pod` or use a scoped name e.g. `@yourname/tb-solid-pod` if you plan to publish to npm.
- **version**: Set a real version, e.g. `0.1.0` (semver).
- **private**: Remove `"private": true` so the package can be published (or installed from GitHub with `npm install git+https://...`).

### 2.2 What the library exposes

- **Schemas** – `src/schemas/*` (persona, contact, group, file, typeIndex, preferences, base).
- **Utils** – `src/utils/*` (settings, storeExport, typeIndex, validation).
- **CLI** – `src/cli/*` (registry, commands, terminal component).
- **Components** – `src/components/*` (PersonaList, ContactForm, etc.).

Consumers will use TypeScript (or JS) and bundle with their own build (Vite, etc.), so we can expose **source** (no separate lib build required for a first version).

### 2.3 Package.json for library use

Add/update:

```json
{
  "name": "tb-solid-pod",
  "version": "0.1.0",
  "description": "Browser-based Solid-style data pod with TinyBase: personas, contacts, groups, type indexes, WebID profile.",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "files": [
    "src",
    "README.md"
  ],
  "keywords": ["solid", "tinybase", "pod", "webid", "linked-data", "react"],
  "author": "",
  "license": "AGPL-3.0-or-later"
}
```

- **main / types / exports**: Point at **source** so consumers’ bundlers (Vite, etc.) compile TypeScript. No `dist/` or dual build unless you add a separate “lib” build later.
- **files**: Publish only `src` and README; keeps package small and avoids shipping `dist/` or demo-only files if you add a lib build later.
- Omit `"private": true` when you intend to publish or allow install from GitHub.

If you prefer a **single entry** that re-exports everything:

- Add **`src/index.ts`** at repo root that re-exports:
  - `schemas` (from `src/schemas/index.ts`),
  - `utils` (e.g. settings, storeExport, typeIndex, validation),
  - `cli` (e.g. CliTerminal, commands, registry),
  - key components (or document that they import from `tb-solid-pod/components/...`).

Then in package.json:

- `"main"`, `"types"`, and `"exports"."."` → `./src/index.ts`.

### 2.4 Consumer dependencies (peer / optional)

- **tinybase**, **react**, **react-dom**, **zod**, **@inrupt/vocab-common-rdf**, **@inrupt/vocab-solid-common** are required for full app.
- For **library** use, list them as **dependencies** so `npm install tb-solid-pod` brings them in; or list as **peerDependencies** if you want the app to supply versions (more flexible, but consumers must install them).

Recommendation for simplicity: keep as **dependencies** so install-from-GitHub / npm “just works” for the demo and for apps that don’t care about version alignment. You can switch to peerDependencies later if needed.

### 2.5 Library entry file (optional but useful)

- Add **`src/index.ts`** that:
  - Re-exports all public schemas (from `src/schemas/index.ts`).
  - Re-exports CLI and components you want to expose (e.g. `CliTerminal`, `createPersona`, etc.).
- Document in README: “To use as a library, `import { createPersona, CliTerminal, ... } from 'tb-solid-pod'` (or from GitHub: `npm i github:user/tb-solid-pod`).”

### 2.6 Checklist (library)

- [ ] `"private": true` removed (when you want it installable).
- [ ] `version` set (e.g. `0.1.0`).
- [ ] `description`, `keywords`, `author`, `license` set.
- [ ] `main`, `types`, `exports` point at source entry (e.g. `src/index.ts`).
- [ ] `files` includes `src` and `README.md`.
- [ ] (Optional) `src/index.ts` added and re-exports public API.
- [ ] README documents: install from npm or GitHub, and example `import` for library use.

---

## 3. GitHub Pages (Live Demo)

Deploy the built Vite app so visitors can use it at `https://<username>.github.io/<repo>/` (or custom domain).

### 3.1 Base path for GitHub Pages

GitHub Pages serves project sites from `/<repo>/`, so assets must use that base.

- In **`vite.config.js`** (or `vite.config.ts`), set **`base`** to the repo name with leading and trailing slash:
  - `base: '/tb-solid-pod/'` (replace with actual repo name if different).
- Rebuild: `npm run build`. Check that `dist/index.html` references assets like `/tb-solid-pod/assets/...` (not `/assets/...`).
- Optional: use an env variable so local dev keeps `base: '/'` and CI sets `base: '/repo-name/'` for the Pages build.

### 3.2 Build output

- **Script**: `npm run build` (already exists) → outputs to `dist/`.
- **Content**: `dist/` should contain `index.html` and hashed JS/CSS under `dist/assets/`. Do not commit `dist/` to main; deploy it via Actions or a separate branch.

### 3.3 Deployment options

**GitHub Actions (required)**  
- A workflow must run on push to `main`: `npm ci` → `npm run build` with `base: '/<repo>/'` → deploy `dist/` to the `gh-pages` branch.
- Use **`peaceiris/actions-gh-pages`** (or `actions/upload-pages-artifact` + `actions/deploy-pages`) to push the contents of `dist/` to the branch GitHub Pages serves from.
- In repo **Settings → Pages**: set “Deploy from a branch,” branch `gh-pages`, folder `/ (root)`.
- Do not rely on manually pushing `dist/`; the workflow keeps the live demo in sync with every push.

### 3.4 CI + deploy workflow (required)

Add a workflow that builds and deploys to GitHub Pages. For example:

- **Trigger**: push to `main` (or only when `dist/` or source changes, if you prefer).
- **Steps**:
  1. Checkout repo.
  2. Setup Node (e.g. `actions/setup-node` with version from `.nvmrc` or fixed `20`).
  3. `npm ci`
  4. Build with base path: e.g. `npm run build` (Vite reads `base` from `vite.config.js`; ensure config uses `process.env.BASE_PATH || '/'` or a repo env so Pages build uses `base: '/tb-solid-pod/'`).
  5. Deploy `dist/` to `gh-pages` (e.g. `peaceiris/actions-gh-pages` with `publish_dir: ./dist`).

Result: every push to `main` (or chosen branch) updates the live demo.

### 3.5 README and base path

- In README, add a **“Try it”** or **“Live demo”** link at the top or in Getting Started: `https://<username>.github.io/<repo>/`.
- If repo is renamed, update `base` in Vite config and the README link.

### 3.6 Checklist (GitHub Pages)

- [ ] `vite.config.js` has `base: '/<repo>/'` (or env-driven) so assets load on GitHub Pages.
- [ ] `npm run build` produces a working `dist/` when base is set.
- [ ] GitHub Actions workflow builds with correct base and deploys `dist/` to `gh-pages` (or chosen branch).
- [ ] Repo Settings → Pages: source = branch (e.g. `gh-pages`), root.
- [ ] README includes “Live demo” / “Try it” link to the Pages URL.

---

## 4. GitHub Repo Setup

### 4.1 Create the repo on GitHub

- On GitHub: **Create a new repository** (e.g. `tb-solid-pod`).
  - Choose owner (your user or org).
  - Set repo name (this becomes the path in GitHub Pages URL: `https://<owner>.github.io/<repo>/`).
  - **Do not** add a README, .gitignore, or license yet if you already have them locally (avoids merge conflicts).
  - Default branch: **main**.
- Note the repo URL (e.g. `https://github.com/<owner>/<repo>.git`); you will need the repo name for `base` in Vite and for the “Live demo” link.

### 4.2 Repo settings

- **Description**: e.g. “Browser-based Solid-style data pod with TinyBase – personas, contacts, groups, type indexes, WebID profile. Runnable demo + use as library.”
- **Topics/tags**: e.g. `solid`, `tinybase`, `pod`, `webid`, `linked-data`, `react`, `typescript`.
- **License**: Ensure LICENSE file exists (AGPL-3.0) and matches `package.json` “license”.

### 4.3 README for GitHub visitors

- First paragraph: what the project is, that it’s **runnable on checkout** and **usable as a library**.
- **Getting Started** – clone, install, run (already there).
- **Library usage** – one short section: install from GitHub (or npm) and a minimal import example; link to “Integration Guide” for details.

### 4.4 GitHub Actions

- **Pages workflow** (required): see section 3 – add `.github/workflows/pages.yml` (or similar) that builds with base path and deploys `dist/` to `gh-pages`. This is not optional; the live demo must deploy via Actions.
- **CI workflow** (optional): e.g. `.github/workflows/ci.yml` – on push/PR run `npm ci`, `npm run lint`, `npm run build` (without deploying). Useful for PR checks.
- **Publish workflow** (optional): only if you publish to npm; trigger on release tag, run `npm publish`.

### 4.5 Checklist (GitHub)

- [ ] Repo created on GitHub; default branch set (e.g. main).
- [ ] Description and topics set.
- [ ] LICENSE file present; package.json “license” matches.
- [ ] README explains runnable app + library use + “Live demo” link.
- [ ] GitHub Actions Pages workflow added; deploys `dist/` to `gh-pages` on push to main.
- [ ] Settings → Pages: source = branch `gh-pages`, root.

---

## 5. Implementation Order

1. **GitHub-ready** (do this first)
   - Create a new repository on GitHub (e.g. `tb-solid-pod`) under your user or org. Do not initialize with README / .gitignore / license if you already have them locally.
   - Push your code: add remote (`git remote add origin https://github.com/<owner>/<repo>.git`), push `main`.
   - Ensure LICENSE is in the repo. Set the repo description and topics in Settings.
   - Note the repo name; you will use it for Vite `base` and the Live demo URL in later steps.

2. **Runnable on checkout**
   - Verify `npm install` and `npm run dev` on clean clone.
   - (Optional) Add `.nvmrc`; mention Node in README.

3. **Library packaging**
   - Add or adjust `src/index.ts` as the public entry; re-export schemas, CLI, and components you want public.
   - Update `package.json`: remove `private`, set `version`, `description`, `keywords`, `main`, `types`, `exports`, `files`.
   - In README, add a short “Use as a library” section (install from GitHub/npm + one import example).

4. **GitHub Pages: Vite base + workflow**
   - Set `base: '/<repo>/'` in `vite.config.js` (use the repo name from step 1).
   - Add `.github/workflows/pages.yml` that builds with this base and deploys `dist/` to `gh-pages` (e.g. `peaceiris/actions-gh-pages`). This workflow is required.
   - Add “Live demo” / “Try it” link in README: `https://<owner>.github.io/<repo>/`.

5. **Enable Pages and verify**
   - In repo Settings → Pages: choose “Deploy from a branch”; branch `gh-pages`, folder root. Save.
   - Push your changes (workflow and Vite base). The workflow will run and create/update `gh-pages`; the site will appear at the Pages URL.

6. **Publish (optional)**
   - To publish to npm: add npm account, `npm login`, `npm publish`. Optionally automate with a release workflow.
   - To use only from GitHub: document `npm install github:username/tb-solid-pod` (or `user/repo#branch`).

---

## 6. File Summary

| Action | File / path |
|--------|-------------|
| Optional | `.nvmrc` (e.g. `20`) |
| Add/update | `package.json`: version, description, main, types, exports, files, keywords; remove private when needed |
| Add (optional) | `src/index.ts` – re-export public API for library |
| Add/update | `vite.config.js` – `base: '/<repo>/'` for GitHub Pages (or env-driven) |
| Add (optional) | `.github/workflows/ci.yml` – lint + build |
| Add (required) | `.github/workflows/pages.yml` – build with base path + deploy `dist/` to `gh-pages` |
| Update | `README.md` – Node version, “Use as a library”, “Live demo” link |
| Ensure | `LICENSE` (AGPL-3.0-or-later) |

---

## 7. Success Criteria

- **Runnable**: New clone → `npm install` → `npm run dev` → demo app runs.
- **Library**: Another project can `npm install github:user/tb-solid-pod` (or npm package) and `import { createPersona, ... } from 'tb-solid-pod'` (or documented subpaths).
- **GitHub Pages**: Built app is available at `https://<user>.github.io/<repo>/`; README has a “Live demo” / “Try it” link.
- **GitHub**: Repo created; clear description, topics, and README; GitHub Actions deploy to GitHub Pages on push to main; “Live demo” link works.
