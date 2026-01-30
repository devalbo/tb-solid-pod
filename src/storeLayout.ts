/**
 * Store layout – stable contract for the TinyBase store
 *
 * Table names, index names, and (via SETTINGS_KEYS in settings.ts) value keys are
 * the library's **stable contract**. They will not be changed in a way that
 * requires app authors to migrate. Future features (e.g. sync to a Solid pod)
 * use this same layout. Use these constants when setting up your store and when
 * reading or writing tables so your app stays compatible.
 *
 * **Data integrity**: Row shapes for personas, contacts, groups, and typeIndexes
 * match the Zod schema output types (Persona, Contact, Group, TypeIndexRow).
 * Prefer the typed store accessors in `utils/storeAccessors` (getPersona,
 * setPersona, getContact, setContact, getGroup, setGroup, getTypeIndexRow,
 * setTypeIndexRow) over raw getRow/setRow so every read is Zod-validated and
 * every write is validated before storage.
 */

/** Table names used by the library. Use these when creating the store and in getRow/setRow/delRow. */
export const STORE_TABLES = {
  PERSONAS: 'personas',
  CONTACTS: 'contacts',
  GROUPS: 'groups',
  TYPE_INDEXES: 'typeIndexes',
  RESOURCES: 'resources',
} as const;

export type StoreTableName = (typeof STORE_TABLES)[keyof typeof STORE_TABLES];

/** Index names used by the library. Define these on your store's indexes for components/CLI to work. */
export const STORE_INDEXES = {
  /** Index on resources by parentId for listing folder contents. Required for file browser and CLI. */
  BY_PARENT: 'byParent',
} as const;

export type StoreIndexName = (typeof STORE_INDEXES)[keyof typeof STORE_INDEXES];

/** List of all table names (for iteration, e.g. validation or export). */
export const STORE_TABLE_NAMES: readonly StoreTableName[] = [
  STORE_TABLES.PERSONAS,
  STORE_TABLES.CONTACTS,
  STORE_TABLES.GROUPS,
  STORE_TABLES.TYPE_INDEXES,
  STORE_TABLES.RESOURCES,
] as const;
