# Browser-Based CLI Infrastructure Handoff Document

This document describes the architecture and implementation patterns for building a browser-based CLI with TinyBase persistence. The system supports both terminal (Node.js) and web (browser) execution contexts using shared command definitions.

---

## Architecture Overview

The CLI system runs in two execution contexts that share common command definitions:

| Context | Runtime | Persistence | UI Library |
|---------|---------|-------------|------------|
| Terminal CLI | Node.js | File-based JSON (`~/.appname/data/store.json`) | [Ink](https://github.com/vadimdemedes/ink) |
| Browser CLI | Browser | LocalStorage | [ink-web](https://github.com/nicktomlin/ink-web) |

Both use:
- **TinyBase** for state management (MergeableStore)
- **Zod** for schema validation
- **React** for rendering output
- **Shared command definitions** for identical behavior

---

## Directory Structure

```
src/
├── cli/                                 # Terminal CLI (Node.js + Ink)
│   ├── index.tsx                       # Entry point (TTY detection)
│   ├── cli-app.tsx                     # Interactive mode component
│   ├── cli-runner.tsx                  # Non-interactive single-command runner
│   └── tb-cli-store.ts                 # File-based store initialization
│
├── shared/cli/                         # Shared across both environments
│   ├── commands/
│   │   ├── index.tsx                   # Command registry & dispatcher
│   │   ├── types.ts                    # Command & CliContext interfaces
│   │   ├── [command].tsx               # Individual command implementations
│   │   └── utils/
│   │       └── parse-args.ts           # CLI argument parsing
│   │
│   ├── components/                     # Interactive UI components
│   │   ├── interactive-prompt.tsx      # Reusable input/menu primitives
│   │   └── [entity]-[action]-interactive.tsx  # Multi-step wizards
│   │
│   └── use-cli-input.ts               # History & tab-completion hook
│
├── pages/cli/
│   └── cli-terminal.tsx               # Web-based CLI component
│
└── data/
    ├── providers/
    │   └── TbAppStoreProvider.tsx     # React context for TinyBase
    │
    └── tinybase/app-store/
        ├── tb-app-store.ts            # Store factory & persister setup
        ├── tb-app-store-schema.ts     # Table names & schema constants
        ├── tb-app-schemas.ts          # Zod validation schemas
        ├── tb-app-data-access.ts      # CRUD operations
        ├── tb-app-settings.ts         # App-level settings (key-value)
        └── tb-app-store-cli.ts        # CLI file persister setup
```

---

## Core Interfaces

### Command Definition

```typescript
// src/shared/cli/commands/types.ts
interface Command {
  name: string;                          // e.g., "user"
  description: string;                   // e.g., "User management commands"
  usage: string;                         // e.g., "user <subcommand> [args]"
  execute: (args: string[], context: CliContext) => void | Promise<void>;
}
```

### CLI Context

Commands receive a context object with:

```typescript
interface CliContext {
  // Core (both environments)
  addOutput: (node: ReactNode) => void;   // Render output
  clearOutput: () => void;                // Clear terminal
  commands: Record<string, Command>;      // Command registry
  setBusy: (busy: boolean) => void;       // Disable input during async

  // TinyBase store
  store?: Store;                          // MergeableStore instance
  saveStore?: () => Promise<void>;        // Persist to storage

  // Terminal-only
  exit?: () => void;                      // Exit CLI

  // Web-only (pass from parent component)
  user?: UserType;                        // Current user
  projects?: ProjectType[];               // Available projects
}
```

---

## TinyBase Store Setup

### Schema Definition with Zod

```typescript
// src/data/tinybase/app-store/tb-app-schemas.ts
import { z } from 'zod';

export const TbUserSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  createdAtIso: z.string(),
});

export type TbUser = z.infer<typeof TbUserSchema>;

// Define all table schemas
export const TB_APP_ZOD_SCHEMAS = {
  users: TbUserSchema,
  projects: TbProjectSchema,
  // ... other tables
};
```

### Store Factory

```typescript
// src/data/tinybase/app-store/tb-app-store.ts
import { createMergeableStore, MergeableStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { createZodSchematizer } from '@tinybase-ts-react/zod-schematizer';

export const APP_STORE_ID = 'my-app-store-v1';

const schematizer = createZodSchematizer();
const TB_APP_TABLES_SCHEMA = schematizer.toTablesSchema(TB_APP_ZOD_SCHEMAS);

export const createAppStore = (): MergeableStore => {
  return createMergeableStore().setTablesSchema(TB_APP_TABLES_SCHEMA);
};

// Browser persister (LocalStorage)
export const createBrowserAppPersister = (store: MergeableStore) => {
  return createLocalPersister(store, APP_STORE_ID);
};
```

### CLI File Persister

```typescript
// src/data/tinybase/app-store/tb-app-store-cli.ts
import { createFilePersister } from 'tinybase/persisters/persister-file';
import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const getCliDataDir = () => join(homedir(), '.myapp', 'data');
export const getCliStorePath = () => join(getCliDataDir(), 'app-store.json');

export const createCliAppPersister = (store: MergeableStore) => {
  return createFilePersister(store, getCliStorePath());
};
```

### Data Access Layer

```typescript
// src/data/tinybase/app-store/tb-app-data-access.ts
import { Store } from 'tinybase';

const TB_USERS_TABLE = 'users';

// Helper to find row by ID field
const findRowById = (store: Store, table: string, id: string): string | null => {
  const rowIds = store.getRowIds(table);
  for (const rowId of rowIds) {
    const row = store.getRow(table, rowId);
    if (row?.id === id) return rowId;
  }
  return null;
};

// CRUD operations
export const tbAddUser = (store: Store, user: TbUser): string | undefined => {
  TbUserSchema.parse(user);  // Validate before insert
  return store.addRow(TB_USERS_TABLE, user);
};

export const tbGetUser = (store: Store, id: string): TbUser | null => {
  const rowId = findRowById(store, TB_USERS_TABLE, id);
  if (!rowId) return null;
  return store.getRow(TB_USERS_TABLE, rowId) as TbUser;
};

export const tbGetAllUsers = (store: Store): TbUser[] => {
  const rowIds = store.getRowIds(TB_USERS_TABLE);
  return rowIds.map(rowId => store.getRow(TB_USERS_TABLE, rowId) as TbUser);
};

export const tbUpdateUser = (store: Store, user: TbUser): void => {
  const rowId = findRowById(store, TB_USERS_TABLE, user.id);
  if (!rowId) throw new Error('User not found');
  TbUserSchema.parse(user);
  store.setRow(TB_USERS_TABLE, rowId, user);
};

export const tbDeleteUser = (store: Store, id: string): void => {
  const rowId = findRowById(store, TB_USERS_TABLE, id);
  if (rowId) store.delRow(TB_USERS_TABLE, rowId);
};
```

### App Settings (Key-Value Store)

```typescript
// src/data/tinybase/app-store/tb-app-settings.ts
export const APP_SETTING_ACTIVE_USER_ID = 'app-active-user-id';

export const tbGetActiveUserId = (store: Store): string | undefined => {
  return store.getValue(APP_SETTING_ACTIVE_USER_ID) as string | undefined;
};

export const tbSetActiveUserId = (store: Store, userId: string): void => {
  store.setValue(APP_SETTING_ACTIVE_USER_ID, userId);
};
```

---

## Command Registry & Dispatcher

```typescript
// src/shared/cli/commands/index.tsx
import { Command, CliContext } from './types';
import { helpCommand } from './help';
import { userCommand } from './user';
// ... other imports

export const commands: Record<string, Command> = {
  help: helpCommand,
  user: userCommand,
  clear: clearCommand,
  exit: exitCommand,
  // ... other commands
};

export const executeCommand = (
  input: string,
  context: CliContext
): void | Promise<void> => {
  const trimmed = input.trim();
  if (!trimmed) return;

  const [cmdName, ...args] = trimmed.split(/\s+/);
  const command = commands[cmdName.toLowerCase()];

  if (!command) {
    context.addOutput(<Text color="red">Unknown command: {cmdName}</Text>);
    return;
  }

  try {
    const result = command.execute(args, context);
    if (result instanceof Promise) {
      return result.catch((err) => {
        context.addOutput(<Text color="red">Error: {err.message}</Text>);
      });
    }
  } catch (err) {
    context.addOutput(<Text color="red">Error: {err.message}</Text>);
  }
};
```

---

## Argument Parsing Utilities

```typescript
// src/shared/cli/commands/utils/parse-args.ts
export interface ParsedArgs {
  positional: string[];
  options: Record<string, string | boolean>;
}

export const parseCliArgs = (args: string[]): ParsedArgs => {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long option: --name=value or --flag
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options[key] = value;
      } else {
        const key = arg.slice(2);
        // Check if next arg is the value
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i];
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short option: -f
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
    i++;
  }

  return { positional, options };
};

export const getOptionString = (
  options: Record<string, string | boolean>,
  key: string
): string | undefined => {
  const value = options[key];
  return typeof value === 'string' ? value : undefined;
};

export const getOptionBoolean = (
  options: Record<string, string | boolean>,
  key: string
): boolean => {
  return options[key] === true || options[key] === 'true';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
```

---

## Command Patterns

### Pattern 1: Simple Output

```typescript
export const echoCommand: Command = {
  name: 'echo',
  description: 'Echo text back',
  usage: 'echo <text>',
  execute: (args, context) => {
    context.addOutput(<Text>{args.join(' ')}</Text>);
  },
};
```

### Pattern 2: Data Query

```typescript
const userListCommand: Command = {
  name: 'list',
  description: 'List all users',
  usage: 'user list',
  execute: (_args, context) => {
    const { store } = context;
    if (!store) {
      context.addOutput(<Text color="red">Store not available</Text>);
      return;
    }

    const users = tbGetAllUsers(store);
    const activeUserId = tbGetActiveUserId(store);

    context.addOutput(
      <Box flexDirection="column">
        <Text color="green" bold>Users ({users.length}):</Text>
        {users.map((user) => (
          <Box key={user.id}>
            <Text color="cyan">{user.handle}</Text>
            {user.id === activeUserId && <Text color="yellow"> [active]</Text>}
          </Box>
        ))}
      </Box>
    );
  },
};
```

### Pattern 3: Create with Arguments

```typescript
const userAddCommand: Command = {
  name: 'add',
  description: 'Add a new user',
  usage: 'user add <handle> [--name=<name>] [--email=<email>]',
  execute: async (args, context) => {
    const { store, saveStore } = context;
    const { positional, options } = parseCliArgs(args);
    const handle = positional[0];

    if (!handle) {
      // Enter interactive mode (see Pattern 4)
      return enterInteractiveMode(context);
    }

    // Validate handle uniqueness
    const existing = tbGetUserByHandle(store, handle);
    if (existing) {
      context.addOutput(<Text color="red">Handle already exists</Text>);
      return;
    }

    const user: TbUser = {
      id: generateId(),
      handle,
      name: getOptionString(options, 'name') ?? null,
      email: getOptionString(options, 'email') ?? null,
      createdAtIso: new Date().toISOString(),
    };

    tbAddUser(store, user);
    if (saveStore) await saveStore();

    context.addOutput(<Text color="green">User created: {user.handle}</Text>);
  },
};
```

### Pattern 4: Interactive Mode

```typescript
const enterInteractiveMode = (context: CliContext): Promise<void> => {
  return new Promise<void>((resolve) => {
    context.setBusy?.(true);
    context.addOutput(
      <UserAddInteractive
        store={context.store}
        saveStore={context.saveStore}
        onComplete={() => {
          context.setBusy?.(false);
          resolve();
        }}
      />
    );
  });
};
```

### Pattern 5: Subcommand Dispatcher

```typescript
export const userCommand: Command = {
  name: 'user',
  description: 'User management commands',
  usage: 'user <subcommand> [args]',
  execute: async (args, context) => {
    const subcommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'add':
        return userAddCommand.execute(subArgs, context);
      case 'list':
        return userListCommand.execute(subArgs, context);
      case 'delete':
        return userDeleteCommand.execute(subArgs, context);
      case 'update':
        return userUpdateCommand.execute(subArgs, context);
      default:
        context.addOutput(
          <Box flexDirection="column">
            <Text color="yellow">Usage: {userCommand.usage}</Text>
            <Text>Subcommands: add, list, delete, update</Text>
          </Box>
        );
    }
  },
};
```

---

## Interactive Components

### Reusable Primitives

```typescript
// src/shared/cli/components/interactive-prompt.tsx
import { Box, Text, useInput } from 'ink';  // or ink-web
import { useState } from 'react';

interface MenuOption {
  key: string;
  label: string;
  value: string;
}

interface InteractiveMenuProps {
  title: string;
  options: MenuOption[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}

export const InteractiveMenu = ({
  title, options, onSelect, onCancel
}: InteractiveMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSelect(options[selectedIndex].value);
    } else if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => Math.min(options.length - 1, i + 1));
    } else if (input >= '1' && input <= '9') {
      const idx = parseInt(input) - 1;
      if (idx < options.length) onSelect(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>{title}</Text>
      {options.map((opt, i) => (
        <Text key={opt.key} color={i === selectedIndex ? 'green' : undefined}>
          {i === selectedIndex ? '> ' : '  '}{i + 1}. {opt.label}
        </Text>
      ))}
      <Text dimColor>↑/↓ to navigate, Enter to select, Esc to cancel</Text>
    </Box>
  );
};

interface InteractiveInputProps {
  prompt: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const InteractiveInput = ({
  prompt, initialValue = '', onSubmit, onCancel
}: InteractiveInputProps) => {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit(value);
    } else if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setValue(v => v + input);
    }
  });

  return (
    <Box>
      <Text color="cyan">{prompt} </Text>
      <Text>{value}</Text>
      <Text inverse> </Text>
    </Box>
  );
};
```

### Multi-Step Wizard Pattern

```typescript
// src/shared/cli/components/user-add-interactive.tsx
type Step = 'handle' | 'name' | 'email' | 'done' | 'cancelled';

interface Props {
  store?: Store;
  saveStore?: () => Promise<void>;
  onComplete: () => void;
}

export const UserAddInteractive = ({ store, saveStore, onComplete }: Props) => {
  const [step, setStep] = useState<Step>('handle');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleCancel = () => {
    setStep('cancelled');
    onComplete();
  };

  const handleHandleSubmit = (value: string) => {
    if (!value.trim()) {
      setError('Handle is required');
      return;
    }
    if (store && tbGetUserByHandle(store, value)) {
      setError('Handle already exists');
      return;
    }
    setHandle(value);
    setError('');
    setStep('name');
  };

  const handleNameSubmit = (value: string) => {
    setName(value);
    setStep('email');
  };

  const handleEmailSubmit = async (value: string) => {
    setEmail(value);

    // Create user
    if (store) {
      const user: TbUser = {
        id: generateId(),
        handle,
        name: name || null,
        email: value || null,
        createdAtIso: new Date().toISOString(),
      };
      tbAddUser(store, user);
      if (saveStore) await saveStore();
    }

    setStep('done');
    onComplete();
  };

  if (step === 'cancelled') {
    return <Text color="yellow">Cancelled</Text>;
  }

  if (step === 'done') {
    return <Text color="green">User "{handle}" created!</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="green" bold>Add New User</Text>
      {error && <Text color="red">{error}</Text>}

      {step === 'handle' && (
        <InteractiveInput
          prompt="Handle (required):"
          onSubmit={handleHandleSubmit}
          onCancel={handleCancel}
        />
      )}

      {step === 'name' && (
        <InteractiveInput
          prompt="Name (optional, Enter to skip):"
          onSubmit={handleNameSubmit}
          onCancel={handleCancel}
        />
      )}

      {step === 'email' && (
        <InteractiveInput
          prompt="Email (optional, Enter to skip):"
          onSubmit={handleEmailSubmit}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
};
```

---

## CLI Input Hook

```typescript
// src/shared/cli/use-cli-input.ts
interface UseCliInputOptions {
  commandNames: string[];
  maxHistory?: number;
}

export const useCliInput = ({
  commandNames,
  maxHistory = 100
}: UseCliInputOptions) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInput = useRef('');

  const addToHistory = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setHistory(prev => {
      if (prev[prev.length - 1] === trimmed) return prev;
      const newHistory = [...prev, trimmed];
      return newHistory.slice(-maxHistory);
    });
    setHistoryIndex(-1);
    savedInput.current = '';
  }, [maxHistory]);

  const handleHistoryUp = useCallback(() => {
    if (history.length === 0) return;

    if (historyIndex === -1) {
      savedInput.current = input;
      setHistoryIndex(history.length - 1);
      setInput(history[history.length - 1]);
    } else if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setInput(history[historyIndex - 1]);
    }
  }, [history, historyIndex, input]);

  const handleHistoryDown = useCallback(() => {
    if (historyIndex === -1) return;

    if (historyIndex < history.length - 1) {
      setHistoryIndex(i => i + 1);
      setInput(history[historyIndex + 1]);
    } else {
      setHistoryIndex(-1);
      setInput(savedInput.current);
    }
  }, [history, historyIndex]);

  const handleTab = useCallback(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed.includes(' ')) return;

    const matches = commandNames.filter(name =>
      name.toLowerCase().startsWith(trimmed)
    );

    if (matches.length === 1) {
      setInput(matches[0] + ' ');
    }
  }, [input, commandNames]);

  const clearInput = useCallback(() => {
    setInput('');
    setHistoryIndex(-1);
  }, []);

  return {
    input,
    setInput,
    history,
    handleHistoryUp,
    handleHistoryDown,
    handleTab,
    addToHistory,
    clearInput,
  };
};
```

---

## Terminal CLI Implementation

### Entry Point

```typescript
// src/cli/index.tsx
import { render } from 'ink';
import { CliApp } from './cli-app';
import { CliRunner } from './cli-runner';

const args = process.argv.slice(2);

if (args.length > 0) {
  // Non-interactive: run single command
  render(<CliRunner command={args.join(' ')} />);
} else if (!process.stdin.isTTY) {
  console.error('This CLI requires an interactive terminal');
  process.exit(1);
} else {
  // Interactive mode
  render(<CliApp />);
}
```

### Store Initialization

```typescript
// src/cli/tb-cli-store.ts
import { mkdirSync } from 'fs';

export interface TbCliStore {
  store: MergeableStore;
  persister: FilePersister;
  save: () => Promise<FilePersister>;
}

export const initTbCliStore = async (): Promise<TbCliStore> => {
  mkdirSync(getCliDataDir(), { recursive: true });

  const store = createAppStore();
  const persister = createCliAppPersister(store);

  await persister.load();

  return {
    store,
    persister,
    save: () => persister.save(),
  };
};
```

### Interactive Mode Component

```typescript
// src/cli/cli-app.tsx
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { useState, useEffect } from 'react';
import { commands, executeCommand } from '../shared/cli/commands';
import { useCliInput } from '../shared/cli/use-cli-input';
import { initTbCliStore, TbCliStore } from './tb-cli-store';

export const CliApp = () => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [output, setOutput] = useState<Array<{ id: number; content: ReactNode }>>([
    { id: 0, content: <Text>Welcome to the CLI. Type "help" for commands.</Text> }
  ]);
  const [busy, setBusy] = useState(false);
  const [tbStore, setTbStore] = useState<TbCliStore | null>(null);
  const outputIdRef = useRef(1);

  const commandNames = Object.keys(commands);
  const { input, setInput, handleHistoryUp, handleHistoryDown, handleTab, addToHistory, clearInput } =
    useCliInput({ commandNames });

  // Initialize store
  useEffect(() => {
    initTbCliStore()
      .then(setTbStore)
      .catch(err => {
        addOutput(<Text color="red">Failed to load store: {err.message}</Text>);
      });
  }, []);

  const addOutput = (content: ReactNode) => {
    setOutput(prev => [...prev, { id: outputIdRef.current++, content }]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const context: CliContext = {
    addOutput,
    clearOutput,
    commands,
    setBusy,
    exit,
    store: tbStore?.store,
    saveStore: () => tbStore?.save() ?? Promise.resolve(),
  };

  useInput((char, key) => {
    if (busy || !tbStore) return;

    if (key.return) {
      addOutput(<Text dimColor>$ {input}</Text>);
      addToHistory(input);

      const result = executeCommand(input, context);
      if (result instanceof Promise) {
        setBusy(true);
        result.finally(() => {
          setBusy(false);
          clearInput();
        });
      } else {
        clearInput();
      }
    } else if (key.upArrow) {
      handleHistoryUp();
    } else if (key.downArrow) {
      handleHistoryDown();
    } else if (key.tab) {
      handleTab();
    } else if (key.backspace || key.delete) {
      setInput(input.slice(0, -1));
    } else if (key.escape) {
      exit();
    } else if (char && !key.ctrl && !key.meta) {
      setInput(input + char);
    }
  }, { isActive: isRawModeSupported });

  return (
    <Box flexDirection="column" padding={1}>
      {output.map(entry => (
        <Box key={entry.id}>{entry.content}</Box>
      ))}
      {!busy && (
        <Box>
          <Text color="green">$ </Text>
          <Text>{input}</Text>
          <Text inverse> </Text>
        </Box>
      )}
    </Box>
  );
};
```

---

## Browser CLI Implementation

### Store Provider

```typescript
// src/data/providers/TbAppStoreProvider.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { MergeableStore } from 'tinybase';
import { Provider, useCreateMergeableStore, useCreatePersister } from 'tinybase/ui-react';
import { createAppStore, createBrowserAppPersister, TB_APP_TABLES_SCHEMA } from '../tinybase/app-store/tb-app-store';

const TbAppStoreContext = createContext<MergeableStore | null>(null);

export const TbAppStoreProvider = ({ children }: { children: ReactNode }) => {
  const store = useCreateMergeableStore(createAppStore);
  const [isReady, setIsReady] = useState(false);

  useCreatePersister(
    store,
    (store) => createBrowserAppPersister(store),
    [],
    async (persister) => {
      await persister.startAutoLoad([TB_APP_TABLES_SCHEMA, {}]);
      await persister.startAutoSave();
      setIsReady(true);
    }
  );

  if (!isReady) return null;

  return (
    <TbAppStoreContext.Provider value={store}>
      <Provider store={store}>
        {children}
      </Provider>
    </TbAppStoreContext.Provider>
  );
};

export const useTbAppStore = (): MergeableStore => {
  const store = useContext(TbAppStoreContext);
  if (!store) throw new Error('Must be within TbAppStoreProvider');
  return store;
};

export const useTbAppStoreOptional = (): MergeableStore | null => {
  return useContext(TbAppStoreContext);
};
```

### Web CLI Terminal

```typescript
// src/pages/cli/cli-terminal.tsx
import { Box, Text, useInput } from 'ink-web';  // Note: ink-web for browser
import { useState, useRef } from 'react';
import { commands, executeCommand } from '../../shared/cli/commands';
import { useCliInput } from '../../shared/cli/use-cli-input';
import { useTbAppStoreOptional } from '../../data/providers/TbAppStoreProvider';

interface CliTerminalProps {
  user?: UserType;
  projects?: ProjectType[];
}

export const CliTerminal = ({ user, projects }: CliTerminalProps) => {
  const store = useTbAppStoreOptional();

  const [output, setOutput] = useState<Array<{ id: number; content: ReactNode }>>([
    { id: 0, content: <Text>Welcome to the CLI. Type "help" for commands.</Text> }
  ]);
  const [busy, setBusy] = useState(false);
  const outputIdRef = useRef(1);

  const commandNames = Object.keys(commands);
  const { input, setInput, handleHistoryUp, handleHistoryDown, handleTab, addToHistory, clearInput } =
    useCliInput({ commandNames });

  const addOutput = (content: ReactNode) => {
    setOutput(prev => [...prev, { id: outputIdRef.current++, content }]);
  };

  const clearOutput = () => setOutput([]);

  const context: CliContext = {
    user,
    projects,
    addOutput,
    clearOutput,
    commands,
    setBusy,
    store: store ?? undefined,
    saveStore: async () => {},  // Browser auto-saves
  };

  useInput((char, key) => {
    if (busy) return;

    if (key.return) {
      addOutput(<Text dimColor>$ {input}</Text>);
      addToHistory(input);

      const result = executeCommand(input, context);
      if (result instanceof Promise) {
        setBusy(true);
        result.finally(() => {
          setBusy(false);
          clearInput();
        });
      } else {
        clearInput();
      }
    } else if (key.upArrow) {
      handleHistoryUp();
    } else if (key.downArrow) {
      handleHistoryDown();
    } else if (key.tab) {
      handleTab();
    } else if (key.backspace || key.delete) {
      setInput(input.slice(0, -1));
    } else if (char && !key.ctrl && !key.meta) {
      setInput(input + char);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {output.map(entry => (
        <Box key={entry.id}>{entry.content}</Box>
      ))}
      {!busy && (
        <Box>
          <Text color="green">$ </Text>
          <Text>{input}</Text>
          <Text backgroundColor="white"> </Text>
        </Box>
      )}
    </Box>
  );
};
```

---

## Dependencies

```json
{
  "dependencies": {
    "ink": "^4.x",
    "ink-web": "^1.x",
    "react": "^18.x",
    "tinybase": "^5.x",
    "@tinybase-ts-react/zod-schematizer": "^1.x",
    "zod": "^3.x"
  }
}
```

---

## Implementation Checklist

1. **Set up TinyBase store**
   - [ ] Define Zod schemas for all tables
   - [ ] Create store factory with schema
   - [ ] Create browser persister (LocalStorage)
   - [ ] Create CLI persister (file-based)
   - [ ] Implement data access layer (CRUD functions)

2. **Build command infrastructure**
   - [ ] Define Command and CliContext interfaces
   - [ ] Create command registry
   - [ ] Implement executeCommand dispatcher
   - [ ] Build argument parsing utilities

3. **Create CLI input handling**
   - [ ] Implement useCliInput hook
   - [ ] Add command history (up/down arrows)
   - [ ] Add tab completion

4. **Build interactive components**
   - [ ] InteractiveInput (text input)
   - [ ] InteractiveMenu (selection)
   - [ ] Multi-step wizard pattern

5. **Implement terminal CLI**
   - [ ] Entry point with TTY detection
   - [ ] Interactive mode (CliApp)
   - [ ] Non-interactive mode (CliRunner)

6. **Implement browser CLI**
   - [ ] TinyBase provider with auto-load/save
   - [ ] CliTerminal component
   - [ ] Integration with app context (user, projects)

7. **Build commands**
   - [ ] help, clear, exit, echo
   - [ ] Entity CRUD commands with subcommands
   - [ ] Interactive modes for create/update

---

## Key Architectural Decisions

1. **Shared commands**: Single source of truth for both environments
2. **Ink for rendering**: React-based terminal UI with color support
3. **TinyBase MergeableStore**: Enables future collaborative features
4. **Zod validation**: Type-safe data at rest and runtime validation
5. **Promise-based async**: Interactive commands return promises for flow control
6. **setBusy pattern**: Disables input during async operations
7. **Output as ReactNode**: Rich formatted output with colors and structure
