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

// Schemas (Zod + factory functions for personas, contacts, groups, files, type indexes, preferences)
export * from './schemas';

// Utils (settings, store export/import, type index helpers, validation)
export * from './utils/settings';
export * from './utils/storeExport';
export * from './utils/typeIndex';
export * from './utils/validation';

// CLI (terminal component, command registry, hooks, types)
export { CliTerminal, commands, executeCommand, useCliInput, parseCliArgs, getOptionString, getOptionBoolean, generateId } from './cli';
export type { Command, CliContext, VirtualPod, OutputEntry, ParsedArgs } from './cli';

// Components (React; default exports re-exported as named)
export { default as PersonaList } from './components/PersonaList';
export { default as PersonaForm } from './components/PersonaForm';
export { default as ContactList } from './components/ContactList';
export { default as ContactForm } from './components/ContactForm';
export { default as GroupList } from './components/GroupList';
export { default as GroupForm } from './components/GroupForm';
export { default as MembershipManager } from './components/MembershipManager';
export { default as FileMetadataPanel } from './components/FileMetadataPanel';
