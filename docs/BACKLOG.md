# Backlog

Pending work items for tb-solid-pod. Items are roughly prioritized within each section.

For completed work, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). For feature verification, see [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md).

---

## CLI Command Unification

From [CLI_COMMAND_UNIFICATION.md](../CLI_COMMAND_UNIFICATION.md) and [VALID_PATHS.md](../VALID_PATHS.md).

### Entity Command Migration (Phase 4)

Migrate entity commands to use centralized `entity-lookup.ts` instead of duplicated local functions.

- [ ] `persona.tsx`: Replace local `findPersonaId()` with `findPersona()` from `../entity-lookup`
- [ ] `contact.tsx`: Replace local `findContactId()` and `findPersonaId()` with imports from `../entity-lookup`
- [ ] `group.tsx`: Replace local `findGroupId()` and `findContactId()` with imports from `../entity-lookup`

### JSON Output Mode (Phase 4-5)

Add `--json` flag support to remaining commands for programmatic consumption.

- [ ] `persona` command: Add `supportsJson` and structured output
- [ ] `contact` command: Add `supportsJson` and structured output
- [ ] `group` command: Add `supportsJson` and structured output
- [ ] `config` command: Add `supportsJson` and structured output
- [ ] `typeindex` command: Add `supportsJson` and structured output

### UI Integration (Phase 6)

Route UI operations through CLI command layer for consistent validation and testability.

- [ ] Create `src/cli/hooks/useCliExecutor.ts` - React hook for executing commands from UI
- [ ] Create `src/cli/hooks/useCliContext.ts` - Context provider for CLI state
- [ ] Update `App.tsx` to use CLI executor instead of direct `pod.handleRequest()` calls
- [ ] Wire up file/folder creation dialogs to use command responses
- [ ] Wire up delete operations to use command responses

### Testing

- [ ] Add unit tests for `src/cli/path.ts`
- [ ] Add unit tests for `src/cli/entity-lookup.ts`
- [ ] Add unit tests for `src/cli/executor.ts`

### VirtualPod Safety Net

- [ ] Add path validation to VirtualPod as a safety net (defense in depth)

---

## Future Work

Items not yet planned in detail.

- [ ] Real-time sync to Solid pod (see [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md))
- [ ] Multi-device sync
- [ ] WAC (Web Access Control) enforcement
- [ ] Large file chunking/streaming

---

## Notes

- When completing an item, move it to the Completed section below with date and resolution
- If an item is blocked, note why: `- [ ] Item [BLOCKED: reason]`
- Move completed sections to IMPLEMENTATION_PLAN.md if they represent a coherent phase

---

## Completed

Track completed items here with date and brief resolution.

### 2025-01-31

- [x] Create `src/cli/path.ts` - Centralized path module
  - Resolution: Implemented with `resolvePath`, `validateName`, segment encoding/decoding, and escape detection
- [x] Create `src/cli/entity-lookup.ts` - Centralized entity lookup
  - Resolution: Implemented `findPersona`, `findContact`, `findGroup` functions
- [x] Create `src/cli/executor.ts` - Command executor with structured results
  - Resolution: Implemented `executeCommandLine` and `exec` with `CommandResult` handling
- [x] Migrate navigation commands to use centralized path module
  - Resolution: `cd`, `ls` now import from `../path`
- [x] Migrate file commands to use centralized path module
  - Resolution: `cat`, `touch`, `mkdir`, `rm` now import from `../path`
- [x] Add `supportsJson` to navigation and file commands
  - Resolution: `pwd`, `cd`, `ls`, `cat`, `touch`, `mkdir`, `rm`, `file info` support `--json` flag
