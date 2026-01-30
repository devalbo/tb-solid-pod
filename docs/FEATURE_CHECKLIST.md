# Feature Checklist

Manual verification checklist for tb-solid-pod. **Assume features are broken until verified.**

## Organization

Items are ordered by dependency: if an early item fails, skip dependent items below it.

- **Levels 0-3**: Foundational (app loads, store works, navigation, CLI)
- **Levels 4-10**: Features (personas → contacts → groups → files → settings → type indexes → WebID)
- **Level 11**: Future work (not implemented)

Within each level, items are grouped hierarchically (CLI, UI, Data) where it makes sense. You can verify a level's CLI commands, then its UI, then its data integrity—or work through all three together. Use whatever flow makes sense for what you're verifying.

---

## How to Use

1. Start from the top and work down
2. If an item fails, note it and skip items that depend on it
3. Check boxes as you verify each item works
4. Uncheck boxes when something breaks
5. Add `[BROKEN]` notes for known issues
6. Within a level, verify CLI/UI/Data in any order that makes sense

---

## Level 0: App Loads

If these fail, nothing else can be tested.

- [x] App loads without console errors
- [x] Browser tab title contains "tb-solid-pod"
- [x] Main UI renders (not blank page)

## Level 1: Core Infrastructure

Foundation for all features.

- [x] TinyBase store initializes
- [x] Data persists after page refresh
- [x] LocalStorage contains app data
- [x] Export produces JSON file
- [x] Import loads JSON and populates store

## Level 2: Navigation

Must work to access features.

- [x] Tab bar visible (Data Browser, Personas, Contacts, Groups, Terminal)
- [x] Clicking each tab shows correct view
- [x] Active tab is visually indicated
- [x] Terminal tab shows CLI prompt

## Level 3: CLI Terminal

Required for CLI-based features.

- [x] CLI prompt accepts input
- [x] `help` command shows available commands
- [x] `clear` command clears terminal
- [x] Command history (up arrow) works
- [x] Unknown command shows error message

---

## Level 4: Personas

Foundation for identity. Required for contacts and authorship.

### CLI
- [x] `persona list` shows personas (or empty message)
- [x] `persona create <name>` creates a persona
- [x] `persona show <id>` displays persona details
- [x] `persona edit <id>` modifies persona
- [x] `persona delete <id>` removes persona
- [x] `persona set-default <id>` sets default persona

### UI
- [x] Personas tab shows list of personas
- [x] "Create" button opens PersonaForm
- [x] PersonaForm saves new persona
- [x] Clicking persona opens edit form
- [x] Delete button removes persona
- [x] Default persona indicator visible
- [x] "Create random" button populates form with sample data

### Data
- [x] Persona data validates against PersonaSchema
- [x] Persona has `@id`, `@type`, `foaf:name`
- [x] Default persona ID stored in values

---

## Level 5: Contacts

Depends on: Personas (for linking)

### CLI
- [x] `contact list` shows contacts (or empty message)
- [x] `contact add <name>` creates a contact
- [x] `contact show <id>` displays contact details
- [x] `contact edit <id>` modifies contact
- [x] `contact delete <id>` removes contact
- [x] `contact search <query>` finds contacts by name/email

### UI
- [x] Contacts tab shows list of contacts
- [x] Search/filter field filters contact list
- [x] "Create" button opens ContactForm
- [x] ContactForm saves new contact
- [x] Can toggle between person and agent type
- [x] Clicking contact opens edit form
- [x] Delete button removes contact
- [x] "Create random" button populates form with sample data

### Data
- [x] Contact data validates against ContactSchema
- [x] Contact has `@id`, `@type`, `vcard:fn`
- [x] Agent contacts have agent-specific fields

---

## Level 6: Groups

Depends on: Contacts (for membership), Personas (for membership)

### CLI
- [x] `group list` shows groups (or empty message)
- [x] `group create <name>` creates a group
- [x] `group show <id>` displays group details
- [x] `group edit <id>` modifies group
- [x] `group delete <id>` removes group
- [x] `group add-member <group> <contact>` adds member
- [x] `group remove-member <group> <contact>` removes member
- [x] `group list-members <group>` shows members

### UI
- [x] Groups tab shows list of groups
- [x] Type filter (All/Organizations/Teams/Groups) works
- [x] "Create" button opens GroupForm
- [x] GroupForm saves new group with type selection
- [x] Clicking group opens edit form
- [x] MembershipManager opens from group
- [x] Can add contacts as members
- [x] Can add personas as members
- [x] Can remove members
- [x] Member count displayed on group list
- [x] "Create random" button populates form with sample data

### Data
- [x] Group data validates against GroupSchema
- [x] Group has `@id`, `@type`, `vcard:fn`
- [x] Membership stored correctly

---

## Level 7: Files & Metadata

Depends on: Personas (for author attribution)

### CLI
- [x] `ls` lists files/folders
- [x] `cd <path>` changes directory
- [x] `pwd` shows current path
- [x] `mkdir <name>` creates folder
- [x] `touch <name>` creates file
- [x] `cat <file>` shows file content
- [x] `rm <path>` removes file/folder
- [x] `file info <path>` shows metadata
- [x] `file set-title <path> <title>` sets title
- [x] `file set-author <path> <persona>` sets author
- [x] `file set-description <path> <desc>` sets description

### UI
- [x] Data Browser shows file/folder tree
- [x] Clicking folder navigates into it
- [x] Clicking file shows content
- [x] FileMetadataPanel shows title, description, author
- [x] Can edit metadata fields
- [x] Author dropdown shows personas

### Data
- [x] Resources stored in `resources` table
- [x] Files have `type`, `body`, `contentType`, `parentId`
- [x] Folders have `type: ldp:Container`

---

## Level 8: Settings

Depends on: Core infrastructure

### CLI
- [x] `config list` shows all settings
- [x] `config get <key>` shows setting value
- [x] `config set <key> <value>` changes setting
- [x] `config reset` resets to defaults
- [x] `config reset <key>` resets specific setting

### Data
- [x] Settings stored in TinyBase values (not tables)
- [x] `defaultPersonaId` setting works
- [x] `theme` setting works
- [x] `cliHistorySize` setting works

---

## Level 9: Type Indexes

Depends on: Personas (for type index links)

### CLI
- [x] `typeindex list` shows registrations
- [x] `typeindex show public` shows public index
- [x] `typeindex show private` shows private index
- [x] `typeindex register <type> <location>` adds registration
- [x] `typeindex unregister <type>` removes registration

### Data
- [x] Type indexes stored in `typeIndexes` table
- [x] Default registrations seeded on first load
- [x] Persona schema includes type index links

---

## Level 10: WebID Profile

Depends on: Personas, Type Indexes

### CLI
- [x] `persona show <id> --full` shows full WebID JSON
- [x] `persona set-inbox <id> <url>` sets inbox
- [x] `persona set-typeindex <id> <url>` sets public type index
- [x] `persona set-typeindex <id> <url> --private` sets private type index

### UI
- [x] PersonaForm has collapsible "WebID / Solid profile" section
- [x] Can set OIDC issuer
- [x] Can set inbox URL
- [x] Can set preferences file URL
- [x] Can set public/private type index URLs

### Data
- [x] Persona includes `ldp:inbox` when set
- [x] Persona includes `pim:preferencesFile` when set
- [x] Persona includes `solid:publicTypeIndex` when set
- [x] Persona includes `solid:privateTypeIndex` when set

---

## Level 11: Future (Not Implemented)

### Phase 8: Access Control
- [ ] ACL schema exists
- [ ] `acl show <path>` works
- [ ] `acl grant` / `acl revoke` work
- [ ] ACLPanel UI exists

### Phase 9: Sync
- [ ] Can connect to external Solid pod
- [ ] Initial sync pushes local data
- [ ] Ongoing sync works
- [ ] Authority mode selectable

---

## Testing Infrastructure

### Unit Tests
- [x] `npm test` runs without errors
- [x] 385+ tests passing
- [x] Coverage meets 80% threshold

### Storybook
- [x] `npm run storybook` starts without errors
- [x] PersonaList/Form stories render
- [x] ContactList/Form stories render
- [x] GroupList/Form/MembershipManager stories render
- [x] FileMetadataPanel stories render

### BDD/E2E
- [x] `npm run test:e2e` runs (with dev server running)
- [x] App shell scenarios pass
- [x] CLI contact scenarios pass
- [x] CLI persona scenarios pass

---

## Last Full Verification

**Date:** ____________

**Verified by:** ____________

**Notes:**
