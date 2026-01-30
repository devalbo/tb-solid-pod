# Solid Pod Implementation Plan

## Current State

The app has a working browser-based CLI and file browser UI with:
- Basic file/folder CRUD operations
- TinyBase persistence with LocalStorage
- Import/export functionality
- Tab-based navigation (Data Browser / Personas / Contacts / Groups / Terminal)
- Persona management (Phase 1 ✅)
- Contact management with search/filter (Phase 2 ✅)
- Group management with membership (Phase 3 ✅)
- Rich file metadata with UI editor (Phase 4 ✅)
- Settings and preferences via CLI (Phase 5 ✅)

**All core schemas integrated! Settings system complete!**

## Phase 1: Persona Management ✅ COMPLETE

### Goal
Allow users to create and manage identity profiles (WebID documents).

### CLI Commands
```
persona list                    # List all personas
persona create <name>           # Interactive persona creation
persona show <id>               # Display persona details
persona edit <id>               # Edit persona
persona delete <id>             # Delete persona
persona set-default <id>        # Set default persona
```

### Data Storage
- Store in `personas` table (separate from `resources`)
- Use `PersonaSchema` for validation
- Generate WebID-style IRIs

### UI Components
- Persona list view in Data Browser
- Persona detail/edit form
- Default persona indicator

### Files Created/Modified
- `src/cli/commands/persona.tsx` - CLI commands ✅
- `src/components/PersonaList.tsx` - UI component ✅
- `src/components/PersonaForm.tsx` - Create/edit form ✅
- `src/App.tsx` - Add persona view ✅
- `src/cli/commands/index.ts` - Export persona command ✅
- `src/cli/registry.tsx` - Register persona command ✅

---

## Phase 2: Contact Management ✅ COMPLETE

### Goal
Build an address book for storing contacts (people and agents/bots).

### CLI Commands
```
contact list                    # List all contacts
contact add <name>              # Add a new contact
contact show <id>               # Display contact details
contact edit <id>               # Edit contact
contact delete <id>             # Delete contact
contact search <query>          # Search contacts by name/email
contact link <contact> <persona> # Link contact to your persona
```

### Data Storage
- Store in `contacts` table
- Use `ContactSchema` and `AgentContactSchema`
- Support for vCard properties

### UI Components
- Contact list with search/filter
- Contact detail view
- Contact form (person vs agent type)
- Link to persona selector

### Files Created/Modified
- `src/cli/commands/contact.tsx` - CLI commands ✅
- `src/components/ContactList.tsx` - UI component with search/filter ✅
- `src/components/ContactForm.tsx` - Create/edit form ✅
- `src/App.tsx` - Add Contacts tab and view ✅
- `src/cli/commands/index.ts` - Export contact command ✅
- `src/cli/registry.tsx` - Register contact command ✅

---

## Phase 3: Group Management ✅ COMPLETE

### Goal
Create and manage organizations, teams, and custom groups with membership.

### CLI Commands
```
group list                      # List all groups
group create <name>             # Interactive group creation
group show <id>                 # Display group details
group edit <id>                 # Edit group
group delete <id>               # Delete group
group add-member <group> <contact> [--role=<role>]
group remove-member <group> <contact>
group list-members <group>      # List group members
```

### Data Storage
- Store in `groups` table
- Use `GroupSchema` and `MembershipSchema`
- Support for org: vocabulary (roles, time intervals)

### UI Components
- Group list view with type filter (All/Organizations/Teams/Groups)
- Group detail with member list
- Add/remove member interface via MembershipManager modal
- Member count display

### Files Created/Modified
- `src/cli/commands/group.tsx` - CLI commands ✅
- `src/components/GroupList.tsx` - UI component with type filter ✅
- `src/components/GroupForm.tsx` - Create/edit form ✅
- `src/components/MembershipManager.tsx` - Member management modal ✅
- `src/App.tsx` - Add Groups tab and view ✅
- `src/cli/commands/index.ts` - Export group command ✅
- `src/cli/registry.tsx` - Register group command ✅

---

## Phase 4: Rich File Metadata ✅ COMPLETE

### Goal
Enhance file storage with Solid-compatible metadata.

### CLI Commands
```
file info <path>                # Show file metadata
file set-author <path> <persona>
file set-title <path> <title>
file set-description <path> <desc>
```

### Data Storage
- Enhance `resources` table with metadata columns
- Use `FileMetadataSchema` and `ImageMetadataSchema`
- Store JSON-LD metadata alongside content

### UI Components
- Enhanced file detail view with "Metadata" tab
- Metadata editor panel with title, description, author
- Image properties display (dimensions, location)

### Files Created/Modified
- `src/cli/commands/file.tsx` - File metadata CLI commands ✅
- `src/components/FileMetadataPanel.tsx` - Metadata viewer/editor component ✅
- `src/App.tsx` - Enhanced FileViewTabs with Metadata tab ✅
- `src/cli/commands/index.ts` - Export file command ✅
- `src/cli/registry.tsx` - Register file command ✅

---

## Phase 5: Settings & Preferences ✅ COMPLETE

### Goal
Store user preferences and app settings.

### CLI Commands
```
config list                     # Show all settings
config get <key>                # Get setting value
config set <key> <value>        # Set setting value
config reset [key]              # Reset setting(s) to defaults
```

### Settings Supported
- `defaultPersonaId` - Default persona for authoring content
- `theme` - Color theme (light | dark | system)
- `cliHistorySize` - Number of CLI commands to keep in history
- `autoSaveInterval` - Auto-save interval in ms (0 = disabled)
- `showHiddenFiles` - Show hidden files in browser
- `defaultContentType` - Default MIME type for new files

### Data Storage
- Store in TinyBase `values` (not tables)
- Simple key-value pairs with type validation
- Default values for all settings

### Files Created/Modified
- `src/utils/settings.ts` - Settings utilities with type-safe helpers ✅
- `src/cli/commands/config.tsx` - CLI commands ✅
- `src/cli/commands/index.ts` - Export config command ✅
- `src/cli/registry.tsx` - Register config command ✅

---

## Phase 6: Type Indexes (Future)

### Goal
Implement Solid Type Indexes for data discovery. Type indexes allow apps to find where specific types of data are stored without hardcoding paths.

### Background
Solid uses two type index documents:
- **Public Type Index** - Listed in profile, points to publicly discoverable data
- **Private Type Index** - Listed in preferences, points to private data locations

Each index contains `solid:TypeRegistration` entries mapping RDF types to container locations.

### CLI Commands
```
typeindex list                  # List all type registrations
typeindex show <public|private> # Show specific type index
typeindex register <type> <location> [--public]
typeindex unregister <type>     # Remove type registration
```

### Data Storage
- Store in `typeIndexes` table (public and private)
- Use `TypeIndexSchema` and `TypeRegistrationSchema`
- Link from persona profile document

### Schema
```typescript
// Type Registration
{
  '@type': 'solid:TypeRegistration',
  'solid:forClass': 'vcard:Individual',  // The RDF type
  'solid:instance': 'https://.../contacts/',  // Where instances live
}

// Type Index Document
{
  '@type': 'solid:TypeIndex',
  'solid:hasTypeRegistration': [...]
}
```

### UI Components
- Type Index panel in Settings or dedicated tab
- Registration list with type → location mapping
- Add/remove registration interface

### Files to Create/Modify
- `src/schemas/typeIndex.ts` - TypeIndex and TypeRegistration schemas
- `src/cli/commands/typeindex.tsx` - CLI commands
- `src/utils/typeIndex.ts` - Helper functions for registration lookup
- `src/components/TypeIndexPanel.tsx` - UI component (optional)

---

## Phase 7: WebID Profile Format (Future)

### Goal
Make personas proper WebID profile documents that conform to Solid expectations.

### Background
A Solid WebID profile document includes specific predicates that apps expect:
- `solid:oidcIssuer` - Identity provider
- `solid:publicTypeIndex` - Link to public type index
- `solid:privateTypeIndex` - Link to private type index (in preferences)
- `ldp:inbox` - Notification inbox location
- `pim:preferencesFile` - Link to preferences document

### Changes to Persona Schema
```typescript
// Additional fields for WebID compliance
{
  // Existing FOAF fields...
  'solid:oidcIssuer': { '@id': 'https://...' },  // Optional - for real auth
  'solid:publicTypeIndex': { '@id': 'https://.../settings/publicTypeIndex' },
  'ldp:inbox': { '@id': 'https://.../inbox/' },
  'pim:preferencesFile': { '@id': 'https://.../settings/prefs' },
}
```

### CLI Commands
```
persona show <id> --full        # Show full WebID document
persona set-inbox <id> <url>    # Set inbox location
persona set-typeindex <id> <url> [--private]
```

### Data Storage
- Extend `PersonaSchema` with Solid-specific fields
- Create preferences document structure
- Link type indexes from profile

### Files to Create/Modify
- `src/schemas/persona.ts` - Extend with Solid WebID fields
- `src/schemas/preferences.ts` - Preferences file schema
- `src/cli/commands/persona.tsx` - Add WebID-specific subcommands
- `src/components/PersonaForm.tsx` - Add advanced WebID fields (collapsible)

---

## Phase 8: Access Control (Future)

### Goal
Implement Web Access Control (WAC) for resources.

### Background
Solid uses WAC for authorization. Each resource can have an associated `.acl` document that specifies who can access it and how.

### CLI Commands
```
acl show <path>                 # Show access control
acl grant <path> <agent> <mode> # Grant access (Read/Write/Append/Control)
acl revoke <path> <agent>       # Revoke access
acl set-public <path>           # Make public (grant to foaf:Agent)
acl set-private <path>          # Make private (owner only)
```

### Data Storage
- Create `ACLSchema` in schemas
- Store ACL documents alongside resources (resource.acl)
- Support for WAC modes (Read, Write, Append, Control)
- Agent types: WebID, Group, Public (foaf:Agent)

### Files to Create/Modify
- `src/schemas/acl.ts` - ACL and Authorization schemas
- `src/cli/commands/acl.tsx` - CLI commands
- `src/utils/acl.ts` - Permission checking helpers
- `src/components/ACLPanel.tsx` - UI for managing permissions

---

## Phase 9: Sync & Federation (Future)

### Goal
Enable multi-device sync and federation with external Solid servers.

### Features
- TinyBase MergeableStore sync
- WebSocket or HTTP sync transport
- Import from external Solid pods
- Export to Solid servers

---

## Implementation Order

1. **Phase 1: Personas** ✅ - Foundation for identity
2. **Phase 2: Contacts** ✅ - Depends on personas for linking
3. **Phase 3: Groups** ✅ - Depends on contacts for membership
4. **Phase 4: File Metadata** ✅ - Enhance existing functionality
5. **Phase 5: Settings** ✅ - Quality of life
6. **Phase 6: Type Indexes** - Solid data discovery
7. **Phase 7: WebID Profile** - Solid-compliant identity documents
8. **Phase 8: ACL** - Security layer
9. **Phase 9: Sync** - Federation

## Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|----------------|------------|
| 1. Personas ✅ | 3 | 2 | Medium |
| 2. Contacts ✅ | 4 | 1 | Medium |
| 3. Groups ✅ | 4 | 1 | Medium-High |
| 4. File Metadata ✅ | 0 | 2 | Low |
| 5. Settings ✅ | 2 | 1 | Low |
| 6. Type Indexes | 4 | 2 | Medium |
| 7. WebID Profile | 2 | 3 | Medium |
| 8. ACL | 3 | 3 | High |
| 9. Sync | 4 | 4 | High |

## Success Criteria

- [ ] All CLI commands work with tab completion
- [ ] Data persists across page refreshes
- [ ] Schemas validate all stored data
- [ ] UI and CLI stay in sync
- [ ] Export produces valid JSON-LD
- [ ] Import validates against schemas
