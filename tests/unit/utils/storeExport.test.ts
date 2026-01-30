import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'tinybase'
import { FOAF } from '@inrupt/vocab-common-rdf'
import {
  exportStore,
  exportStoreAsJson,
  importStoreFromJson,
  validateImportJson,
  type StoreExport,
} from '../../../src/utils/storeExport'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
})

describe('exportStore', () => {
  it('exports store with tables and values', () => {
    const store = createStore()
    store.setRow('resources', 'r1', { type: 'Container' })
    store.setValue('theme', 'dark')

    const result = exportStore(store)

    expect(result.data.version).toBe(1)
    expect(result.data.exportedAt).toBe('2024-06-15T12:00:00.000Z')
    expect(result.data.tables.resources).toBeDefined()
    expect(result.data.values.theme).toBe('dark')
  })

  it('includes validation metadata', () => {
    const store = createStore()
    store.setRow('resources', 'r1', { type: 'Container' })

    const result = exportStore(store)

    expect(result.data.validation).toBeDefined()
    expect(result.data.validation!.valid).toBe(true)
    expect(result.data.validation!.errorCount).toBe(0)
  })

  it('reports validation errors for invalid data', () => {
    const store = createStore()
    // Store invalid persona data (missing required fields)
    store.setRow('personas', 'p1', {
      invalid: 'missing required fields',
    })

    const result = exportStore(store)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('exportStoreAsJson', () => {
  it('exports as pretty JSON by default', () => {
    const store = createStore()
    store.setRow('resources', 'r1', { type: 'Container' })

    const json = exportStoreAsJson(store)

    expect(json).toContain('\n')
    expect(json).toContain('  ')
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
  })

  it('exports as compact JSON when pretty=false', () => {
    const store = createStore()
    store.setRow('resources', 'r1', { type: 'Container' })

    const json = exportStoreAsJson(store, { pretty: false })

    expect(json).not.toContain('\n  ')
  })

  it('throws in strict mode on validation error', () => {
    const store = createStore()
    // Create an invalid persona - missing @type and name
    store.setRow('personas', 'p1', {
      invalid: 'data',
    })

    // Note: TinyBase stores data as key-value pairs, so the validation
    // against the JSON-LD schema will fail
    expect(() => exportStoreAsJson(store, { strict: true })).toThrow()
  })

  it('does not throw in non-strict mode on validation error', () => {
    const store = createStore()
    store.setRow('personas', 'p1', {
      invalid: 'data',
    })

    expect(() => exportStoreAsJson(store, { strict: false })).not.toThrow()
  })
})

describe('importStoreFromJson', () => {
  it('imports valid data', () => {
    const store = createStore()
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        resources: {
          r1: { type: 'Container' },
        },
      },
      values: {
        theme: 'dark',
      },
    }

    const result = importStoreFromJson(store, JSON.stringify(exportData))

    expect(result.success).toBe(true)
    expect(store.getRow('resources', 'r1')).toEqual({ type: 'Container' })
    expect(store.getValue('theme')).toBe('dark')
  })

  it('returns error for invalid JSON', () => {
    const store = createStore()
    const result = importStoreFromJson(store, 'not valid json')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error for missing version', () => {
    const store = createStore()
    const result = importStoreFromJson(store, JSON.stringify({ tables: {} }))

    expect(result.success).toBe(false)
    expect(result.error).toContain('missing version')
  })

  it('returns error for unsupported version', () => {
    const store = createStore()
    const data = { version: 99, tables: {} }
    const result = importStoreFromJson(store, JSON.stringify(data))

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported export version')
  })

  it('rejects invalid data in strict mode', () => {
    const store = createStore()
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        personas: {
          p1: { '@type': [FOAF.Person] }, // missing name
        },
      },
      values: {},
    }

    const result = importStoreFromJson(store, JSON.stringify(exportData), { strict: true })

    expect(result.success).toBe(false)
    expect(result.validationErrors).toBeDefined()
  })

  it('imports valid rows in non-strict mode', () => {
    const store = createStore()
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        personas: {
          p1: {
            '@id': 'https://example.com/me#me',
            '@type': [FOAF.Person],
            [FOAF.name]: 'Alice',
          },
          p2: { '@type': [FOAF.Person] }, // invalid - missing name
        },
      },
      values: {},
    }

    const result = importStoreFromJson(store, JSON.stringify(exportData), {
      strict: false,
      skipInvalid: true,
    })

    expect(result.success).toBe(true)
    expect(store.hasRow('personas', 'p1')).toBe(true)
  })

  it('clears existing data when merge=false', () => {
    const store = createStore()
    store.setRow('resources', 'existing', { data: 'old' })
    store.setValue('existingValue', 'old')

    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        resources: { r1: { type: 'Container' } },
      },
      values: { newValue: 'new' },
    }

    importStoreFromJson(store, JSON.stringify(exportData), { merge: false })

    expect(store.hasRow('resources', 'existing')).toBe(false)
    expect(store.getValue('existingValue')).toBeUndefined()
  })

  it('imports data when merge=true (setTables replaces whole table)', () => {
    const store = createStore()
    store.setRow('resources', 'existing', { data: 'old' })
    store.setRow('otherTable', 'row1', { data: 'keep' })

    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        resources: { r1: { type: 'Container' } },
      },
      values: {},
    }

    // Note: setTables replaces the entire table structure, even with merge=true
    // The merge flag only controls whether delTables/delValues is called first
    // So 'existing' row will be lost, but other tables aren't explicitly deleted
    importStoreFromJson(store, JSON.stringify(exportData), { merge: true })

    expect(store.hasRow('resources', 'r1')).toBe(true)
  })

  it('reports imported row count', () => {
    const store = createStore()
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        resources: {
          r1: { type: 'Container' },
          r2: { type: 'Resource' },
        },
      },
      values: {},
    }

    const result = importStoreFromJson(store, JSON.stringify(exportData))

    expect(result.importedRows).toBe(2)
  })
})

describe('validateImportJson', () => {
  it('validates correct export format', () => {
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        resources: { r1: { type: 'Container' } },
      },
      values: {},
    }

    const result = validateImportJson(JSON.stringify(exportData))

    expect(result.valid).toBe(true)
  })

  it('returns invalid for missing format', () => {
    const result = validateImportJson(JSON.stringify({ tables: {} }))

    expect(result.valid).toBe(false)
    expect(result.summary).toContain('Invalid export format')
  })

  it('returns invalid for parse errors', () => {
    const result = validateImportJson('not json')

    expect(result.valid).toBe(false)
    expect(result.summary).toBe('Failed to parse JSON')
  })

  it('validates data against schemas', () => {
    const exportData: StoreExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      tables: {
        personas: {
          p1: { '@type': [FOAF.Person] }, // invalid
        },
      },
      values: {},
    }

    const result = validateImportJson(JSON.stringify(exportData))

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
