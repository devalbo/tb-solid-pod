# Use cases for app authors

This document answers questions about how an application that uses **tb-solid-pod** as a library can access and manage data about **users** (personas), **groups**, and **documents** (files and metadata). It is written for app authors who are integrating the library into their own React/TinyBase app or using the schemas and utilities directly.

**Terms used here:** A **pod** is the user’s personal data store (in this library, a TinyBase store backed by LocalStorage). **Personas** are identity profiles (WebID-style); **contacts** are people or agents in the user’s address book; **groups** are organizations, teams, or informal groups with membership; **documents** and **files** refer to the virtual file system and its metadata (title, description, author, MIME type, etc.).

---

## How you can use the library

You can use tb-solid-pod in three ways; the use cases below apply across them.

| Approach | What you get | When to use it |
|----------|--------------|----------------|
| **Schemas only** | Zod schemas, factory functions, types, JSON Schema | You need the data shapes and validation; no UI or store layout required. |
| **Schemas + store** | Same as above, plus a TinyBase store with the expected tables and values | You want to read/write personas, contacts, groups, files, and settings in a standard layout. |
| **Schemas + store + components (and optionally CLI)** | Full UI: lists, forms, membership manager, file metadata panel, terminal | You want ready-made React components and/or the CLI for power users. |

Store setup and table layout are described in the [README Integration Guide](../README.md#integration-guide) and summarized in [Data tables](#data-tables) below.

---

## Users (personas)

Personas are identity profiles: the “users” from the app author’s perspective are the personas the pod owner has created (e.g. “work”, “personal”, “anonymous”). One of them can be set as the default for authoring.

### How do I get the current or default user?

- **Default persona:** Stored as a TinyBase **value**, not a row. Key: `defaultPersonaId`. Read with `store.getValue('defaultPersonaId')`. Set with `store.setValue('defaultPersonaId', personaId)`.
- **Persona row:** Use the ID to read the full persona: `store.getRow('personas', defaultPersonaId)`. The row is a JSON-LD object with `@id`, `@type`, `foaf:name`, `foaf:mbox`, `foaf:bio`, and optional WebID-style fields (`solid:publicTypeIndex`, `solid:privateTypeIndex`, `ldp:inbox`, etc.).

### How do I list all users (personas)?

- **Store:** Use TinyBase’s `getRowIds('personas')` to get IDs, then `getRow('personas', id)` for each row, or use a slice/index if you define one.
- **React (with TinyBase UI):** Use `useRowIds('personas')` and `useRow('personas', id)` from `tinybase/ui-react` for reactive lists.
- **Components:** Use the library’s `PersonaList` and `PersonaForm`; pass `store`, `baseUrl`, and callbacks (`onSelect`, `onEdit`, `onDelete`, `onCreate`, `onSetDefault`). See [README Integration Guide – Use Components](../README.md#integration-guide).

### How do I create or update a user (persona)?

- **Programmatic:** Use the factory from the library: `createPersona({ name, email, bio, ... }, baseUrl)`. It returns a JSON-LD object with `@id` and `@type`. Then `store.setRow('personas', persona['@id'], persona)`. To update, get the row, merge changes, validate with `PersonaSchema.safeParse`, then `setRow` again.
- **UI:** Use `PersonaForm` with `store`, `baseUrl`, `personaId` (optional; omit for create), and `onSave` / `onCancel`.

### How do I validate persona data?

- **Zod:** `PersonaSchema.safeParse(data)`. Use `result.success` and `result.data` or `result.error`. The library exports `PersonaSchema` and related types.

---

## Contacts

Contacts are people or agents (bots, services) in the user’s address book. They can be linked to the user’s personas (which persona “knows” this contact) and to groups via membership.

### How do I list contacts?

- **Store:** `getRowIds('contacts')` and `getRow('contacts', id)` for each ID. Rows are JSON-LD with `vcard:fn`, `vcard:hasEmail`, `@type` (e.g. `vcard:Individual`), and optional agent-related fields.
- **React:** `useRowIds('contacts')` and `useRow('contacts', id)`.
- **Components:** `ContactList` and `ContactForm` with `store`, `baseUrl`, and callbacks.

### How do I create or update a contact?

- **Programmatic:** `createContact({ name, email, isAgent, ... }, baseUrl)` then `store.setRow('contacts', contact['@id'], contact)`. Update by get → merge → validate with `ContactSchema` → `setRow`.
- **UI:** `ContactForm` with `store`, `baseUrl`, `contactId` (optional), and `onSave` / `onCancel`.

### How do I associate contacts with the current user (persona)?

- Contacts link to a persona (e.g. which persona “knows” this contact) via **`vcard:hasRelated`** (full IRI: `http://www.w3.org/2006/vcard/ns#hasRelated`); the value is one or more node references, e.g. `{ '@id': personaId }`. In code, use `VCARD.hasRelated` from `@inrupt/vocab-common-rdf` when reading or writing the contact row. When creating/editing contacts, set that link to the current/default persona’s `@id` if your app models “my contacts” per persona.

---

## Groups

Groups are organizations, teams, or informal groups. They have metadata (name, description, URL, logo) and **members**: contacts and/or the user’s own personas.

### How do I list groups?

- **Store:** `getRowIds('groups')` and `getRow('groups', id)`. Each row includes group type (`org:Organization`, `org:FormalOrganization`, etc.), name, description, and membership.
- **React:** `useRowIds('groups')` and `useRow('groups', id)`.
- **Components:** `GroupList` and `GroupForm` with `store`, `baseUrl`, and callbacks.

### How do I create or update a group?

- **Programmatic:** `createGroup({ name, type, description, ... }, baseUrl)` then `store.setRow('groups', group['@id'], group)`. Update by get → merge → validate with `GroupSchema` → `setRow`.
- **UI:** `GroupForm` with `store`, `baseUrl`, `groupId` (optional), and `onSave` / `onCancel`.

### How do I manage group membership (add/remove contacts or personas)?

- **Component:** Use `MembershipManager` with `store`, `groupId`, and optional callbacks. It allows adding contacts and the user’s personas to the group and removing them. Membership is stored in the group row (e.g. member references).
- **Programmatic:** Read the group row, update the membership array/references, validate, then `setRow('groups', groupId, updatedGroup)`.

---

## Documents (files and metadata)

The library provides a virtual file system: **resources** (files and folders) and optional **metadata** (title, description, author, MIME type, image dimensions, etc.). File *content* is stored in the store; metadata is used for display and attribution.

### How do I list files and folders?

- **Store:** Resources live in the `resources` table. Rows are keyed by URL (or path). A typical pattern is to use an index: e.g. `byParent` index on `resources` by `parentId` so you can list children of a folder. Create it with `indexes.setIndexDefinition('byParent', 'resources', 'parentId')`.
- **React:** Use `useSliceRowIds('byParent', parentId)` (or equivalent) to get child IDs for a given folder, then `useRow('resources', id)` for each.
- The demo app and CLI use a virtual “pod” URL and a `VirtualPod`-style API for navigation; your app can use the store and index directly for listing.

### How do I read or write file content?

- **Store:** Each resource row has at least `type` (e.g. `ldp:Resource`, folder vs file), and for files often `body` (content), `contentType` (MIME type), and `parentId`. Read with `getRow('resources', url)`; write with `setRow('resources', url, { type, body, contentType, parentId, ... })`.
- **CLI / VirtualPod:** If you use the library’s CLI, it uses a `VirtualPod` implementation that reads/writes the same `resources` table and index.

### How do I access or edit file metadata (title, description, author)?

- **Component:** Use `FileMetadataPanel` with `store`, resource URL (or id), and callbacks. It displays and edits metadata such as title, description, author, and for images dimensions and location.
- **Programmatic:** Metadata may live on the same resource row (e.g. Dublin Core or schema.org properties). Read the row, update the metadata fields, then `setRow`. Use the file schema from the library for validation if available.

### How do I create a new file or folder?

- **Programmatic:** Create a row in `resources` with a unique URL/path, `type` (folder vs file), `parentId` pointing to the parent folder, and for files `body` and `contentType`. Use the library’s file schema and helpers if exported; otherwise follow the same shape as existing rows.
- The factory for file metadata (if provided) or the demo app’s create-file flow can be used as a reference.

---

## Data tables

The **store layout** (table and index names, and value keys for settings) is the library’s **stable contract**: it will not change in a way that requires you to migrate. Use the exported constants (`STORE_TABLES`, `STORE_INDEXES`, `SETTINGS_KEYS`) when setting up your store and when calling `getRow`/`setRow`/`getValue`/`setValue` so your app stays compatible when the library adds features (e.g. sync to a Solid pod).

The library expects the following TinyBase layout. Use this when you set up the store so that components and utilities behave correctly.

| Table | Purpose | Key fields |
|-------|---------|------------|
| `personas` | User identities (personas) | `@id`, `@type`, `foaf:name`, `foaf:mbox`, `foaf:bio`, optional WebID fields |
| `contacts` | Address book (people + agents) | `@id`, `vcard:fn`, `vcard:hasEmail`, `@type` |
| `groups` | Organizations, teams, groups | `@id`, `vcard:fn`, group type, membership references |
| `typeIndexes` | Type index registrations | `forClass`, `instance` / `instanceContainer`, `indexType` |
| `resources` | Files and folders | URL as row id, `type`, `body`, `contentType`, `parentId`, metadata |

**Values (not tables):** `defaultPersonaId`, `theme`, `cliHistorySize`, and other settings. Use `SETTINGS_KEYS` from the library for value keys; see the settings utilities and the README.

---

## Quick reference: “I want to…”

| Goal | Use |
|------|-----|
| Get the default user (persona) | `store.getValue('defaultPersonaId')` then `store.getRow('personas', id)` |
| List all personas / contacts / groups | `store.getRowIds('personas' \| 'contacts' \| 'groups')` and `getRow` for each, or use list components |
| Create a persona / contact / group | `createPersona` / `createContact` / `createGroup` from the library, then `store.setRow(...)` |
| Validate incoming data | `PersonaSchema.safeParse` / `ContactSchema.safeParse` / `GroupSchema.safeParse` |
| Manage group membership in the UI | `MembershipManager` component with `store` and `groupId` |
| List files in a folder | Index `byParent` on `resources` by `parentId`; use slice or equivalent to get child IDs |
| Show or edit file metadata in the UI | `FileMetadataPanel` with `store` and resource URL |

---

## Related docs

- **[README – Integration Guide](../README.md#integration-guide)** – Store setup, Provider, table layout, and copy-paste vs install.
- **[DOCUMENT_SHARING_SCENARIOS.md](DOCUMENT_SHARING_SCENARIOS.md)** – How the library supports apps where users share document-oriented data (Solid-style or ad hoc p2p).
- **[SHORTCOMINGS.md](SHORTCOMINGS.md)** – What the library does *not* provide for document sharing and collaboration (WAC, “shared with me,” p2p transport, etc.).
- **[DESIGN.md](DESIGN.md)** – Data model, vocabularies, and architecture.
- **[SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)** – How a future Solid server or sync target could fit in; authority and sync patterns.
