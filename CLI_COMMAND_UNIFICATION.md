# CLI Command Unification Plan

This document outlines the plan to unify all CLI commands with consistent patterns, structured responses, and shared utilities. It builds on the path integrity and UI-CLI mapping concepts from `VALID_PATHS.md`.

---

## Table of Contents

1. [Current Command Inventory](#current-command-inventory)
2. [Identified Issues](#identified-issues)
3. [Unified Architecture](#unified-architecture)
4. [Shared Utilities](#shared-utilities)
5. [Command Result Standard](#command-result-standard)
6. [Command-by-Command Migration](#command-by-command-migration)
7. [Implementation Phases](#implementation-phases)

---

## Current Command Inventory

### Navigation Commands (`navigation.tsx`)
| Command | Subcommands | Current Return | Uses resolvePath | Uses Store |
|---------|-------------|----------------|------------------|------------|
| `pwd` | - | void | No | Read currentUrl |
| `cd` | - | void | Yes (local copy) | Read row |
| `ls` | - | void | Yes (local copy) | Read table |

### File Operation Commands (`files.tsx`)
| Command | Subcommands | Current Return | Uses resolvePath | Uses Pod |
|---------|-------------|----------------|------------------|----------|
| `cat` | - | void | Yes (local copy) | No (store read) |
| `touch` | - | Promise<void> | Yes (local copy) | Yes (PUT) |
| `mkdir` | - | Promise<void> | Yes (local copy) | Yes (PUT) |
| `rm` | - | Promise<void> | Yes (local copy) | Yes (DELETE) |

### File Metadata Commands (`file.tsx`)
| Command | Subcommands | Current Return | Uses resolvePath |
|---------|-------------|----------------|------------------|
| `file` | info, set-author, set-title, set-description | void | Yes (local copy) |

### Data Commands (`data.tsx`)
| Command | Subcommands | Current Return | Platform-specific |
|---------|-------------|----------------|-------------------|
| `export` | - | Promise<void> | Yes (Node vs Browser) |
| `import` | - | void | Yes (UI-only in browser) |

### Entity Commands (`persona.tsx`, `contact.tsx`, `group.tsx`)
| Command | Subcommands | Shared Utilities |
|---------|-------------|------------------|
| `persona` | list, create, show, edit, delete, set-default, set-inbox, set-typeindex | findPersonaId (local) |
| `contact` | list, add, show, edit, delete, search, link | findContactId (local), findPersonaId (duplicated) |
| `group` | list, create, show, edit, delete, add-member, remove-member, list-members | findGroupId (local), findContactId (duplicated) |

### Configuration Commands (`config.tsx`)
| Command | Subcommands | Current Return |
|---------|-------------|----------------|
| `config` | list, get, set, reset | void |

### Type Index Commands (`typeindex.tsx`)
| Command | Subcommands | Current Return |
|---------|-------------|----------------|
| `typeindex` | list, show, register, unregister | void |

### Utility Commands
| Command | File | Purpose |
|---------|------|---------|
| `help` | help.tsx | Show available commands |
| `clear` | clear.tsx | Clear terminal output |
| `exit` | exit.tsx | Exit CLI (Node only) |

---

## Identified Issues

### 1. Code Duplication

**resolvePath function** - Duplicated in 3 files with identical implementation:
- `src/cli/commands/navigation.tsx:21-39`
- `src/cli/commands/files.tsx:8-19`
- `src/cli/commands/file.tsx:12-23`

**findPersonaId function** - Duplicated in 2 files:
- `src/cli/commands/persona.tsx:515-542`
- `src/cli/commands/contact.tsx:577-601`

**findContactId function** - Duplicated in 2 files:
- `src/cli/commands/contact.tsx:545-572`
- `src/cli/commands/group.tsx:694-718`

### 2. Inconsistent Return Types

Commands return different types:
- Most return `void`
- Async commands return `Promise<void>`
- No structured result for programmatic consumption
- No way to distinguish success from failure programmatically

### 3. No Structured Output Mode

- All commands output React components directly
- No `--json` flag for machine-readable output
- UI cannot consume command results programmatically

### 4. Inconsistent Error Handling

- Some commands throw errors
- Some commands output errors and return
- No standard error codes or messages

### 5. Missing Validation Layer

- Path validation happens inline in each command
- No pre-validation hook
- Validation logic differs between commands

### 6. Argument Parsing Inconsistency

- Some commands use `parseCliArgs()`
- Some commands access `args` directly
- Option naming conventions vary

---

## Unified Architecture

### Directory Structure

```
src/cli/
├── types.ts              # Core types (enhanced)
├── registry.tsx          # Command registry
├── executor.ts           # NEW: Command executor with result handling
├── parse-args.ts         # Argument parsing (enhanced)
├── path.ts               # NEW: Centralized path utilities
├── entity-lookup.ts      # NEW: Centralized entity lookup
├── commands/
│   ├── index.ts          # Command exports
│   ├── navigation.tsx    # pwd, cd, ls
│   ├── files.tsx         # cat, touch, mkdir, rm
│   ├── file.tsx          # file info/set-*
│   ├── data.tsx          # export, import
│   ├── persona.tsx       # persona *
│   ├── contact.tsx       # contact *
│   ├── group.tsx         # group *
│   ├── config.tsx        # config *
│   ├── typeindex.tsx     # typeindex *
│   ├── help.tsx          # help
│   ├── clear.tsx         # clear
│   └── exit.tsx          # exit
└── hooks/
    ├── useCliExecutor.ts # NEW: React hook for UI integration
    └── useCliContext.ts  # NEW: Context provider hook
```

### Core Type Definitions

```typescript
// src/cli/types.ts (enhanced)

/**
 * Standardized command result
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: CommandError;
}

export interface CommandError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ErrorCode =
  // Path errors
  | 'INVALID_PATH'
  | 'PATH_NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'NOT_A_FILE'
  | 'ALREADY_EXISTS'
  | 'PARENT_NOT_FOUND'
  | 'DIRECTORY_NOT_EMPTY'
  | 'ESCAPE_ATTEMPT'
  // Entity errors
  | 'ENTITY_NOT_FOUND'
  | 'DUPLICATE_ENTITY'
  | 'INVALID_ENTITY'
  // Argument errors
  | 'MISSING_ARGUMENT'
  | 'INVALID_ARGUMENT'
  | 'UNKNOWN_SUBCOMMAND'
  // Operation errors
  | 'OPERATION_FAILED'
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED';

/**
 * Enhanced command definition
 */
export interface Command {
  name: string;
  description: string;
  usage: string;

  /**
   * Execute the command
   * @returns CommandResult for programmatic use, or void for output-only commands
   */
  execute: (
    args: string[],
    context: CliContext,
    options?: CommandOptions
  ) => CommandResult | Promise<CommandResult> | void | Promise<void>;

  /**
   * Optional: Validate arguments before execution
   */
  validate?: (args: string[], context: CliContext) => CommandError | null;

  /**
   * Optional: Command supports JSON output mode
   */
  supportsJson?: boolean;

  /**
   * Optional: Subcommands for compound commands
   */
  subcommands?: Record<string, SubcommandDef>;
}

export interface SubcommandDef {
  description: string;
  usage: string;
  execute: (
    args: string[],
    context: CliContext,
    options?: CommandOptions
  ) => CommandResult | Promise<CommandResult> | void | Promise<void>;
}

export interface CommandOptions {
  /** Suppress terminal output */
  silent?: boolean;
  /** Return structured data instead of rendering */
  json?: boolean;
}
```

---

## Shared Utilities

### 1. Path Module (`src/cli/path.ts`)

See `VALID_PATHS.md` Section 1 for full specification. Key exports:

```typescript
export function resolvePath(currentUrl: string, path: string, baseUrl: string): ResolveResult;
export function validateName(name: string): PathError | null;
export function ensureTrailingSlash(url: string): string;
export function removeTrailingSlash(url: string): string;
export function getParentUrl(url: string, baseUrl: string): string;
export function getSegments(url: string, baseUrl: string): string[];
export function decodeSegment(segment: string): string;
export function encodeSegment(name: string): string;
export function isContainer(url: string): boolean;
export function isDescendantOf(url: string, ancestorUrl: string): boolean;
```

### 2. Entity Lookup Module (`src/cli/entity-lookup.ts`)

Consolidate all entity lookup functions:

```typescript
import type { Store } from 'tinybase';
import { STORE_TABLES } from '../storeLayout';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';

export interface LookupResult {
  found: true;
  id: string;
}

export interface LookupNotFound {
  found: false;
}

export type EntityLookupResult = LookupResult | LookupNotFound;

/**
 * Find a persona by ID, partial ID, or name
 */
export function findPersona(store: Store, query: string): EntityLookupResult {
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};

  // Exact match
  if (personas[query]) {
    return { found: true, id: query };
  }

  // Short ID match (UUID part without #me)
  for (const id of Object.keys(personas)) {
    const shortId = id.split('/').pop()?.replace('#me', '') || '';
    if (shortId === query || shortId.startsWith(query)) {
      return { found: true, id };
    }
  }

  // Name match (case-insensitive)
  const queryLower = query.toLowerCase();
  for (const [id, record] of Object.entries(personas)) {
    const name = ((record as Record<string, unknown>)[FOAF.name] as string || '').toLowerCase();
    if (name === queryLower || name.includes(queryLower)) {
      return { found: true, id };
    }
  }

  return { found: false };
}

/**
 * Find a contact by ID, partial ID, or name
 */
export function findContact(store: Store, query: string): EntityLookupResult {
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};

  // Exact match
  if (contacts[query]) {
    return { found: true, id: query };
  }

  // Short ID match (after #)
  for (const id of Object.keys(contacts)) {
    const shortId = id.split('#').pop() || '';
    if (shortId === query || shortId.startsWith(query)) {
      return { found: true, id };
    }
  }

  // Name match (case-insensitive)
  const queryLower = query.toLowerCase();
  for (const [id, record] of Object.entries(contacts)) {
    const name = ((record as Record<string, unknown>)[VCARD.fn] as string || '').toLowerCase();
    if (name === queryLower || name.includes(queryLower)) {
      return { found: true, id };
    }
  }

  return { found: false };
}

/**
 * Find a group by ID, partial ID, or name
 */
export function findGroup(store: Store, query: string): EntityLookupResult {
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};

  // Exact match
  if (groups[query]) {
    return { found: true, id: query };
  }

  // Slug match (after /groups/)
  for (const id of Object.keys(groups)) {
    const slug = id.split('/groups/').pop()?.split('#')[0] || '';
    if (slug === query || slug.startsWith(query)) {
      return { found: true, id };
    }
  }

  // Name match (case-insensitive)
  const queryLower = query.toLowerCase();
  for (const [id, record] of Object.entries(groups)) {
    const name = ((record as Record<string, unknown>)[VCARD.fn] as string || '').toLowerCase();
    if (name === queryLower || name.includes(queryLower)) {
      return { found: true, id };
    }
  }

  return { found: false };
}

/**
 * Generic entity lookup
 */
export function findEntity(
  store: Store,
  table: string,
  query: string,
  nameKey: string,
  idExtractor: (id: string) => string
): EntityLookupResult {
  const entities = store.getTable(table) || {};

  if (entities[query]) {
    return { found: true, id: query };
  }

  for (const id of Object.keys(entities)) {
    const shortId = idExtractor(id);
    if (shortId === query || shortId.startsWith(query)) {
      return { found: true, id };
    }
  }

  const queryLower = query.toLowerCase();
  for (const [id, record] of Object.entries(entities)) {
    const name = ((record as Record<string, unknown>)[nameKey] as string || '').toLowerCase();
    if (name === queryLower || name.includes(queryLower)) {
      return { found: true, id };
    }
  }

  return { found: false };
}
```

### 3. Command Executor (`src/cli/executor.ts`)

```typescript
import React from 'react';
import { Text } from 'ink';
import type { Command, CliContext, CommandResult, CommandOptions, CommandError } from './types';
import { commands } from './registry';

/**
 * Execute a command and return structured result
 */
export async function executeCommand(
  input: string,
  context: CliContext,
  options?: CommandOptions
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { success: true, message: '' };
  }

  const [cmdName, ...args] = trimmed.split(/\s+/);
  const command = commands[cmdName.toLowerCase()];

  if (!command) {
    const error: CommandError = {
      code: 'INVALID_ARGUMENT',
      message: `Unknown command: ${cmdName}`,
    };

    if (!options?.silent) {
      context.addOutput(
        <Text color="red">Unknown command: {cmdName}. Type "help" for available commands.</Text>,
        'error'
      );
    }

    return { success: false, error };
  }

  // Run validation if defined
  if (command.validate) {
    const validationError = command.validate(args, context);
    if (validationError) {
      if (!options?.silent) {
        context.addOutput(
          <Text color="red">{validationError.message}</Text>,
          'error'
        );
      }
      return { success: false, error: validationError };
    }
  }

  try {
    const result = await command.execute(args, { ...context, commands }, options);

    // If command returns a result, use it
    if (result && typeof result === 'object' && 'success' in result) {
      return result;
    }

    // Otherwise assume success
    return { success: true };
  } catch (err) {
    const error: CommandError = {
      code: 'OPERATION_FAILED',
      message: err instanceof Error ? err.message : String(err),
    };

    if (!options?.silent) {
      context.addOutput(
        <Text color="red">Error: {error.message}</Text>,
        'error'
      );
    }

    return { success: false, error };
  }
}

/**
 * Execute a command by name with arguments
 */
export async function exec(
  command: string,
  args: string[],
  context: CliContext,
  options?: CommandOptions
): Promise<CommandResult> {
  const input = [command, ...args].join(' ');
  return executeCommand(input, context, options);
}
```

### 4. Argument Parsing Enhancements (`src/cli/parse-args.ts`)

```typescript
// Add to existing parse-args.ts

/**
 * Check if --json flag is present
 */
export const hasJsonFlag = (options: Record<string, string | boolean>): boolean => {
  return options['json'] === true || options['j'] === true;
};

/**
 * Get required positional argument or return error
 */
export const getRequiredArg = (
  positional: string[],
  index: number,
  name: string
): string | CommandError => {
  if (index >= positional.length || !positional[index]) {
    return {
      code: 'MISSING_ARGUMENT',
      message: `Missing required argument: ${name}`,
    };
  }
  return positional[index];
};

/**
 * Validate subcommand
 */
export const validateSubcommand = (
  subcommand: string | undefined,
  validSubcommands: string[],
  commandName: string
): CommandError | null => {
  if (!subcommand) {
    return {
      code: 'MISSING_ARGUMENT',
      message: `${commandName}: missing subcommand`,
    };
  }

  if (!validSubcommands.includes(subcommand.toLowerCase())) {
    return {
      code: 'UNKNOWN_SUBCOMMAND',
      message: `${commandName}: unknown subcommand: ${subcommand}`,
    };
  }

  return null;
};
```

---

## Command Result Standard

### Success Results by Command Type

#### Navigation Commands

```typescript
// pwd
{ success: true, data: { url: string } }

// cd
{ success: true, data: { url: string, previousUrl: string } }

// ls
{ success: true, data: { url: string, children: ResourceInfo[] } }

interface ResourceInfo {
  url: string;
  name: string;
  type: 'Container' | 'Resource';
  contentType?: string;
  size?: number;
  updated?: string;
}
```

#### File Operation Commands

```typescript
// cat
{ success: true, data: { url: string, content: string, contentType: string } }

// touch
{ success: true, data: { url: string, created: true } }

// mkdir
{ success: true, data: { url: string, created: true } }

// rm
{ success: true, data: { url: string, deleted: true } }
```

#### Entity Commands

```typescript
// persona/contact/group list
{ success: true, data: { count: number, items: EntitySummary[] } }

// persona/contact/group create
{ success: true, data: { id: string, name: string } }

// persona/contact/group show
{ success: true, data: EntityDetails }

// persona/contact/group edit
{ success: true, data: { id: string, updated: string[] } }

// persona/contact/group delete
{ success: true, data: { id: string, name: string } }
```

#### Config Commands

```typescript
// config list
{ success: true, data: { settings: SettingInfo[] } }

// config get
{ success: true, data: { key: string, value: unknown, isDefault: boolean } }

// config set
{ success: true, data: { key: string, value: unknown, previousValue: unknown } }

// config reset
{ success: true, data: { key?: string, resetAll: boolean } }
```

---

## Command-by-Command Migration

### Navigation Commands

#### `pwd`

**Current:**
```typescript
execute: (_args, context) => {
  context.addOutput(<Text color="cyan">{context.currentUrl}</Text>);
}
```

**Unified:**
```typescript
execute: (_args, context, options) => {
  const result = { success: true, data: { url: context.currentUrl } };

  if (options?.json) {
    context.addOutput(<Text>{JSON.stringify(result.data)}</Text>);
  } else if (!options?.silent) {
    context.addOutput(<Text color="cyan">{context.currentUrl}</Text>);
  }

  return result;
}
```

#### `cd`

**Current:** Uses local `resolvePath`, handles trailing slash logic inline.

**Unified:**
```typescript
import { resolvePath } from '../path';

execute: (args, context, options) => {
  const { currentUrl, setCurrentUrl, baseUrl, store } = context;
  const path = args[0];
  const previousUrl = currentUrl;

  // No path = go to root
  if (!path) {
    setCurrentUrl(baseUrl);
    return { success: true, data: { url: baseUrl, previousUrl } };
  }

  // Resolve path
  const resolved = resolvePath(currentUrl, path, baseUrl);
  if (!resolved.valid) {
    if (!options?.silent) {
      context.addOutput(<Text color="red">cd: {resolved.error}</Text>, 'error');
    }
    return { success: false, error: { code: resolved.code, message: resolved.error } };
  }

  // Ensure it's a container
  let targetUrl = resolved.url;
  if (!targetUrl.endsWith('/')) {
    targetUrl = targetUrl + '/';
  }

  // Check exists
  if (!store.hasRow('resources', targetUrl)) {
    const error = { code: 'PATH_NOT_FOUND', message: `cd: no such directory: ${path}` };
    if (!options?.silent) {
      context.addOutput(<Text color="red">{error.message}</Text>, 'error');
    }
    return { success: false, error };
  }

  // Check is container
  const row = store.getRow('resources', targetUrl);
  if (row.type !== 'Container') {
    const error = { code: 'NOT_A_DIRECTORY', message: `cd: not a directory: ${path}` };
    if (!options?.silent) {
      context.addOutput(<Text color="red">{error.message}</Text>, 'error');
    }
    return { success: false, error };
  }

  setCurrentUrl(targetUrl);
  return { success: true, data: { url: targetUrl, previousUrl } };
}
```

#### `ls`

**Current:** Outputs React component with children list.

**Unified:**
```typescript
import { resolvePath } from '../path';

supportsJson: true,

execute: (args, context, options) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const { positional, options: cmdOptions } = parseCliArgs(args);
  const path = positional[0];
  const jsonMode = options?.json || hasJsonFlag(cmdOptions);

  const targetUrl = path ? resolvePath(currentUrl, path, baseUrl) : { valid: true, url: currentUrl };

  if (!targetUrl.valid) {
    return { success: false, error: { code: targetUrl.code, message: targetUrl.error } };
  }

  const row = store.getRow('resources', targetUrl.url);
  if (!row) {
    return {
      success: false,
      error: { code: 'PATH_NOT_FOUND', message: `ls: no such file or directory: ${path || targetUrl.url}` }
    };
  }

  // Build children list
  const children: ResourceInfo[] = [];
  if (row.type === 'Container') {
    const allRows = store.getTable('resources') || {};
    Object.entries(allRows)
      .filter(([, r]) => r.parentId === targetUrl.url)
      .sort(([urlA, rowA], [urlB, rowB]) => {
        if (rowA.type === 'Container' && rowB.type !== 'Container') return -1;
        if (rowA.type !== 'Container' && rowB.type === 'Container') return 1;
        return urlA.localeCompare(urlB);
      })
      .forEach(([url, r]) => {
        children.push({
          url,
          name: decodeSegment(url.split('/').filter(Boolean).pop() || ''),
          type: r.type as 'Container' | 'Resource',
          contentType: r.contentType,
          updated: r.updated,
        });
      });
  } else {
    // Single file
    children.push({
      url: targetUrl.url,
      name: decodeSegment(targetUrl.url.split('/').filter(Boolean).pop() || ''),
      type: 'Resource',
      contentType: row.contentType,
      updated: row.updated,
    });
  }

  const result = { success: true, data: { url: targetUrl.url, children } };

  if (jsonMode) {
    addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
  } else if (!options?.silent) {
    // Existing React output...
  }

  return result;
}
```

### File Operation Commands

#### `touch`

**Enhanced with --base64 support for binary files:**

```typescript
import { resolvePath, validateName } from '../path';

supportsJson: true,

execute: async (args, context, options) => {
  const { currentUrl, baseUrl, pod, store, addOutput } = context;
  const { positional, options: cmdOptions } = parseCliArgs(args);
  const filename = positional[0];

  if (!filename) {
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: 'touch: missing file operand' } };
  }

  // Validate filename
  const nameError = validateName(filename);
  if (nameError) {
    return { success: false, error: { code: nameError.code, message: `touch: ${nameError.error}` } };
  }

  // Check current location is container
  const row = store.getRow('resources', currentUrl);
  if (!row || row.type !== 'Container') {
    return { success: false, error: { code: 'NOT_A_DIRECTORY', message: 'touch: current location is not a directory' } };
  }

  const content = getOptionString(cmdOptions, 'content') || '';
  const contentType = getOptionString(cmdOptions, 'type') || 'text/plain';
  const isBase64 = getOptionBoolean(cmdOptions, 'base64');

  const resolved = resolvePath(currentUrl, filename, baseUrl);
  if (!resolved.valid) {
    return { success: false, error: { code: resolved.code, message: `touch: ${resolved.error}` } };
  }

  const result = await pod.handleRequest(resolved.url, {
    method: 'PUT',
    body: content,
    headers: {
      'Content-Type': contentType,
      ...(isBase64 ? { 'Content-Transfer-Encoding': 'base64' } : {}),
    },
  });

  if (result.status === 201) {
    const successResult = { success: true, data: { url: resolved.url, created: true } };
    if (!options?.silent) {
      addOutput(<Text color="green">Created: {filename}</Text>, 'success');
    }
    return successResult;
  }

  return {
    success: false,
    error: { code: 'OPERATION_FAILED', message: `touch: failed to create ${filename}: ${result.body}` }
  };
}
```

### Entity Commands Pattern

All entity commands (persona, contact, group) follow a similar pattern. Here's the unified template:

```typescript
import { findPersona, findContact, findGroup } from '../entity-lookup';

export const personaCommand: Command = {
  name: 'persona',
  description: 'Manage identity personas',
  usage: 'persona <subcommand> [args]',
  supportsJson: true,

  subcommands: {
    list: {
      description: 'List all personas',
      usage: 'persona list [--json]',
      execute: (args, context, options) => {
        const { store, addOutput } = context;
        const { options: cmdOptions } = parseCliArgs(args);
        const jsonMode = options?.json || hasJsonFlag(cmdOptions);

        const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
        const items = Object.entries(personas).map(([id, record]) => ({
          id,
          name: getPersonaName(record),
          isDefault: store.getValue('defaultPersonaId') === id,
        }));

        const result = { success: true, data: { count: items.length, items } };

        if (jsonMode) {
          addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        } else if (!options?.silent) {
          // Existing React rendering...
        }

        return result;
      },
    },

    create: {
      description: 'Create a new persona',
      usage: 'persona create <name> [--nickname=...] [--email=...]',
      execute: (args, context, options) => {
        // ... implementation
      },
    },

    show: {
      description: 'Show persona details',
      usage: 'persona show <id> [--full] [--json]',
      execute: (args, context, options) => {
        const { store, addOutput } = context;
        const { positional, options: cmdOptions } = parseCliArgs(args);
        const idArg = positional[0];

        if (!idArg) {
          return { success: false, error: { code: 'MISSING_ARGUMENT', message: 'persona show: missing id' } };
        }

        const lookup = findPersona(store, idArg);
        if (!lookup.found) {
          return { success: false, error: { code: 'ENTITY_NOT_FOUND', message: `Persona not found: ${idArg}` } };
        }

        const persona = store.getRow(STORE_TABLES.PERSONAS, lookup.id);
        // ... build result and output
      },
    },

    // ... other subcommands
  },

  execute: (args, context, options) => {
    const subcommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    if (!subcommand || subcommand === 'help') {
      context.addOutput(<Text>{personaCommand.usage}</Text>);
      return { success: true };
    }

    const handler = personaCommand.subcommands?.[subcommand];
    if (!handler) {
      return {
        success: false,
        error: { code: 'UNKNOWN_SUBCOMMAND', message: `persona: unknown subcommand: ${subcommand}` }
      };
    }

    return handler.execute(subArgs, context, options);
  },
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

1. **Create shared utilities:**
   - [ ] `src/cli/path.ts` - Path resolution and validation
   - [ ] `src/cli/entity-lookup.ts` - Entity lookup functions
   - [ ] `src/cli/executor.ts` - Command executor

2. **Enhance types:**
   - [ ] Add `CommandResult` interface to `types.ts`
   - [ ] Add `CommandError` and error codes
   - [ ] Add `CommandOptions` interface
   - [ ] Add `supportsJson` to Command interface

3. **Enhance argument parsing:**
   - [ ] Add `hasJsonFlag()` helper
   - [ ] Add `getRequiredArg()` helper
   - [ ] Add `validateSubcommand()` helper

### Phase 2: Navigation Commands (Week 1)

4. **Migrate navigation commands:**
   - [ ] Update `pwd` with result type
   - [ ] Update `cd` to use centralized path module
   - [ ] Update `ls` with --json support

5. **Add tests:**
   - [ ] Path module unit tests
   - [ ] Navigation command tests

### Phase 3: File Commands (Week 2)

6. **Migrate file operation commands:**
   - [ ] Update `cat` with result type and --json
   - [ ] Update `touch` with --base64 support
   - [ ] Update `mkdir` with result type
   - [ ] Update `rm` with --recursive and --force

7. **Migrate file metadata commands:**
   - [ ] Update `file info` with --json
   - [ ] Update `file set-*` commands

### Phase 4: Entity Commands (Week 2-3)

8. **Migrate persona command:**
   - [ ] Use centralized `findPersona()`
   - [ ] Add --json to all subcommands
   - [ ] Standardize result types

9. **Migrate contact command:**
   - [ ] Use centralized `findContact()` and `findPersona()`
   - [ ] Add --json to all subcommands
   - [ ] Standardize result types

10. **Migrate group command:**
    - [ ] Use centralized `findGroup()` and `findContact()`
    - [ ] Add --json to all subcommands
    - [ ] Standardize result types

### Phase 5: Other Commands (Week 3)

11. **Migrate config commands:**
    - [ ] Add --json support
    - [ ] Standardize result types

12. **Migrate typeindex commands:**
    - [ ] Add --json support
    - [ ] Standardize result types

13. **Migrate data commands:**
    - [ ] Standardize export result
    - [ ] Plan import implementation

### Phase 6: UI Integration (Week 4)

14. **Create React hooks:**
    - [ ] `useCliExecutor` hook
    - [ ] `useCliContext` provider

15. **Update App.tsx:**
    - [ ] Replace direct pod calls with CLI executor
    - [ ] Wire up dialogs to command responses

16. **Integration tests:**
    - [ ] E2E tests for UI-CLI flow
    - [ ] Verify result consumption

---

## Appendix: Full Command Reference

### Commands with JSON Support

After unification, all commands marked with `supportsJson: true` will accept `--json` flag:

| Command | Subcommands with --json |
|---------|------------------------|
| `pwd` | (direct) |
| `ls` | (direct) |
| `cat` | (direct) |
| `touch` | (direct) |
| `mkdir` | (direct) |
| `rm` | (direct) |
| `file` | info |
| `persona` | list, show, create, edit, delete |
| `contact` | list, show, add, edit, delete, search |
| `group` | list, show, create, edit, delete, list-members |
| `config` | list, get, set, reset |
| `typeindex` | list, show |

### Error Codes Reference

| Code | Description | Commands |
|------|-------------|----------|
| `INVALID_PATH` | Path contains invalid characters | cd, ls, cat, touch, mkdir, rm |
| `PATH_NOT_FOUND` | Target path does not exist | cd, ls, cat, rm |
| `NOT_A_DIRECTORY` | Expected directory, got file | cd, ls, touch, mkdir |
| `NOT_A_FILE` | Expected file, got directory | cat |
| `ALREADY_EXISTS` | Resource already exists | touch, mkdir |
| `PARENT_NOT_FOUND` | Parent container missing | touch, mkdir |
| `DIRECTORY_NOT_EMPTY` | Cannot delete non-empty dir | rm |
| `ESCAPE_ATTEMPT` | Path tries to escape root | cd, ls, touch, mkdir, rm |
| `ENTITY_NOT_FOUND` | Persona/contact/group not found | persona, contact, group |
| `DUPLICATE_ENTITY` | Entity with same ID exists | persona create, contact add |
| `INVALID_ENTITY` | Entity data validation failed | persona, contact, group |
| `MISSING_ARGUMENT` | Required argument not provided | All commands |
| `INVALID_ARGUMENT` | Argument value is invalid | All commands |
| `UNKNOWN_SUBCOMMAND` | Subcommand not recognized | file, persona, contact, group, config, typeindex |
| `OPERATION_FAILED` | Operation failed unexpectedly | All async commands |
| `NOT_SUPPORTED` | Feature not supported in env | import (browser), exit (browser) |
| `PERMISSION_DENIED` | Operation not allowed | rm (root), future ACL |
