# TinyBase Solid Pod

A browser-based personal data pod inspired by the [Solid Project](https://solidproject.org/), built with [TinyBase](https://tinybase.org/) for reactive state management and LocalStorage persistence.

**[Live demo](https://devalbo.github.io/tb-solid-pod/)** · Run locally: `npm install` then `npm run dev` · [Use as a library](#use-as-a-library)

## What This Project Does

This library provides a complete foundation for **user-owned social data** in web applications. It implements core Solid/Linked Data concepts in a lightweight, browser-first package:

### Identity & Profiles (Personas)
- Create and manage multiple identity profiles (WebID-style documents)
- FOAF/vCard vocabulary for interoperable profile data
- Set a default persona for authoring content
- Profile fields: name, nickname, email, phone, bio, homepage, avatar
- **WebID profile (Phase 7)**: optional `ldp:inbox`, `pim:preferencesFile`, `solid:publicTypeIndex`, `solid:privateTypeIndex`, `solid:oidcIssuer`; persona form has collapsible WebID section; CLI: `persona show --full`, `set-inbox`, `set-typeindex`

### Contact Management
- Address book with support for people and AI agents/bots
- vCard-compatible contact records
- Search across name, email, organization, notes
- Link contacts to your personas (relationship modeling)
- Agent type with category classification (for AI assistants, services, bots)

### Groups & Organizations
- Three group types: Organizations, Teams, and informal Groups
- W3C Organization Ontology (org:) vocabulary
- Membership management: add contacts and your own personas to groups
- Group metadata: name, description, URL, logo

### File Storage with Metadata
- Virtual file system with folders and files
- Rich metadata: title, description, author attribution
- Image-specific properties (dimensions, location)
- MIME type support with content-type detection

### Settings & Preferences
- Type-safe configuration system
- Theme, history size, auto-save, hidden files toggle
- Stored in TinyBase values with validation

### Type Indexes (Phase 6)
- Solid-style public and private type indexes for data discovery
- Map RDF types (e.g. `vcard:Individual`, `foaf:Person`) to container or instance URLs
- Default registrations for personas, contacts, and groups on first load
- CLI: `typeindex list`, `show`, `register`, `unregister`
- Persona schema includes optional `solid:publicTypeIndex` and `solid:privateTypeIndex` links

### Dual Interface
- **Graphical UI**: Tab-based navigation with forms and lists. Personas, Contacts, and Groups tabs each have a **Create random** button that opens the form with sample data for quick try-out.
- **CLI Terminal**: Full command-line interface for power users

## Benefits for Social Applications

### 1. User Data Ownership
Users control their data in their browser's LocalStorage. No server-side database required for basic functionality. Data can be exported as JSON-LD for portability.

### 2. Interoperable Schemas
Built on established vocabularies (FOAF, vCard, Dublin Core, Schema.org, W3C Org), making data portable to other Solid-compatible systems or any RDF-aware application.

### 3. Relationship Modeling
The contact + group + persona architecture supports:
- Friend/follower relationships
- Team collaboration structures
- Organization hierarchies
- Agent/bot permissions (who can act on your behalf)

### 4. Offline-First
TinyBase with LocalStorage means the app works entirely offline. No network requests required for core functionality.

### 5. Reactive UI
TinyBase's reactive hooks (`useRow`, `useTable`, `useSliceRowIds`) keep UI in sync with data automatically. Changes in CLI reflect immediately in the graphical UI and vice versa.

### 6. Extensible Foundation
The schema system (Zod + JSON-LD) provides a pattern for adding new data types. The CLI command registry makes adding new commands straightforward.

## Limitations & Where It Falls Short

For a focused list of shortcomings for **document sharing and collaboration** (no WAC, no “shared with me,” no p2p transport, etc.), see [docs/SHORTCOMINGS.md](docs/SHORTCOMINGS.md).

### No True Solid Protocol Support
This is a **simulation** of Solid concepts, not a real Solid server. It does not implement:
- LDP (Linked Data Platform) HTTP protocol
- WebID-TLS or DPoP authentication
- WAC (Web Access Control) enforcement
- SPARQL queries
- Remote pod federation

### Single-User, Single-Device
- Data lives in one browser's LocalStorage
- No built-in sync between devices or browsers
- No multi-user collaboration (yet)

### No Real Access Control
The ACL phase is planned but not implemented. Currently:
- No permission enforcement
- No sharing with specific contacts
- No public/private resource distinction

### Storage Limits
- LocalStorage typically limited to 5-10MB
- Base64 image storage is inefficient
- No chunking or streaming for large files

### No Server-Side Component
- Can't receive webhooks or notifications
- No background sync when browser is closed
- No server-side rendering or API

### Missing Solid Features (Planned)
- Web Access Control / ACL (Phase 8)

### Missing Solid Features (Not Planned)
- No inbox/outbox for notifications
- No WebSockets for real-time updates
- No Solid OIDC authentication
- No LDP HTTP protocol

## When to Use This

**Good fit:**
- Prototyping social features before building a backend
- Learning Solid/Linked Data concepts
- Single-user apps that need structured personal data
- Offline-first PWAs with social data needs
- Adding contact/group management to existing apps
- Apps where users share document-oriented data (Solid-style or ad hoc p2p): see [docs/DOCUMENT_SHARING_SCENARIOS.md](docs/DOCUMENT_SHARING_SCENARIOS.md) for scenarios and [docs/SHORTCOMINGS.md](docs/SHORTCOMINGS.md) for what the library does not provide

**Not a good fit:**
- Multi-user collaboration requiring real-time sync
- Applications needing server-side data access
- Large file storage (images, videos, documents)
- Production Solid pod replacement
- Applications requiring authentication/authorization

## Consider Adding This to Your Project If You Want…

- **Minimal setup** — One install (`npm install github:devalbo/tb-solid-pod`), no backend or database to run. LocalStorage works out of the box; no config required.
- **No design work** — Personas, contacts, groups, type indexes, and file metadata are already modeled with Zod + JSON-LD. Use the schemas and factory functions instead of defining your own.
- **Use only what you need** — Import schemas only, add the CLI, or drop in React components. No need to adopt the full app.
- **No new infrastructure** — No API to host, no auth to configure. Everything runs in the browser with your existing React + TinyBase (or add TinyBase in one step).
- **Types and JSON Schema included** — TypeScript types and Zod validation come with the package; Zod v4’s built-in `z.toJSONSchema()` is used to export JSON Schema (draft-2020-12) for all schemas. Use in OpenAPI, AJV, or any JSON Schema consumer—no manual typing or schema authoring.
- **Reference or dependency** — Copy-paste from the repo or install as a dependency; both paths are documented with little effort for you.

## Integrating into your app

You can use this in an app you’re building in two ways:

1. **Install as a dependency** — `npm install github:devalbo/tb-solid-pod`, then import schemas, components, or the CLI. Your app needs a TinyBase store (and indexes if you use the file browser or CLI); wrap your app in TinyBase’s `Provider`. See [Use as a library](#use-as-a-library) and the [Integration Guide](docs/INTEGRATION_GUIDE.md) for store setup and usage.
2. **Copy what you need** — Copy `src/schemas`, and optionally `src/storeLayout.ts`, `src/components`, `src/cli`, and `src/utils`, into your repo. Install the same dependencies (TinyBase, Zod, vocab packages). Good if you want to customize or avoid a package dependency. See the [Integration Guide](docs/INTEGRATION_GUIDE.md) for the file list and store setup.

Both paths are covered step-by-step in the [Integration Guide](docs/INTEGRATION_GUIDE.md) (TinyBase store, Provider, table layout, optional CLI). For answers to “how do I access/manage users, groups, and documents?”, see [docs/USE_CASES.md](docs/USE_CASES.md). If you only need the data shapes, use the schemas and factory functions; add React components and/or the CLI when you need the UI.

## Tech Stack

- **React** - UI framework
- **TinyBase** - Reactive state management + persistence
- **Zod** - Schema validation
- **Vite** - Build tooling
- **TypeScript** - Type safety

## Use as a library

Install from GitHub (replace `devalbo/tb-solid-pod` with your fork if needed):

```bash
npm install github:devalbo/tb-solid-pod
```

Then import schemas, CLI, or components:

```ts
import { createPersona, createContact, PersonaSchema } from 'tb-solid-pod';
import { CliTerminal } from 'tb-solid-pod';
import { PersonaList, PersonaForm } from 'tb-solid-pod';
```

**JSON Schema:** We generate JSON Schema from our Zod types (no canonical Solid JSON Schema; the ecosystem uses SHACL/ShEx). See the **[Schemas tab on the live demo](https://devalbo.github.io/tb-solid-pod/#schemas)** for the schema list, links to each JSON file, Solid doc links, and example code. To emit static `.json` files (e.g. for tooling that reads files), run `npm run generate:schemas`; output is written to `schema/` and `public/schema/`.

For full integration (TinyBase store setup, components, CLI), see the **[Integration Guide](docs/INTEGRATION_GUIDE.md)**.

## Getting Started (Demo App)

**[Try the live demo](https://devalbo.github.io/tb-solid-pod/)** or run locally. Requires Node 18+ (or use `nvm use` if you use nvm).

**Live demo 404?** GitHub Pages does not work with private repos on a free account. Make the repo public (Settings → General → Danger zone → Change visibility) or use GitHub Pro. Then set **Settings → Pages** → Deploy from branch **gh-pages**, folder **/ (root)**. The workflow deploys on every push to `main`.

```bash
npm install
npm run dev
```

## Running the CLI in the terminal

You can run the same CLI from a **real terminal** (Node.js) as well as in the browser’s Terminal tab:

```bash
npm run cli
```

- **Interactive**: Full session with the same commands as the browser. Use **↑/↓** for command history and **Tab** for command-name completion.
- **Single command**: Pass the command as arguments; output is printed and the process exits. Example: `npm run cli -- help` or `npm run cli -- contact list`.
- **Data**: Stored in `~/.tb-solid-pod/data/store.json` (or set `TB_SOLID_POD_DATA_PATH` to a different path). Same store shape as the browser; data is not shared between browser and terminal unless you point both at the same file.


## CLI Commands

```
help                          Show available commands
persona list|create|show [--full]|edit|delete|set-default|set-inbox|set-typeindex
contact list|add|show|edit|delete|search|link
group list|create|show|edit|delete|add-member|remove-member|list-members
typeindex list|show|register|unregister   Type index (public/private)
file info|set-author|set-title|set-description
config list|get|set|reset
pwd|cd|ls|cat|touch|mkdir|rm  File system operations
export|import                 Data portability
clear                         Clear terminal
exit                          Exit the CLI (Node terminal only)
```

## Testing

- **Unit tests (Vitest):** `npm test` or `npm run test:run`; coverage: `npm run test:coverage`
- **Storybook:** `npm run storybook` → http://localhost:6006 (component development). See [docs/testing/](docs/testing/README.md).
- **BDD / E2E (Playwright):** Generate specs from Gherkin, then run Playwright:
  ```bash
  npx bddgen && npx playwright test
  ```
  Or use the scripts: `npm run test:e2e` or `npm run test:bdd` (same thing). With browser visible: `npm run test:e2e:headed`.

  **Start the server first (required):** The BDD/E2E command does not start the dev server. In one terminal start the app; in another run the tests.
  1. **Terminal 1:** `npm run dev` — leave it running (app at http://localhost:5173).
  2. **Terminal 2:** `npx bddgen && npx playwright test` (or `npm run test:e2e`).

  If you use a different port for the app, set `E2E_BASE_URL` so Playwright hits the right URL (e.g. `E2E_BASE_URL=http://localhost:3000 npx playwright test` after starting the app on 3000).

### Try the BDD steps manually

You can run through the BDD scenarios by hand to verify behavior without Playwright:

1. **App shell**
   - Open the app (`npm run dev`, then http://localhost:5173).
   - Check the browser tab title contains `tb-solid-pod`.
   - Click the **Terminal** tab and confirm you see the CLI welcome message or prompt.

2. **CLI contacts**
   - Go to the **Terminal** tab.
   - Run: `contact add JohnDoe --email=john@example.com` → you should see **Added contact: JohnDoe**.
   - Run: `contact add JaneSmith` then `contact list` → you should see **JaneSmith** in the list.
   - Run: `contact` → you should see **Usage: contact**, **Subcommands**, **add**, and **list** in the help.

3. **CLI personas**
   - In the Terminal, run: `persona create TestUser --email=test@example.com` → you should see **Created persona: TestUser**.
   - Run: `persona list` → you should see **Persona** (or personas list / empty message).
   - Run: `persona` → you should see **Usage: persona**, **Subcommands**, and **create** in the help.

4. **CLI navigation**
   - Run: `help` → you should see **help**, **contact**, **persona** in the output.
   - Run: `contact list` then `clear` → terminal output should clear.

5. **UI tabs**
   - Click **Contacts** → you should see the contacts view (list or empty state).
   - Click **Personas** → you should see the personas view.
   - Confirm **Personas**, **Contacts**, and **Terminal** tabs are visible.

Feature files live under `tests/features/` (e.g. `cli-contacts.feature`, `app.feature`). Step definitions are in `tests/features/steps/`. After changing `.feature` or steps, run `npx bddgen` before `npx playwright test`.

For more detail (where results are stored, unit/BDD/Storybook guidelines), see **[docs/testing/](docs/testing/README.md)**. For coding standards (strict TypeScript, short functions, simple components), see **[docs/CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md)**.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
