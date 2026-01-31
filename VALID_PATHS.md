# Path Integrity and UI-CLI Unification Plan

This document outlines the plan for ensuring file/folder path validity at the CLI level and mapping all UI operations through the CLI command structure.

---

## Section 1: Ensuring Path Integrity

### Current State

Path handling is currently fragmented:
- `resolvePath()` is duplicated in `navigation.tsx`, `files.tsx`, and `file.tsx`
- `makeChildUrl()` in `App.tsx` has different validation rules
- No centralized path normalization or validation layer
- URL encoding applied inconsistently (UI encodes, CLI does not)

### Goals

1. **Single source of truth** for path resolution and validation
2. **Consistent validation** across all entry points (CLI, UI, programmatic)
3. **Prevent invalid states** in the store (malformed URLs, orphaned resources)
4. **Clear error messages** when path operations fail

### Path Validation Requirements

| Rule | Description | Current Status |
|------|-------------|----------------|
| No forward slashes in names | Filenames/folder names cannot contain `/` | UI only |
| Valid URL characters | Names must be URL-encodable | Implicit |
| No escape beyond baseUrl | `../` cannot traverse above root | CLI only |
| Parent must exist | Cannot create resource in non-existent container | VirtualPod only |
| Container trailing slash | Containers must end with `/` | Inconsistent |
| No empty names | Whitespace-only names rejected | UI only |
| Length limits | Reasonable limits on path segment length | None |

### Proposed Architecture

#### 1. Create `src/cli/path.ts` - Centralized Path Module

```typescript
// Types
interface PathResult {
  valid: true;
  url: string;        // Fully resolved, normalized URL
  isContainer: boolean;
}

interface PathError {
  valid: false;
  error: string;      // Human-readable error message
  code: PathErrorCode;
}

type PathErrorCode =
  | 'EMPTY_NAME'
  | 'INVALID_CHARACTERS'
  | 'SLASH_IN_NAME'
  | 'ESCAPE_ATTEMPT'
  | 'TOO_LONG'
  | 'INVALID_URL';

type ResolveResult = PathResult | PathError;

// Core Functions
export function resolvePath(
  currentUrl: string,
  path: string,
  baseUrl: string
): ResolveResult;

export function validateName(name: string): PathError | null;

export function ensureTrailingSlash(url: string): string;
export function removeTrailingSlash(url: string): string;

export function getParentUrl(url: string, baseUrl: string): string;
export function getSegments(url: string, baseUrl: string): string[];
export function decodeSegment(segment: string): string;
export function encodeSegment(name: string): string;

export function isContainer(url: string): boolean; // Based on trailing slash
export function isDescendantOf(url: string, ancestorUrl: string): boolean;
```

#### 2. Path Resolution Algorithm (Enhanced)

```typescript
export function resolvePath(
  currentUrl: string,
  inputPath: string,
  baseUrl: string
): ResolveResult {
  const path = inputPath.trim();

  // Empty path returns current
  if (!path || path === '.') {
    return { valid: true, url: currentUrl, isContainer: currentUrl.endsWith('/') };
  }

  // Absolute path: starts with /
  if (path.startsWith('/')) {
    const relativePart = path.slice(1);
    return resolveRelative(baseUrl, relativePart, baseUrl);
  }

  // Parent traversal
  if (path === '..' || path === '../') {
    const parent = getParentUrl(currentUrl, baseUrl);
    return { valid: true, url: parent, isContainer: true };
  }

  // Complex path with segments
  return resolveRelative(currentUrl, path, baseUrl);
}

function resolveRelative(
  base: string,
  path: string,
  rootUrl: string
): ResolveResult {
  // Split into segments
  const segments = path.split('/').filter(s => s && s !== '.');
  const trailingSlash = path.endsWith('/');

  let current = ensureTrailingSlash(base);

  for (const segment of segments) {
    if (segment === '..') {
      current = getParentUrl(current, rootUrl);
    } else {
      // Validate segment name
      const decoded = decodeURIComponent(segment);
      const error = validateName(decoded);
      if (error) return error;

      // Encode and append
      current = current + encodeSegment(decoded) + '/';
    }
  }

  // Check escape attempt
  if (!current.startsWith(rootUrl)) {
    return { valid: false, error: 'Path escapes root directory', code: 'ESCAPE_ATTEMPT' };
  }

  // Remove trailing slash if not meant to be container
  if (!trailingSlash && segments.length > 0) {
    current = removeTrailingSlash(current);
  }

  return { valid: true, url: current, isContainer: current.endsWith('/') };
}
```

#### 3. Name Validation Rules

```typescript
const MAX_SEGMENT_LENGTH = 255;
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f]/; // Control characters

export function validateName(name: string): PathError | null {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name cannot be empty', code: 'EMPTY_NAME' };
  }

  if (name.includes('/')) {
    return { valid: false, error: 'Name cannot contain forward slash', code: 'SLASH_IN_NAME' };
  }

  if (name.length > MAX_SEGMENT_LENGTH) {
    return { valid: false, error: `Name too long (max ${MAX_SEGMENT_LENGTH} chars)`, code: 'TOO_LONG' };
  }

  if (FORBIDDEN_CHARS.test(name)) {
    return { valid: false, error: 'Name contains invalid control characters', code: 'INVALID_CHARACTERS' };
  }

  return null; // Valid
}
```

#### 4. Migration Steps

1. **Create `src/cli/path.ts`** with all path functions
2. **Update commands** to import from centralized module:
   - `navigation.tsx` - cd, ls, pwd
   - `files.tsx` - touch, mkdir, rm, cat
   - `file.tsx` - file info/set-*
3. **Update `App.tsx`** to use same functions (remove `makeChildUrl`)
4. **Add unit tests** for path module
5. **Update VirtualPod** to validate paths before operations

### Store Integrity Checks

#### Pre-operation Validation (VirtualPod)

```typescript
async handleRequest(url: string, options?: RequestOptions): Promise<RequestResult> {
  // Normalize URL before any operation
  const normalized = normalizeUrl(url);
  if (!normalized.valid) {
    return { status: 400, body: normalized.error };
  }

  // Validate within baseUrl
  if (!normalized.url.startsWith(this.baseUrl)) {
    return { status: 403, body: 'Access denied: path outside pod' };
  }

  // Continue with operation...
}
```

#### Index Consistency

The `byParent` index must always reflect correct parent-child relationships:

```typescript
// When creating a resource, parentId MUST be set correctly
const parentUrl = isContainer
  ? new URL('..', url).href
  : new URL('.', url).href;

// Validate parent exists
if (!this.store.hasRow(RESOURCES_TABLE, parentUrl)) {
  return { status: 409, body: 'Parent container does not exist' };
}
```

---

## Section 2: UI Operations to CLI Mapping

### Current State

UI operations bypass CLI entirely:
- File creation: `pod.handleRequest(url, { method: 'PUT', ... })`
- Folder creation: `pod.handleRequest(url, { method: 'PUT', ... })`
- File deletion: `pod.handleRequest(url, { method: 'DELETE' })`
- Navigation: Direct `setCurrentUrl()` state updates

This creates:
- Inconsistent validation paths
- No single audit trail
- Different error handling
- Duplicated logic

### Goals

1. **Single command interface** for all operations
2. **Consistent validation** through CLI layer
3. **Unified response handling** pattern
4. **Support both interactive and programmatic use**

### Command Interface Design

#### Core Command Executor

```typescript
// src/cli/executor.ts

interface CommandResult {
  success: boolean;
  data?: unknown;           // Structured result data
  message?: string;         // Human-readable message
  error?: {
    code: string;
    message: string;
  };
}

interface ExecuteOptions {
  silent?: boolean;         // Suppress output (for programmatic use)
  rawOutput?: boolean;      // Return structured data instead of rendering
}

export async function executeCommand(
  commandLine: string,
  context: CliContext,
  options?: ExecuteOptions
): Promise<CommandResult>;

// Typed command helpers for UI
export async function exec(
  command: string,
  args: string[],
  context: CliContext,
  options?: ExecuteOptions
): Promise<CommandResult>;
```

#### UI Integration Hook

```typescript
// src/hooks/useCliExecutor.ts

export function useCliExecutor() {
  const context = useCliContext();

  return {
    // File operations
    createFile: (name: string, content?: string, contentType?: string) =>
      exec('touch', [name, ...(content ? ['--content', content] : []), ...(contentType ? ['--type', contentType] : [])], context, { silent: true }),

    createFolder: (name: string) =>
      exec('mkdir', [name], context, { silent: true }),

    deleteResource: (path: string) =>
      exec('rm', [path], context, { silent: true }),

    readFile: (path: string) =>
      exec('cat', [path], context, { silent: true, rawOutput: true }),

    // Navigation
    navigate: (path: string) =>
      exec('cd', [path], context, { silent: true }),

    listDirectory: (path?: string) =>
      exec('ls', path ? [path] : [], context, { silent: true, rawOutput: true }),

    // Metadata
    setTitle: (path: string, title: string) =>
      exec('file', ['set-title', path, title], context, { silent: true }),

    setDescription: (path: string, description: string) =>
      exec('file', ['set-description', path, description], context, { silent: true }),

    setAuthor: (path: string, persona: string) =>
      exec('file', ['set-author', path, persona], context, { silent: true }),

    getInfo: (path: string) =>
      exec('file', ['info', path], context, { silent: true, rawOutput: true }),
  };
}
```

### UI-to-CLI Operation Mapping

| UI Operation | CLI Command | Arguments | Response Handling |
|--------------|-------------|-----------|-------------------|
| Create file | `touch` | `<name> [--content <text>] [--type <mime>]` | Check success, show error toast |
| Create folder | `mkdir` | `<name>` | Check success, show error toast |
| Delete file/folder | `rm` | `<path>` | Confirm dialog, check success |
| Navigate to folder | `cd` | `<path>` | Update currentUrl on success |
| List contents | `ls` | `[path] [--json]` | Parse children array |
| Read file | `cat` | `<path>` | Return body content |
| Upload image | `touch` | `<name> --content <base64> --type <mime>` | Show progress, check success |
| Set title | `file set-title` | `<path> <title>` | Check success |
| Set description | `file set-description` | `<path> <description>` | Check success |
| Set author | `file set-author` | `<path> <persona>` | Check success |
| View metadata | `file info` | `<path> [--json]` | Parse metadata object |

### Command Enhancements Required

#### 1. Add `--json` Output Mode

All commands should support structured output for programmatic use:

```typescript
// In command implementation
if (options.json) {
  return {
    success: true,
    data: {
      url: resolvedUrl,
      type: 'Container',
      children: [...],
    }
  };
}
```

#### 2. Enhanced `touch` Command

```
touch <filename> [options]

Options:
  --content, -c <text>     File content (plain text or base64)
  --type, -t <mime>        Content-Type (default: text/plain)
  --base64                 Interpret content as base64-encoded
  --json                   Output result as JSON

Examples:
  touch notes.txt
  touch readme.md --content "# Hello"
  touch image.png --content "<base64>" --type image/png --base64
```

#### 3. Enhanced `rm` Command

```
rm <path> [options]

Options:
  --recursive, -r          Delete non-empty containers
  --force, -f              Skip confirmation
  --json                   Output result as JSON

Examples:
  rm notes.txt
  rm old-folder/ -r
```

#### 4. Enhanced `ls` Command

```
ls [path] [options]

Options:
  --long, -l               Show detailed info (type, size, modified)
  --json                   Output as JSON array
  --all, -a                Include hidden files

Examples:
  ls
  ls /documents --json
  ls -l
```

### Response Handling Pattern

#### Standard Response Structure

```typescript
interface CommandResponse {
  success: boolean;

  // On success
  data?: {
    url?: string;
    urls?: string[];
    content?: string;
    metadata?: Record<string, unknown>;
    children?: ResourceInfo[];
  };
  message?: string;

  // On failure
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

type ErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PARENT_NOT_FOUND'
  | 'NOT_EMPTY'
  | 'INVALID_PATH'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';
```

#### UI Response Handler

```typescript
// src/hooks/useCommandHandler.ts

export function useCommandHandler() {
  const showToast = useToast();

  return async function handleCommand<T>(
    operation: () => Promise<CommandResult>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: CommandError) => void;
    }
  ): Promise<T | null> {
    try {
      const result = await operation();

      if (result.success) {
        if (options?.successMessage) {
          showToast({ type: 'success', message: options.successMessage });
        }
        options?.onSuccess?.(result.data as T);
        return result.data as T;
      } else {
        const message = options?.errorMessage || result.error?.message || 'Operation failed';
        showToast({ type: 'error', message });
        options?.onError?.(result.error);
        return null;
      }
    } catch (e) {
      showToast({ type: 'error', message: 'Unexpected error' });
      return null;
    }
  };
}
```

### Implementation Plan

#### Phase 1: Command Layer Enhancement

1. **Add `CommandResult` type** to `src/cli/types.ts`
2. **Create `src/cli/executor.ts`** with enhanced execute function
3. **Add `--json` flag support** to registry parsing
4. **Update commands** to return structured results:
   - `ls` - return children array
   - `cat` - return content and metadata
   - `touch` - return created URL
   - `mkdir` - return created URL
   - `rm` - return deleted URL
   - `file info` - return metadata object

#### Phase 2: UI Integration

5. **Create `src/hooks/useCliExecutor.ts`**
6. **Create `src/hooks/useCommandHandler.ts`**
7. **Create `src/context/CliContext.tsx`** for shared context
8. **Update `App.tsx`**:
   - Replace direct `pod.handleRequest()` calls with hook methods
   - Use `navigate()` instead of direct `setCurrentUrl()`
   - Wire up dialogs to use command responses

#### Phase 3: Validation Unification

9. **Integrate `src/cli/path.ts`** into command executor
10. **Remove duplicate validation** from App.tsx
11. **Add path validation** to VirtualPod as safety net

### Example: Migrated File Creation

**Before (App.tsx):**
```typescript
const handleCreateFile = async () => {
  const name = fileName.trim();
  if (!name) return;
  const url = makeChildUrl(currentUrl, name, false);
  if (!url) {
    alert('Invalid filename');
    return;
  }
  const result = await pod.handleRequest(url, {
    method: 'PUT',
    body: '',
    headers: { 'Content-Type': 'text/plain' }
  });
  if (result.status >= 400) {
    alert(result.body || 'Failed to create file');
  }
  setShowNewFileDialog(false);
};
```

**After (App.tsx):**
```typescript
const { createFile } = useCliExecutor();
const handle = useCommandHandler();

const handleCreateFile = async () => {
  const name = fileName.trim();
  if (!name) return;

  await handle(
    () => createFile(name, '', 'text/plain'),
    {
      successMessage: `Created ${name}`,
      onSuccess: () => setShowNewFileDialog(false),
    }
  );
};
```

### Benefits

1. **Consistency**: Same validation and execution path for CLI and UI
2. **Testability**: Commands can be unit tested independently
3. **Debugging**: Single place to add logging/tracing
4. **Extensibility**: New operations added once, available everywhere
5. **Error handling**: Unified error codes and messages
6. **Scripting**: Commands can be composed and batched

---

## Appendix: Command Reference

### File System Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `pwd` | Print current directory | None |
| `cd <path>` | Change directory | `<path>` - relative or absolute |
| `ls [path]` | List directory contents | `[path]`, `--json`, `-l` |
| `cat <file>` | Display file contents | `<file>`, `--json` |
| `touch <name>` | Create file | `<name>`, `--content`, `--type`, `--base64` |
| `mkdir <name>` | Create folder | `<name>` |
| `rm <path>` | Delete file/folder | `<path>`, `-r`, `-f` |

### Metadata Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `file info <path>` | Show file metadata | `<path>`, `--json` |
| `file set-title <path> <title>` | Set title | `<path>`, `<title>` |
| `file set-description <path> <desc>` | Set description | `<path>`, `<description>` |
| `file set-author <path> <persona>` | Set author | `<path>`, `<persona-id-or-name>` |

### Data Entity Commands

| Command | Description |
|---------|-------------|
| `persona list` | List all personas |
| `persona create` | Create new persona |
| `persona show <id>` | Show persona details |
| `contact list` | List all contacts |
| `contact create` | Create new contact |
| `group list` | List all groups |
| `group create` | Create new group |
