/**
 * Type Index Utilities
 *
 * Helper functions for managing Solid Type Indexes in TinyBase.
 * Type indexes allow apps to discover where specific types of data are stored.
 */

import type { Store } from 'tinybase';
import {
  COMMON_TYPES,
  type TypeIndexType,
  getClassDisplayName,
  resolveClassIri,
} from '../schemas/typeIndex';

// ============================================================================
// Constants
// ============================================================================

export const TYPE_INDEXES_TABLE = 'typeIndexes';

// Row IDs for the two type indexes
export const PUBLIC_TYPE_INDEX_ID = 'public';
export const PRIVATE_TYPE_INDEX_ID = 'private';

// ============================================================================
// Types
// ============================================================================

export interface StoredTypeRegistration {
  forClass: string;
  instance?: string | string[];
  instanceContainer?: string;
  indexType: TypeIndexType;
}

export interface TypeRegistrationDisplay {
  forClass: string;
  classDisplayName: string;
  instance?: string[];
  instanceContainer?: string;
  indexType: TypeIndexType;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all type registrations from the store
 */
export function getAllTypeRegistrations(store: Store): TypeRegistrationDisplay[] {
  const table = store.getTable(TYPE_INDEXES_TABLE) || {};
  const registrations: TypeRegistrationDisplay[] = [];

  for (const [_rowId, row] of Object.entries(table)) {
    const forClass = row.forClass as string;
    if (!forClass) continue;

    const instance = row.instance;
    let instanceArray: string[] | undefined;
    if (instance) {
      try {
        // Could be a JSON array string or a single string
        instanceArray = typeof instance === 'string' && instance.startsWith('[')
          ? JSON.parse(instance)
          : [instance as string];
      } catch {
        instanceArray = [instance as string];
      }
    }

    registrations.push({
      forClass,
      classDisplayName: getClassDisplayName(forClass),
      instance: instanceArray,
      instanceContainer: row.instanceContainer as string | undefined,
      indexType: (row.indexType as TypeIndexType) || 'private',
    });
  }

  return registrations;
}

/**
 * Get type registrations by index type (public or private)
 */
export function getTypeRegistrationsByType(
  store: Store,
  indexType: TypeIndexType
): TypeRegistrationDisplay[] {
  return getAllTypeRegistrations(store).filter(r => r.indexType === indexType);
}

/**
 * Find registrations for a specific class
 */
export function findRegistrationsForClass(
  store: Store,
  classIri: string
): TypeRegistrationDisplay[] {
  const resolvedIri = resolveClassIri(classIri);
  return getAllTypeRegistrations(store).filter(r => r.forClass === resolvedIri);
}

/**
 * Get the location(s) for a specific type
 */
export function getTypeLocations(
  store: Store,
  classIri: string
): { instances: string[]; containers: string[] } {
  const registrations = findRegistrationsForClass(store, classIri);

  const instances: string[] = [];
  const containers: string[] = [];

  for (const reg of registrations) {
    if (reg.instance) {
      instances.push(...reg.instance);
    }
    if (reg.instanceContainer) {
      containers.push(reg.instanceContainer);
    }
  }

  return { instances, containers };
}

/**
 * Register a type in the type index
 */
export function registerType(
  store: Store,
  input: {
    forClass: string;
    instance?: string | string[];
    instanceContainer?: string;
    indexType: TypeIndexType;
  }
): void {
  const resolvedClass = resolveClassIri(input.forClass);

  // Create a unique row ID based on class and index type
  const rowId = `${input.indexType}:${resolvedClass}`;

  const row: Record<string, string> = {
    forClass: resolvedClass,
    indexType: input.indexType,
  };

  if (input.instance) {
    // Store as JSON array if multiple, or string if single
    row.instance = Array.isArray(input.instance)
      ? JSON.stringify(input.instance)
      : input.instance;
  }

  if (input.instanceContainer) {
    row.instanceContainer = input.instanceContainer;
  }

  store.setRow(TYPE_INDEXES_TABLE, rowId, row);
}

/**
 * Unregister a type from the type index
 */
export function unregisterType(
  store: Store,
  forClass: string,
  indexType?: TypeIndexType
): boolean {
  const resolvedClass = resolveClassIri(forClass);

  if (indexType) {
    // Remove specific registration
    const rowId = `${indexType}:${resolvedClass}`;
    if (store.hasRow(TYPE_INDEXES_TABLE, rowId)) {
      store.delRow(TYPE_INDEXES_TABLE, rowId);
      return true;
    }
  } else {
    // Remove all registrations for this class
    let removed = false;
    for (const type of ['public', 'private'] as TypeIndexType[]) {
      const rowId = `${type}:${resolvedClass}`;
      if (store.hasRow(TYPE_INDEXES_TABLE, rowId)) {
        store.delRow(TYPE_INDEXES_TABLE, rowId);
        removed = true;
      }
    }
    return removed;
  }

  return false;
}

/**
 * Check if a type is registered
 */
export function isTypeRegistered(
  store: Store,
  forClass: string,
  indexType?: TypeIndexType
): boolean {
  const resolvedClass = resolveClassIri(forClass);

  if (indexType) {
    const rowId = `${indexType}:${resolvedClass}`;
    return store.hasRow(TYPE_INDEXES_TABLE, rowId);
  }

  // Check both
  return (
    store.hasRow(TYPE_INDEXES_TABLE, `public:${resolvedClass}`) ||
    store.hasRow(TYPE_INDEXES_TABLE, `private:${resolvedClass}`)
  );
}

/**
 * Add an instance to an existing registration
 */
export function addInstanceToRegistration(
  store: Store,
  forClass: string,
  instanceUrl: string,
  indexType: TypeIndexType
): void {
  const resolvedClass = resolveClassIri(forClass);
  const rowId = `${indexType}:${resolvedClass}`;

  const existing = store.getRow(TYPE_INDEXES_TABLE, rowId);

  if (existing) {
    // Add to existing registration
    let instances: string[] = [];
    if (existing.instance) {
      const current = existing.instance as string;
      instances = current.startsWith('[')
        ? JSON.parse(current)
        : [current];
    }
    if (!instances.includes(instanceUrl)) {
      instances.push(instanceUrl);
      store.setCell(
        TYPE_INDEXES_TABLE,
        rowId,
        'instance',
        instances.length === 1 ? instances[0] : JSON.stringify(instances)
      );
    }
  } else {
    // Create new registration
    registerType(store, {
      forClass: resolvedClass,
      instance: instanceUrl,
      indexType,
    });
  }
}

/**
 * Remove an instance from a registration
 */
export function removeInstanceFromRegistration(
  store: Store,
  forClass: string,
  instanceUrl: string,
  indexType: TypeIndexType
): boolean {
  const resolvedClass = resolveClassIri(forClass);
  const rowId = `${indexType}:${resolvedClass}`;

  const existing = store.getRow(TYPE_INDEXES_TABLE, rowId);

  if (!existing?.instance) return false;

  const current = existing.instance as string;
  let instances: string[] = current.startsWith('[')
    ? JSON.parse(current)
    : [current];

  const index = instances.indexOf(instanceUrl);
  if (index === -1) return false;

  instances.splice(index, 1);

  if (instances.length === 0 && !existing.instanceContainer) {
    // No more instances and no container, remove the registration
    store.delRow(TYPE_INDEXES_TABLE, rowId);
  } else if (instances.length === 0) {
    // Keep registration but remove instance
    store.delCell(TYPE_INDEXES_TABLE, rowId, 'instance');
  } else {
    // Update with remaining instances
    store.setCell(
      TYPE_INDEXES_TABLE,
      rowId,
      'instance',
      instances.length === 1 ? instances[0] : JSON.stringify(instances)
    );
  }

  return true;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize default type registrations based on existing data
 */
export function initializeDefaultTypeRegistrations(
  store: Store,
  baseUrl: string
): void {
  // Check if already initialized
  const existing = store.getTable(TYPE_INDEXES_TABLE);
  if (existing && Object.keys(existing).length > 0) {
    return; // Already has registrations
  }

  // Register default types based on our tables
  const defaultRegistrations = [
    {
      forClass: COMMON_TYPES['foaf:Person'],
      instanceContainer: `${baseUrl}personas/`,
      indexType: 'private' as TypeIndexType,
    },
    {
      forClass: COMMON_TYPES['vcard:Individual'],
      instanceContainer: `${baseUrl}contacts/`,
      indexType: 'private' as TypeIndexType,
    },
    {
      forClass: COMMON_TYPES['vcard:Group'],
      instanceContainer: `${baseUrl}groups/`,
      indexType: 'private' as TypeIndexType,
    },
    {
      forClass: COMMON_TYPES['org:Organization'],
      instanceContainer: `${baseUrl}groups/`,
      indexType: 'public' as TypeIndexType,
    },
  ];

  for (const reg of defaultRegistrations) {
    registerType(store, reg);
  }
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get a list of common type names for autocomplete
 */
export function getCommonTypeNames(): string[] {
  return Object.keys(COMMON_TYPES);
}

/**
 * Format a registration for display
 */
export function formatRegistration(reg: TypeRegistrationDisplay): string {
  const parts = [
    `${reg.classDisplayName} (${reg.indexType})`,
  ];

  if (reg.instanceContainer) {
    parts.push(`  Container: ${reg.instanceContainer}`);
  }

  if (reg.instance && reg.instance.length > 0) {
    if (reg.instance.length === 1) {
      parts.push(`  Instance: ${reg.instance[0]}`);
    } else {
      parts.push(`  Instances: ${reg.instance.length} items`);
      for (const inst of reg.instance.slice(0, 3)) {
        parts.push(`    - ${inst}`);
      }
      if (reg.instance.length > 3) {
        parts.push(`    ... and ${reg.instance.length - 3} more`);
      }
    }
  }

  return parts.join('\n');
}
