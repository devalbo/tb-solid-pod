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

**All core schemas integrated!**

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

## Phase 5: Settings & Preferences

### Goal
Store user preferences and app settings.

### CLI Commands
```
config list                     # Show all settings
config get <key>                # Get setting value
config set <key> <value>        # Set setting value
config reset                    # Reset to defaults
```

### Settings to Support
- Default persona
- Theme preference
- CLI history size
- Auto-save interval

### Data Storage
- Store in TinyBase `values` (not tables)
- Simple key-value pairs

### Files to Create
- `src/cli/commands/config.tsx` - CLI commands
- `src/utils/settings.ts` - Settings utilities

---

## Phase 6: Access Control (Future)

### Goal
Implement Web Access Control for resources.

### CLI Commands
```
acl show <path>                 # Show access control
acl grant <path> <agent> <mode> # Grant access
acl revoke <path> <agent>       # Revoke access
acl set-public <path>           # Make public
acl set-private <path>          # Make private
```

### Data Storage
- Create `ACLSchema` in schemas
- Store ACL documents alongside resources
- Support for WAC modes (Read, Write, Append, Control)

---

## Phase 7: Sync & Federation (Future)

### Goal
Enable multi-device sync and federation with external Solid servers.

### Features
- TinyBase MergeableStore sync
- WebSocket or HTTP sync transport
- Import from external Solid pods
- Export to Solid servers

---

## Implementation Order

1. **Phase 1: Personas** - Foundation for identity
2. **Phase 2: Contacts** - Depends on personas for linking
3. **Phase 3: Groups** - Depends on contacts for membership
4. **Phase 4: File Metadata** - Enhance existing functionality
5. **Phase 5: Settings** - Quality of life
6. **Phase 6: ACL** - Security layer
7. **Phase 7: Sync** - Federation

## Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|----------------|------------|
| 1. Personas | 3 | 2 | Medium |
| 2. Contacts | 4 | 1 | Medium |
| 3. Groups | 4 | 1 | Medium-High |
| 4. File Metadata | 0 | 2 | Low |
| 5. Settings | 2 | 1 | Low |
| 6. ACL | 3 | 3 | High |
| 7. Sync | 4 | 4 | High |

## Success Criteria

- [ ] All CLI commands work with tab completion
- [ ] Data persists across page refreshes
- [ ] Schemas validate all stored data
- [ ] UI and CLI stay in sync
- [ ] Export produces valid JSON-LD
- [ ] Import validates against schemas
