# Agent instructions – tb-solid-pod

Context for AI assistants working on this repo.

## What this project is

**tb-solid-pod** is a browser-based personal data pod inspired by the [Solid Project](https://solidproject.org/), built with [TinyBase](https://tinybase.org/) for reactive state and LocalStorage. It is **not** a real Solid server (no LDP, no WebID-TLS); it simulates Solid-style data (personas, contacts, groups, type indexes, file metadata) in a single-page app.

- **Dual interface**: graphical UI (tabs, forms, lists) + CLI terminal.
- **Data**: personas (WebID-style), contacts (including agents), groups (org/team/group), type indexes, virtual file system with metadata, settings/preferences.
- **Stack**: React, TinyBase, Zod, Vite, TypeScript. Vocabularies: FOAF, vCard, Dublin Core, W3C Org, `@inrupt/vocab-*`.

## Repo layout

| Path | Purpose |
|------|--------|
| `src/main.tsx` | App entry (demo only). |
| `src/App.tsx` | Root UI: tabs + CLI. |
| `src/index.ts` | **Library entry** – re-exports schemas, utils, CLI, components for `import from 'tb-solid-pod'`. |
| `src/schemas/` | Zod schemas + factory functions (persona, contact, group, file, typeIndex, preferences, base). |
| `src/utils/` | settings, storeExport, typeIndex helpers, validation. |
| `src/cli/` | CliTerminal, command registry, parse-args, types. |
| `src/components/` | PersonaList/Form, ContactList/Form, GroupList/Form, MembershipManager, FileMetadataPanel. |
| `docs/` | DESIGN.md, IMPLEMENTATION_PLAN.md, **GITHUB_AND_LIBRARY_PLAN.md** (authoritative for “three uses” plan). |

## What’s done so far

1. **GitHub-ready**  
   Repo on GitHub (`devalbo/tb-solid-pod`), `main` pushed, LICENSE (AGPL-3.0-or-later). Repo is **private** for now.

2. **Runnable on checkout**  
   `npm install` and `npm run dev` work. README “Getting Started (Demo App)” is accurate. `.nvmrc` (Node 20) and README Node note (“Requires Node 18+” / `nvm use`) added.

3. **Usable as a library (GitHub-only, no npm publish)**  
   - **package.json**: `version` 0.1.0, `description`, `keywords`, `main`/`types`/`exports` → `./src/index.ts`, `files`: `["src", "README.md"]`, `private: true` kept.  
   - **src/index.ts**: Re-exports schemas, utils, CLI, and components.  
   - **README**: “Use as a library” section with `npm install github:devalbo/tb-solid-pod` and example imports.

4. **GitHub Pages (code)**  
   Vite `base` is env-driven (`BASE_PATH` in CI). `.github/workflows/pages.yml` runs on every push to `main`, builds with `BASE_PATH=/tb-solid-pod/`, and deploys `dist/` to the `gh-pages` branch. README has Live demo link and a "Live demo 404?" note (private repo = no Pages on free plan).

## What’s not done

- **GitHub Pages (manual)**: In repo **Settings → Pages**, set "Deploy from a branch", branch `gh-pages`, folder root. (Code is done: Vite `base` env-driven, `.github/workflows/pages.yml` deploys `dist/` to `gh-pages`; README has Live demo link.) The live site returns **404 if the repo is private** on a free account—make the repo public or use GitHub Pro.  
- **Optional**: Repo description/topics on GitHub; README “Library usage” expansion; npm publish later.

## Plan and checklists

- **docs/GITHUB_AND_LIBRARY_PLAN.md** is the source of truth for the “three uses” plan (runnable, library, GitHub Pages).  
- Progress is tracked by **checklists** at the end of sections 1–4 (1.4, 2.6, 3.6, 4.5) and by the **Current state** table.  
- When you complete a task, mark it `[x]` in the relevant checklist and refresh the Current state table so the plan stays accurate.

## Conventions

- **Library**: Consumers install from GitHub (`npm install github:user/tb-solid-pod`). We do not publish to npm for now; `private: true` is intentional.  
- **Schemas**: Zod + JSON-LD; factory functions (e.g. `createPersona`, `createContact`) take a base URL for IRIs.  
- **CLI**: Commands live in `src/cli/commands/`; registry in `src/cli/registry.tsx`.  
- **Components**: React components expect a TinyBase `store` (and often `indexes`); they are default-exported and re-exported as named from `src/index.ts`.

## Useful docs

- **README.md** – Overview, limitations, Use as a library, Integration Guide (copy-paste vs install-from-GitHub), Getting Started (Node note, Live demo + 404 troubleshooting), CLI command list.  
- **docs/GITHUB_AND_LIBRARY_PLAN.md** – Goals, current state, section checklists, File Summary, Success Criteria.  
- **docs/IMPLEMENTATION_PLAN.md** – Feature/phases.  
- **DESIGN.md** – Design notes.
