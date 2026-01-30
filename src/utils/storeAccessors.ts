/**
 * Typed store accessors – Zod-validated read/write for data integrity
 *
 * Use these helpers instead of raw getRow/setRow for personas, contacts, groups,
 * and type index rows. Every read is validated with the corresponding Zod schema;
 * every write is validated before being stored. TypeScript types are inferred
 * from the schemas (Persona, Contact, Group, TypeIndexRow).
 *
 * Row shape in the store matches the Zod schema output (flat JSON-LD cells for
 * personas/contacts/groups; typeIndexRow has forClass, indexType, instance,
 * instanceContainer). Resources table is not covered here (see storeLayout).
 */

import type { Store } from 'tinybase';
import { STORE_TABLES } from '../storeLayout';
import {
  safeParsePersona,
  parsePersona,
  type Persona,
} from '../schemas/persona';
import {
  safeParseContact,
  parseContact,
  type Contact,
} from '../schemas/contact';
import {
  safeParseGroup,
  parseGroup,
  type Group,
} from '../schemas/group';
import {
  TypeIndexRowSchema,
  type TypeIndexRow,
} from '../schemas/typeIndex';

// Re-export row types so consumers get a single place for "store row = Zod type"
export type { Persona, Contact, Group, TypeIndexRow };

// ============================================================================
// Personas
// ============================================================================

/**
 * Get a persona by id. Returns null if missing or if the row fails Zod validation.
 */
export function getPersona(store: Store, id: string): Persona | null {
  const row = store.getRow(STORE_TABLES.PERSONAS, id);
  if (row == null) return null;
  const result = safeParsePersona(row);
  return result.success ? result.data : null;
}

/**
 * Store a persona. Validates with PersonaSchema; throws ZodError if invalid.
 */
export function setPersona(store: Store, persona: Persona): void {
  const parsed = parsePersona(persona);
  const id = typeof parsed['@id'] === 'string' ? parsed['@id'] : String(parsed['@id']);
  store.setRow(STORE_TABLES.PERSONAS, id, parsed as import('tinybase').Row);
}

// ============================================================================
// Contacts
// ============================================================================

/**
 * Get a contact by id. Returns null if missing or if the row fails Zod validation.
 */
export function getContact(store: Store, id: string): Contact | null {
  const row = store.getRow(STORE_TABLES.CONTACTS, id);
  if (row == null) return null;
  const result = safeParseContact(row);
  return result.success ? result.data : null;
}

/**
 * Store a contact. Validates with ContactSchema; throws ZodError if invalid.
 */
export function setContact(store: Store, contact: Contact): void {
  const parsed = parseContact(contact);
  const id = typeof parsed['@id'] === 'string' ? parsed['@id'] : String(parsed['@id']);
  store.setRow(STORE_TABLES.CONTACTS, id, parsed as import('tinybase').Row);
}

// ============================================================================
// Groups
// ============================================================================

/**
 * Get a group by id. Returns null if missing or if the row fails Zod validation.
 */
export function getGroup(store: Store, id: string): Group | null {
  const row = store.getRow(STORE_TABLES.GROUPS, id);
  if (row == null) return null;
  const result = safeParseGroup(row);
  return result.success ? result.data : null;
}

/**
 * Store a group. Validates with GroupSchema; throws ZodError if invalid.
 */
export function setGroup(store: Store, group: Group): void {
  const parsed = parseGroup(group);
  const id = typeof parsed['@id'] === 'string' ? parsed['@id'] : String(parsed['@id']);
  store.setRow(STORE_TABLES.GROUPS, id, parsed as import('tinybase').Row);
}

// ============================================================================
// Type index rows
// ============================================================================

/**
 * Get a type index row by id. Returns null if missing or if the row fails validation.
 */
export function getTypeIndexRow(store: Store, id: string): TypeIndexRow | null {
  const row = store.getRow(STORE_TABLES.TYPE_INDEXES, id);
  if (row == null) return null;
  const result = TypeIndexRowSchema.safeParse(row);
  return result.success ? result.data : null;
}

/**
 * Store a type index row. Validates with TypeIndexRowSchema; throws ZodError if invalid.
 */
export function setTypeIndexRow(store: Store, rowId: string, row: TypeIndexRow): void {
  const parsed = TypeIndexRowSchema.parse(row);
  store.setRow(STORE_TABLES.TYPE_INDEXES, rowId, parsed as import('tinybase').Row);
}
