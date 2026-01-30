/**
 * TinyBase Store factory for tests
 * Creates isolated store instances with optional seed data
 */

import { createStore, createIndexes, Store, Indexes } from 'tinybase'
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf'

export interface TestStore {
  store: Store
  indexes: Indexes
}

/**
 * Create a fresh TinyBase store for testing
 */
export function createTestStore(): TestStore {
  const store = createStore()
  const indexes = createIndexes(store)

  // Initialize tables
  store.setTables({
    resources: {},
    personas: {},
    contacts: {},
    groups: {},
    typeIndexes: {},
  })

  // Set up index for parent lookups
  indexes.setIndexDefinition('byParent', 'resources', 'parentId')

  return { store, indexes }
}

/**
 * Create a test store with sample persona data
 */
export function createTestStoreWithPersona(): TestStore & { personaId: string } {
  const { store, indexes } = createTestStore()

  const personaId = 'urn:uuid:test-persona-1'
  store.setRow('personas', personaId, {
    '@id': personaId,
    '@type': JSON.stringify([FOAF.Person]),
    [FOAF.name]: 'Test User',
    [FOAF.nick]: 'tester',
    [VCARD.hasEmail]: 'mailto:test@example.com',
  })

  return { store, indexes, personaId }
}

/**
 * Create a test store with sample contact data
 */
export function createTestStoreWithContacts(): TestStore & { contactIds: string[] } {
  const { store, indexes } = createTestStore()

  const contactIds = [
    'urn:uuid:contact-1',
    'urn:uuid:contact-2',
    'urn:uuid:contact-3',
  ]

  store.setRow('contacts', contactIds[0], {
    '@id': contactIds[0],
    '@type': VCARD.Individual,
    [VCARD.fn]: 'Alice Smith',
    [VCARD.hasEmail]: 'mailto:alice@example.com',
  })

  store.setRow('contacts', contactIds[1], {
    '@id': contactIds[1],
    '@type': VCARD.Individual,
    [VCARD.fn]: 'Bob Jones',
    [VCARD.hasEmail]: 'mailto:bob@example.com',
  })

  store.setRow('contacts', contactIds[2], {
    '@id': contactIds[2],
    '@type': 'https://schema.org/SoftwareApplication',
    [VCARD.fn]: 'AI Assistant',
    [VCARD.note]: 'A helpful AI agent',
  })

  return { store, indexes, contactIds }
}

/**
 * Create a test store with sample group data
 */
export function createTestStoreWithGroups(): TestStore & { groupIds: string[] } {
  const { store, indexes } = createTestStore()

  const groupIds = [
    'urn:uuid:group-1',
    'urn:uuid:group-2',
  ]

  store.setRow('groups', groupIds[0], {
    '@id': groupIds[0],
    '@type': JSON.stringify(['http://www.w3.org/ns/org#Organization']),
    [VCARD.fn]: 'Test Organization',
    [VCARD.note]: 'A test organization',
  })

  store.setRow('groups', groupIds[1], {
    '@id': groupIds[1],
    '@type': JSON.stringify([VCARD.Group]),
    [VCARD.fn]: 'Test Team',
    [VCARD.note]: 'A test team',
  })

  return { store, indexes, groupIds }
}

/**
 * Create a test store with comprehensive sample data
 */
export function createFullTestStore(): TestStore & {
  personaId: string
  contactIds: string[]
  groupIds: string[]
} {
  const { store, indexes } = createTestStore()

  const personaId = 'urn:uuid:test-persona-1'
  store.setRow('personas', personaId, {
    '@id': personaId,
    '@type': JSON.stringify([FOAF.Person]),
    [FOAF.name]: 'Test User',
    [FOAF.nick]: 'tester',
    [VCARD.hasEmail]: 'mailto:test@example.com',
  })

  const contactIds = ['urn:uuid:contact-1', 'urn:uuid:contact-2']
  store.setRow('contacts', contactIds[0], {
    '@id': contactIds[0],
    '@type': JSON.stringify([VCARD.Individual]),
    [VCARD.fn]: 'Alice Smith',
    [VCARD.hasEmail]: 'mailto:alice@example.com',
  })
  store.setRow('contacts', contactIds[1], {
    '@id': contactIds[1],
    '@type': JSON.stringify([VCARD.Individual]),
    [VCARD.fn]: 'Bob Jones',
  })

  const groupIds = ['urn:uuid:group-1']
  store.setRow('groups', groupIds[0], {
    '@id': groupIds[0],
    '@type': JSON.stringify(['http://www.w3.org/ns/org#Organization']),
    [VCARD.fn]: 'Test Org',
  })

  // Set default persona
  store.setValue('defaultPersonaId', personaId)

  return { store, indexes, personaId, contactIds, groupIds }
}
