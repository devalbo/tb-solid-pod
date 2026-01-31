/**
 * tb-solid-pod – Browser-based Solid-style data pod with TinyBase
 *
 * Install from GitHub: npm install github:devalbo/tb-solid-pod
 *
 * @example
 * ```ts
 * import { createPersona, createContact, PersonaSchema } from 'tb-solid-pod';
 * import { CliTerminal } from 'tb-solid-pod';
 * ```
 */

// Store layout (stable contract: table and index names; use when setting up your store)
export {
  STORE_TABLES,
  STORE_INDEXES,
  STORE_TABLE_NAMES,
  type StoreTableName,
  type StoreIndexName,
} from './storeLayout';

// Schemas (Zod + factory functions + JSON Schema for personas, contacts, groups, files, type indexes, preferences)
export * from './schemas';

// Utils (settings, store export/import, type index helpers, validation, typed store accessors)
export * from './utils/settings';
export * from './utils/storeExport';
export * from './utils/storeAccessors';
export * from './utils/typeIndex';
export * from './utils/validation';

// VirtualPod (in-app pod backend; interface in cli/types.ts)
export { VirtualPod, type ResourceRow } from './virtualPod';

// CLI (terminal component, command registry, hooks, types)
export {
  CliTerminal,
  commands,
  executeCommand,
  exec,
  cliApi,
  createApiContext,
  useCliInput,
  parseCliArgs,
  getOptionString,
  getOptionBoolean,
  generateId,
} from './cli';
export type { Command, CliContext, OutputEntry, ParsedArgs } from './cli';

// Components (React; default exports re-exported as named)
export { default as PersonaList } from './components/PersonaList';
export { default as PersonaForm } from './components/PersonaForm';
export { default as ContactList } from './components/ContactList';
export { default as ContactForm } from './components/ContactForm';
export { default as GroupList } from './components/GroupList';
export { default as GroupForm } from './components/GroupForm';
export { default as MembershipManager } from './components/MembershipManager';
export { default as FileMetadataPanel } from './components/FileMetadataPanel';
