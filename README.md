# TinyBase Solid Pod

A browser-based personal data pod inspired by the [Solid Project](https://solidproject.org/), built with [TinyBase](https://tinybase.org/) for reactive state management and LocalStorage persistence.

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
- Membership management with contact linking
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
- **Graphical UI**: Tab-based navigation with forms and lists
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

**Not a good fit:**
- Multi-user collaboration requiring real-time sync
- Applications needing server-side data access
- Large file storage (images, videos, documents)
- Production Solid pod replacement
- Applications requiring authentication/authorization

## Tech Stack

- **React** - UI framework
- **TinyBase** - Reactive state management + persistence
- **Zod** - Schema validation
- **Vite** - Build tooling
- **TypeScript** - Type safety

## Integration Guide

### Option 1: Use as Reference / Copy Components

This project is currently structured as a standalone app. To integrate into your project:

#### 1. Install Dependencies

```bash
npm install tinybase zod @inrupt/vocab-common-rdf @inrupt/vocab-solid-common
```

#### 2. Copy the Core Files

```
src/
├── schemas/           # Copy entire folder - Zod schemas + factory functions
│   ├── base.ts        # JSON-LD base types and context
│   ├── persona.ts     # Identity/profile schema
│   ├── contact.ts     # Contact/agent schema
│   ├── group.ts       # Organization/team schema
│   ├── typeIndex.ts   # Type index and type registration schema
│   ├── preferences.ts # Solid preferences document schema
│   └── file.ts        # File metadata schema
├── utils/
│   ├── settings.ts    # Settings utilities (optional)
│   ├── typeIndex.ts   # Type index helpers (register, lookup, defaults)
│   └── storeExport.ts # Import/export helpers
└── components/        # Copy what you need
    ├── PersonaList.tsx / PersonaForm.tsx
    ├── ContactList.tsx / ContactForm.tsx
    ├── GroupList.tsx / GroupForm.tsx / MembershipManager.tsx
    └── FileMetadataPanel.tsx
```

#### 3. Set Up TinyBase Store

```typescript
import { createStore, createIndexes } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';

// Create store and indexes
const store = createStore();
const indexes = createIndexes(store);

// Set up persistence
const persister = createLocalPersister(store, 'my-app-pod');
await persister.load();
await persister.startAutoSave();

// Define index for file browser (if using files)
indexes.setIndexDefinition('byParent', 'resources', 'parentId');
```

#### 4. Wrap Your App with TinyBase Provider

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

#### 5. Use Components

```tsx
import PersonaList from './components/PersonaList';
import PersonaForm from './components/PersonaForm';

function ProfilePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();

  return (
    <>
      <PersonaList
        store={store}
        onSelect={(id) => console.log('Selected:', id)}
        onEdit={(id) => { setEditingId(id); setFormOpen(true); }}
        onDelete={(id) => store.delRow('personas', id)}
        onCreate={() => { setEditingId(undefined); setFormOpen(true); }}
        onSetDefault={(id) => store.setValue('defaultPersonaId', id)}
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

#### 6. Use Schema Factory Functions Directly

```typescript
import { createPersona } from './schemas/persona';
import { createContact } from './schemas/contact';
import { createGroup } from './schemas/group';

// Create a new persona
const persona = createPersona({
  name: 'Alice Smith',
  email: 'alice@example.com',
  bio: 'Software developer'
}, 'https://myapp.com/users/');

// Store it
store.setRow('personas', persona['@id'], persona);

// Create a contact
const contact = createContact({
  name: 'Bob Jones',
  email: 'bob@example.com',
  isAgent: false
}, 'https://myapp.com/contacts/');

store.setRow('contacts', contact['@id'], contact);

// Create a group with members
const group = createGroup({
  name: 'Engineering Team',
  type: 'team',
  description: 'Core engineering'
}, 'https://myapp.com/groups/');

store.setRow('groups', group['@id'], group);
```

### Option 2: Use Just the Schemas

If you only need the data structures without the UI:

```typescript
import { PersonaSchema, createPersona } from './schemas/persona';
import { ContactSchema, createContact } from './schemas/contact';
import { GroupSchema, createGroup } from './schemas/group';

// Validate external data
const result = PersonaSchema.safeParse(untrustedData);
if (result.success) {
  // Data is valid
  const persona = result.data;
}

// Create new records with proper JSON-LD structure
const newPersona = createPersona({ name: 'Test' }, baseUrl);
// Returns: { '@context': {...}, '@id': 'https://...#me', '@type': 'foaf:Person', ... }
```

### Data Tables Structure

The library uses these TinyBase tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `personas` | User identities | `@id`, `foaf:name`, `foaf:mbox`, `foaf:bio` |
| `contacts` | Address book | `@id`, `vcard:fn`, `vcard:hasEmail`, `@type` |
| `groups` | Organizations/teams | `@id`, `vcard:fn`, `vcard:hasMember`, `@type` |
| `typeIndexes` | Type index registrations | `forClass`, `instance`/`instanceContainer`, `indexType` (public/private) |
| `resources` | Files and folders | URL as key, `type`, `body`, `contentType`, `parentId` |

Settings are stored in TinyBase **values** (not tables):
- `defaultPersonaId` - Default persona
- `theme` - Color theme preference
- `cliHistorySize` - CLI history length

### Adding the CLI (Optional)

If you want the terminal interface:

```tsx
import { CliTerminal } from './cli';

<CliTerminal
  store={store}
  pod={virtualPod}  // VirtualPod instance for file operations
  currentUrl={currentUrl}
  setCurrentUrl={setCurrentUrl}
  baseUrl="https://myapp.com/pod/"
/>
```

### Customizing the Base URL

The `baseUrl` parameter controls the IRI namespace for your data:

```typescript
// For a multi-tenant app
const baseUrl = `https://myapp.com/users/${userId}/`;

// All created resources will have IRIs like:
// https://myapp.com/users/123/personas/abc-def#me
// https://myapp.com/users/123/contacts/xyz-789
```

### Extending with New Data Types

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

2. Add CLI commands in `cli/commands/project.tsx` (follow existing patterns)

3. Create UI components as needed

## Getting Started (Demo App)

```bash
npm install
npm run dev
```

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
```

## License

MIT
