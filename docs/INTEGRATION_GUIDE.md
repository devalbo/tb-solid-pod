# Integration Guide

This guide explains how to integrate **tb-solid-pod** into an application you are building. It is for developers who want to add Solid-style personas, contacts, groups, type indexes, or file metadata to their app, either by installing the package from GitHub or by copying source files.

**Terms:** **TinyBase** is the reactive store and persistence library used by this project. **JSON-LD** (JavaScript Object Notation for Linked Data) is the data format used for personas, contacts, and groups. **CLI** (command-line interface) refers to the terminal provided by the library: in-app (browser Terminal tab) or Node (`npm run cli`).

## Two ways to integrate

1. **Install as a dependency** — `npm install github:devalbo/tb-solid-pod`, then import schemas, components, or the CLI. Your app needs a TinyBase store (and indexes if you use the file browser or CLI); wrap your app in TinyBase’s `Provider`. See [Use as a library](#use-as-a-library) and the sections below for store setup and usage.
2. **Copy what you need** — Copy `src/schemas`, and optionally `src/storeLayout.ts`, `src/utils`, `src/components`, and `src/cli`, into your repo. Install the same dependencies (TinyBase, Zod, vocab packages). Use this when you want to customize or avoid a package dependency. See [Option 1: Copy components](#option-1-use-as-reference--copy-components) for the file list and store setup.

For answers to “how do I access or manage users, groups, and documents?”, see [USE_CASES.md](USE_CASES.md).

---

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

**JSON Schema:** The project generates JSON Schema from Zod types (no canonical Solid JSON Schema; the ecosystem uses SHACL/ShEx). See the [Schemas tab on the live demo](https://devalbo.github.io/tb-solid-pod/#schemas) for the schema list, links to each JSON file, and example code. To emit static `.json` files, run `npm run generate:schemas`; output is in `schema/` and `public/schema/`.

The sections below describe store setup, Provider, components, and CLI for both the install and copy paths.

---

## Option 1: Use as Reference / Copy Components

This project is structured as a standalone app. To integrate by copying into your project:

### 1. Install Dependencies

```bash
npm install tinybase zod @inrupt/vocab-common-rdf @inrupt/vocab-solid-common
```

### 2. Copy the Core Files

```
src/
├── storeLayout.ts     # Table and index names (STORE_TABLES, STORE_INDEXES) – required for store setup
├── schemas/           # Copy entire folder – Zod schemas + factory functions
│   ├── base.ts        # JSON-LD base types and context
│   ├── persona.ts     # Identity/profile schema
│   ├── contact.ts     # Contact/agent schema
│   ├── group.ts       # Organization/team schema
│   ├── typeIndex.ts   # Type index and type registration schema
│   ├── preferences.ts # Solid preferences document schema
│   └── file.ts        # File metadata schema
├── utils/
│   ├── settings.ts    # Settings utilities and SETTINGS_KEYS (needed for components)
│   ├── typeIndex.ts   # Type index helpers (register, lookup, defaults)
│   └── storeExport.ts # Import/export helpers
└── components/        # Copy what you need
    ├── PersonaList.tsx / PersonaForm.tsx
    ├── ContactList.tsx / ContactForm.tsx
    ├── GroupList.tsx / GroupForm.tsx / MembershipManager.tsx
    └── FileMetadataPanel.tsx
```

If you **installed** from GitHub, use `import { STORE_TABLES, STORE_INDEXES, SETTINGS_KEYS } from 'tb-solid-pod'` (and optionally `storeLayout`). If you **copied** files, use `import { STORE_TABLES, STORE_INDEXES } from './storeLayout'` and `import { SETTINGS_KEYS } from './utils/settings'` (or your equivalent paths).

### 3. Set Up TinyBase Store

The **store layout** (table and index names) is the library’s **stable contract**: it will not change in a way that requires you to migrate. Use the exported constants so your app stays compatible when the library adds features (e.g. sync to a Solid pod).

**If you installed from GitHub:**

```typescript
import { createStore, createIndexes } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { STORE_TABLES, STORE_INDEXES } from 'tb-solid-pod';

const store = createStore();
const indexes = createIndexes(store);

const persister = createLocalPersister(store, 'my-app-pod');
await persister.load();
await persister.startAutoSave();

indexes.setIndexDefinition(STORE_INDEXES.BY_PARENT, STORE_TABLES.RESOURCES, 'parentId');
```

**If you copied files:** Use the same code but import from your copy of `storeLayout`:  
`import { STORE_TABLES, STORE_INDEXES } from './storeLayout';`

### 4. Wrap Your App with TinyBase Provider

```tsx
import { Provider } from 'tinybase/ui-react';

function App() {
  return (
    <Provider store={store} indexes={indexes}>
      <YourApp />
    </Provider>
  );
}
```

### 5. Use Components

```tsx
import PersonaList from './components/PersonaList';
import PersonaForm from './components/PersonaForm';
import { STORE_TABLES, SETTINGS_KEYS } from 'tb-solid-pod';  // or from your storeLayout + utils/settings

function ProfilePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();

  return (
    <>
      <PersonaList
        store={store}
        onSelect={(id) => console.log('Selected:', id)}
        onEdit={(id) => { setEditingId(id); setFormOpen(true); }}
        onDelete={(id) => store.delRow(STORE_TABLES.PERSONAS, id)}
        onCreate={() => { setEditingId(undefined); setFormOpen(true); }}
        onSetDefault={(id) => store.setValue(SETTINGS_KEYS.DEFAULT_PERSONA_ID, id)}
      />
      {formOpen && (
        <PersonaForm
          store={store}
          baseUrl="https://myapp.com/users/"
          personaId={editingId}
          onSave={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </>
  );
}
```

### 6. Use Schema Factory Functions Directly

```typescript
import { createPersona } from './schemas/persona';   // or 'tb-solid-pod'
import { createContact } from './schemas/contact';
import { createGroup } from './schemas/group';
import { STORE_TABLES } from 'tb-solid-pod';         // or your storeLayout

const persona = createPersona({
  name: 'Alice Smith',
  email: 'alice@example.com',
  bio: 'Software developer'
}, 'https://myapp.com/users/');

store.setRow(STORE_TABLES.PERSONAS, persona['@id'], persona);

const contact = createContact({
  name: 'Bob Jones',
  email: 'bob@example.com',
  isAgent: false
}, 'https://myapp.com/contacts/');

store.setRow(STORE_TABLES.CONTACTS, contact['@id'], contact);

const group = createGroup({
  name: 'Engineering Team',
  type: 'team',
  description: 'Core engineering'
}, 'https://myapp.com/groups/');

store.setRow(STORE_TABLES.GROUPS, group['@id'], group);
```

---

## Option 2: Use Just the Schemas

If you only need the data structures without the UI:

```typescript
import { PersonaSchema, createPersona } from './schemas/persona';  // or 'tb-solid-pod'
import { ContactSchema, createContact } from './schemas/contact';
import { GroupSchema, createGroup } from './schemas/group';

// Validate external data
const result = PersonaSchema.safeParse(untrustedData);
if (result.success) {
  const persona = result.data;
}

// Create new records with proper JSON-LD structure
const newPersona = createPersona({ name: 'Test' }, baseUrl);
// Returns: { '@context': {...}, '@id': 'https://...#me', '@type': 'foaf:Person', ... }
```

---

## Data Tables Structure

The library uses these TinyBase tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `personas` | User identities | `@id`, `foaf:name`, `foaf:mbox`, `foaf:bio` |
| `contacts` | Address book | `@id`, `vcard:fn`, `vcard:hasEmail`, `@type` |
| `groups` | Organizations/teams | `@id`, `vcard:fn`, `vcard:hasMember`, `@type` |
| `typeIndexes` | Type index registrations | `forClass`, `instance`/`instanceContainer`, `indexType` (public/private) |
| `resources` | Files and folders | URL as key, `type`, `body`, `contentType`, `parentId` |

Settings are stored in TinyBase **values** (not tables):

- `defaultPersonaId` — Default persona
- `theme` — Color theme preference
- `cliHistorySize` — CLI history length

---

## Adding the CLI (Optional)

The CLI runs in **two environments**: (1) in-app Terminal tab in the browser, and (2) from a real terminal (Node.js).

### In the browser

```tsx
import { CliTerminal } from 'tb-solid-pod';  // or from your cli

<CliTerminal
  store={store}
  pod={virtualPod}  // VirtualPod instance for file operations
  currentUrl={currentUrl}
  setCurrentUrl={setCurrentUrl}
  baseUrl="https://myapp.com/pod/"
/>
```

### In the terminal (Node.js)

From the repo: `npm run cli`. Same commands as the browser. Data is stored in `~/.tb-solid-pod/data/store.json` (override with `TB_SOLID_POD_DATA_PATH`). Interactive mode supports **↑/↓** history and **Tab** completion for command names. Use **`exit`** to quit. **Export:** `export` prints JSON to the terminal; `export --download` writes a file to the current directory (Node has no clipboard). Single-command mode: `npm run cli -- help` or `npm run cli -- contact list`.

---

## Customizing the Base URL

The `baseUrl` parameter controls the IRI namespace for your data:

```typescript
// For a multi-tenant app
const baseUrl = `https://myapp.com/users/${userId}/`;

// All created resources will have IRIs like:
// https://myapp.com/users/123/personas/abc-def#me
// https://myapp.com/users/123/contacts/xyz-789
```

---

## Extending with New Data Types

1. Create a new schema in `schemas/`:

```typescript
// schemas/project.ts
import { z } from 'zod';
import { JsonLdBase, NodeRef, nowISO, POD_CONTEXT } from './base';

export const ProjectSchema = JsonLdBase.extend({
  '@type': z.literal('https://schema.org/Project'),
  'https://schema.org/name': z.string(),
  'https://schema.org/member': z.array(NodeRef).optional(),
});

export function createProject(input: { name: string }, baseUrl: string) {
  const id = `${baseUrl}projects/${crypto.randomUUID()}`;
  return {
    '@context': POD_CONTEXT,
    '@id': id,
    '@type': 'https://schema.org/Project',
    'https://schema.org/name': input.name,
    'https://schema.org/dateCreated': nowISO(),
  };
}
```

2. Add CLI commands in `cli/commands/project.tsx` (follow existing patterns).

3. Create UI components as needed.
