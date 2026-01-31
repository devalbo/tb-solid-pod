import type { Store } from 'tinybase';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';
import { STORE_TABLES } from '../storeLayout';

export interface LookupResult {
  found: true;
  id: string;
}

export interface LookupNotFound {
  found: false;
}

export type EntityLookupResult = LookupResult | LookupNotFound;

function toLower(x: unknown): string {
  return typeof x === 'string' ? x.toLowerCase() : '';
}

/**
 * Find a persona by ID, short ID, or name.
 */
export function findPersona(store: Store, query: string): EntityLookupResult {
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  if (personas[query]) return { found: true, id: query };

  for (const id of Object.keys(personas)) {
    const shortId = id.split('/').pop()?.replace('#me', '') || '';
    if (shortId === query || shortId.startsWith(query)) return { found: true, id };
  }

  const q = query.toLowerCase();
  for (const [id, record] of Object.entries(personas)) {
    const name = toLower((record as Record<string, unknown>)[FOAF.name]);
    if (name === q || name.includes(q)) return { found: true, id };
  }

  return { found: false };
}

/**
 * Find a contact by ID, short ID, or name.
 */
export function findContact(store: Store, query: string): EntityLookupResult {
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  if (contacts[query]) return { found: true, id: query };

  for (const id of Object.keys(contacts)) {
    const shortId = id.split('#').pop() || '';
    if (shortId === query || shortId.startsWith(query)) return { found: true, id };
  }

  const q = query.toLowerCase();
  for (const [id, record] of Object.entries(contacts)) {
    const name = toLower((record as Record<string, unknown>)[VCARD.fn]);
    if (name === q || name.includes(q)) return { found: true, id };
  }

  return { found: false };
}

/**
 * Find a group by ID, slug, or name.
 */
export function findGroup(store: Store, query: string): EntityLookupResult {
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  if (groups[query]) return { found: true, id: query };

  for (const id of Object.keys(groups)) {
    const slug = id.split('/groups/').pop()?.split('#')[0] || '';
    if (slug === query || slug.startsWith(query)) return { found: true, id };
  }

  const q = query.toLowerCase();
  for (const [id, record] of Object.entries(groups)) {
    const name = toLower((record as Record<string, unknown>)[VCARD.fn]);
    if (name === q || name.includes(q)) return { found: true, id };
  }

  return { found: false };
}

