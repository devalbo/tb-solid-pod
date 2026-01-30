import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, Store } from 'tinybase'
import {
  TYPE_INDEXES_TABLE,
  getAllTypeRegistrations,
  getTypeRegistrationsByType,
  findRegistrationsForClass,
  getTypeLocations,
  registerType,
  unregisterType,
  isTypeRegistered,
  addInstanceToRegistration,
  removeInstanceFromRegistration,
  initializeDefaultTypeRegistrations,
  getCommonTypeNames,
  formatRegistration,
  type TypeRegistrationDisplay,
} from '../../../src/utils/typeIndex'
import { COMMON_TYPES } from '../../../src/schemas/typeIndex'

describe('Type Index Utilities', () => {
  let store: Store

  beforeEach(() => {
    store = createStore()
  })

  describe('registerType', () => {
    it('registers a type with instance', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })

      const row = store.getRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)
      expect(row).toBeDefined()
      expect(row.forClass).toBe(COMMON_TYPES['vcard:Individual'])
      expect(row.instance).toBe('https://pod.example.com/contacts')
      expect(row.indexType).toBe('public')
    })

    it('registers a type with instanceContainer', () => {
      registerType(store, {
        forClass: 'foaf:Person',
        instanceContainer: 'https://pod.example.com/profiles/',
        indexType: 'private',
      })

      const row = store.getRow(TYPE_INDEXES_TABLE, `private:${COMMON_TYPES['foaf:Person']}`)
      expect(row.instanceContainer).toBe('https://pod.example.com/profiles/')
    })

    it('registers multiple instances as JSON array', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: ['https://pod.example.com/contacts/a', 'https://pod.example.com/contacts/b'],
        indexType: 'public',
      })

      const row = store.getRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)
      expect(row.instance).toBe('["https://pod.example.com/contacts/a","https://pod.example.com/contacts/b"]')
    })

    it('resolves short class names', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })

      expect(store.hasRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)).toBe(true)
    })
  })

  describe('unregisterType', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/private-contacts',
        indexType: 'private',
      })
    })

    it('removes specific registration by index type', () => {
      const result = unregisterType(store, 'vcard:Individual', 'public')

      expect(result).toBe(true)
      expect(store.hasRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)).toBe(false)
      expect(store.hasRow(TYPE_INDEXES_TABLE, `private:${COMMON_TYPES['vcard:Individual']}`)).toBe(true)
    })

    it('removes all registrations when no index type specified', () => {
      const result = unregisterType(store, 'vcard:Individual')

      expect(result).toBe(true)
      expect(store.hasRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)).toBe(false)
      expect(store.hasRow(TYPE_INDEXES_TABLE, `private:${COMMON_TYPES['vcard:Individual']}`)).toBe(false)
    })

    it('returns false if registration not found', () => {
      const result = unregisterType(store, 'foaf:Person', 'public')
      expect(result).toBe(false)
    })
  })

  describe('isTypeRegistered', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })
    })

    it('returns true for registered type', () => {
      expect(isTypeRegistered(store, 'vcard:Individual')).toBe(true)
    })

    it('returns true for specific index type', () => {
      expect(isTypeRegistered(store, 'vcard:Individual', 'public')).toBe(true)
      expect(isTypeRegistered(store, 'vcard:Individual', 'private')).toBe(false)
    })

    it('returns false for unregistered type', () => {
      expect(isTypeRegistered(store, 'foaf:Person')).toBe(false)
    })
  })

  describe('getAllTypeRegistrations', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })
      registerType(store, {
        forClass: 'foaf:Person',
        instanceContainer: 'https://pod.example.com/profiles/',
        indexType: 'private',
      })
    })

    it('returns all registrations', () => {
      const registrations = getAllTypeRegistrations(store)

      expect(registrations).toHaveLength(2)
    })

    it('includes display names', () => {
      const registrations = getAllTypeRegistrations(store)

      const vcardReg = registrations.find(r => r.forClass === COMMON_TYPES['vcard:Individual'])
      expect(vcardReg?.classDisplayName).toBe('vcard:Individual')
    })

    it('parses single instance as array', () => {
      const registrations = getAllTypeRegistrations(store)

      const vcardReg = registrations.find(r => r.forClass === COMMON_TYPES['vcard:Individual'])
      expect(vcardReg?.instance).toEqual(['https://pod.example.com/contacts'])
    })

    it('parses JSON array instances', () => {
      registerType(store, {
        forClass: 'vcard:Group',
        instance: ['https://a.com', 'https://b.com'],
        indexType: 'public',
      })

      const registrations = getAllTypeRegistrations(store)
      const groupReg = registrations.find(r => r.forClass === COMMON_TYPES['vcard:Group'])
      expect(groupReg?.instance).toEqual(['https://a.com', 'https://b.com'])
    })
  })

  describe('getTypeRegistrationsByType', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })
      registerType(store, {
        forClass: 'foaf:Person',
        instanceContainer: 'https://pod.example.com/profiles/',
        indexType: 'private',
      })
    })

    it('filters by public index', () => {
      const registrations = getTypeRegistrationsByType(store, 'public')

      expect(registrations).toHaveLength(1)
      expect(registrations[0].indexType).toBe('public')
    })

    it('filters by private index', () => {
      const registrations = getTypeRegistrationsByType(store, 'private')

      expect(registrations).toHaveLength(1)
      expect(registrations[0].indexType).toBe('private')
    })
  })

  describe('findRegistrationsForClass', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/contacts',
        indexType: 'public',
      })
      registerType(store, {
        forClass: 'vcard:Individual',
        instanceContainer: 'https://pod.example.com/private/',
        indexType: 'private',
      })
    })

    it('finds all registrations for a class', () => {
      const registrations = findRegistrationsForClass(store, 'vcard:Individual')

      expect(registrations).toHaveLength(2)
    })

    it('returns empty array for unregistered class', () => {
      const registrations = findRegistrationsForClass(store, 'foaf:Person')

      expect(registrations).toHaveLength(0)
    })
  })

  describe('getTypeLocations', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: ['https://pod.example.com/contacts/a', 'https://pod.example.com/contacts/b'],
        indexType: 'public',
      })
      registerType(store, {
        forClass: 'vcard:Individual',
        instanceContainer: 'https://pod.example.com/contacts/',
        indexType: 'private',
      })
    })

    it('returns instances and containers', () => {
      const locations = getTypeLocations(store, 'vcard:Individual')

      expect(locations.instances).toContain('https://pod.example.com/contacts/a')
      expect(locations.instances).toContain('https://pod.example.com/contacts/b')
      expect(locations.containers).toContain('https://pod.example.com/contacts/')
    })
  })

  describe('addInstanceToRegistration', () => {
    it('adds instance to existing registration', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/a',
        indexType: 'public',
      })

      addInstanceToRegistration(store, 'vcard:Individual', 'https://pod.example.com/b', 'public')

      const row = store.getRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)
      expect(row.instance).toBe('["https://pod.example.com/a","https://pod.example.com/b"]')
    })

    it('does not add duplicate instance', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://pod.example.com/a',
        indexType: 'public',
      })

      addInstanceToRegistration(store, 'vcard:Individual', 'https://pod.example.com/a', 'public')

      const row = store.getRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)
      expect(row.instance).toBe('https://pod.example.com/a')
    })

    it('creates new registration if none exists', () => {
      addInstanceToRegistration(store, 'vcard:Individual', 'https://pod.example.com/a', 'public')

      expect(isTypeRegistered(store, 'vcard:Individual', 'public')).toBe(true)
    })
  })

  describe('removeInstanceFromRegistration', () => {
    beforeEach(() => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: ['https://pod.example.com/a', 'https://pod.example.com/b'],
        indexType: 'public',
      })
    })

    it('removes instance from registration', () => {
      const result = removeInstanceFromRegistration(
        store,
        'vcard:Individual',
        'https://pod.example.com/a',
        'public'
      )

      expect(result).toBe(true)
      const row = store.getRow(TYPE_INDEXES_TABLE, `public:${COMMON_TYPES['vcard:Individual']}`)
      expect(row.instance).toBe('https://pod.example.com/b')
    })

    it('removes registration when last instance removed and no container', () => {
      removeInstanceFromRegistration(store, 'vcard:Individual', 'https://pod.example.com/a', 'public')
      removeInstanceFromRegistration(store, 'vcard:Individual', 'https://pod.example.com/b', 'public')

      expect(isTypeRegistered(store, 'vcard:Individual', 'public')).toBe(false)
    })

    it('keeps registration with container when instances removed', () => {
      store.setCell(
        TYPE_INDEXES_TABLE,
        `public:${COMMON_TYPES['vcard:Individual']}`,
        'instanceContainer',
        'https://pod.example.com/contacts/'
      )

      removeInstanceFromRegistration(store, 'vcard:Individual', 'https://pod.example.com/a', 'public')
      removeInstanceFromRegistration(store, 'vcard:Individual', 'https://pod.example.com/b', 'public')

      expect(isTypeRegistered(store, 'vcard:Individual', 'public')).toBe(true)
    })

    it('returns false for non-existent instance', () => {
      const result = removeInstanceFromRegistration(
        store,
        'vcard:Individual',
        'https://pod.example.com/nonexistent',
        'public'
      )

      expect(result).toBe(false)
    })
  })

  describe('initializeDefaultTypeRegistrations', () => {
    it('creates default registrations', () => {
      initializeDefaultTypeRegistrations(store, 'https://pod.example.com/')

      expect(isTypeRegistered(store, 'foaf:Person')).toBe(true)
      expect(isTypeRegistered(store, 'vcard:Individual')).toBe(true)
      expect(isTypeRegistered(store, 'vcard:Group')).toBe(true)
      expect(isTypeRegistered(store, 'org:Organization')).toBe(true)
    })

    it('does not overwrite existing registrations', () => {
      registerType(store, {
        forClass: 'vcard:Individual',
        instance: 'https://custom.example.com/contacts',
        indexType: 'public',
      })

      initializeDefaultTypeRegistrations(store, 'https://pod.example.com/')

      const locations = getTypeLocations(store, 'vcard:Individual')
      expect(locations.instances).toContain('https://custom.example.com/contacts')
    })
  })

  describe('getCommonTypeNames', () => {
    it('returns list of common type names', () => {
      const names = getCommonTypeNames()

      expect(names).toContain('vcard:Individual')
      expect(names).toContain('foaf:Person')
      expect(names).toContain('vcard:Group')
    })
  })

  describe('formatRegistration', () => {
    it('formats registration with instance', () => {
      const reg: TypeRegistrationDisplay = {
        forClass: COMMON_TYPES['vcard:Individual'],
        classDisplayName: 'vcard:Individual',
        instance: ['https://pod.example.com/contacts'],
        indexType: 'public',
      }

      const formatted = formatRegistration(reg)

      expect(formatted).toContain('vcard:Individual (public)')
      expect(formatted).toContain('Instance: https://pod.example.com/contacts')
    })

    it('formats registration with container', () => {
      const reg: TypeRegistrationDisplay = {
        forClass: COMMON_TYPES['vcard:Individual'],
        classDisplayName: 'vcard:Individual',
        instanceContainer: 'https://pod.example.com/contacts/',
        indexType: 'private',
      }

      const formatted = formatRegistration(reg)

      expect(formatted).toContain('Container: https://pod.example.com/contacts/')
    })

    it('formats multiple instances', () => {
      const reg: TypeRegistrationDisplay = {
        forClass: COMMON_TYPES['vcard:Individual'],
        classDisplayName: 'vcard:Individual',
        instance: ['https://a.com', 'https://b.com'],
        indexType: 'public',
      }

      const formatted = formatRegistration(reg)

      expect(formatted).toContain('Instances: 2 items')
    })

    it('truncates long instance lists', () => {
      const reg: TypeRegistrationDisplay = {
        forClass: COMMON_TYPES['vcard:Individual'],
        classDisplayName: 'vcard:Individual',
        instance: ['https://1.com', 'https://2.com', 'https://3.com', 'https://4.com', 'https://5.com'],
        indexType: 'public',
      }

      const formatted = formatRegistration(reg)

      expect(formatted).toContain('and 2 more')
    })
  })
})
