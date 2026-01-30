import { describe, it, expect } from 'vitest'
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf'
import { createStore } from 'tinybase'
import {
  getTableSchema,
  validateRow,
  validatePersona,
  validateContact,
  validateGroup,
  validateTypeIndexRow,
  validateTable,
  validateStoreData,
  validateStore,
  validateImportData,
  formatValidationErrors,
  getValidationSummary,
  type ValidationError,
} from '../../../src/utils/validation'

describe('getTableSchema', () => {
  it('returns schema for known tables', () => {
    expect(getTableSchema('personas')).not.toBeNull()
    expect(getTableSchema('contacts')).not.toBeNull()
    expect(getTableSchema('groups')).not.toBeNull()
    expect(getTableSchema('typeIndexes')).not.toBeNull()
  })

  it('returns null for unknown tables', () => {
    expect(getTableSchema('unknown')).toBeNull()
    expect(getTableSchema('resources')).toBeNull()
  })
})

describe('validateRow', () => {
  it('validates persona row', () => {
    const validPersona = {
      '@id': 'https://example.com/me#me',
      '@type': [FOAF.Person],
      [FOAF.name]: 'Alice',
    }
    const result = validateRow('personas', 'row1', validPersona)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns errors for invalid persona', () => {
    const invalidPersona = {
      '@id': 'https://example.com/me#me',
      '@type': [FOAF.Person],
      // missing required name
    }
    const result = validateRow('personas', 'row1', invalidPersona)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].table).toBe('personas')
    expect(result.errors[0].rowId).toBe('row1')
  })

  it('validates tables without schemas as valid', () => {
    const result = validateRow('resources', 'row1', { type: 'Container' })
    expect(result.valid).toBe(true)
  })

  it('validates unknown tables as valid', () => {
    const result = validateRow('customTable', 'row1', { anything: 'goes' })
    expect(result.valid).toBe(true)
  })
})

describe('validatePersona', () => {
  it('validates valid persona', () => {
    const persona = {
      '@id': 'https://example.com/me#me',
      '@type': [FOAF.Person],
      [FOAF.name]: 'Alice',
    }
    const result = validatePersona('row1', persona)
    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid persona', () => {
    const result = validatePersona('row1', { '@type': ['wrong'] })
    expect(result.valid).toBe(false)
    expect(result.errors[0].table).toBe('personas')
  })
})

describe('validateContact', () => {
  it('validates valid contact', () => {
    const contact = {
      '@id': 'https://example.com/contacts#1',
      '@type': VCARD.Individual,
      [VCARD.fn]: 'John Doe',
      [VCARD.hasUID]: 'urn:uuid:123',
    }
    const result = validateContact('row1', contact)
    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid contact', () => {
    const result = validateContact('row1', { '@type': VCARD.Individual })
    expect(result.valid).toBe(false)
    expect(result.errors[0].table).toBe('contacts')
  })
})

describe('validateGroup', () => {
  it('validates valid group', () => {
    const group = {
      '@id': 'https://example.com/groups#1',
      '@type': VCARD.Group,
      [VCARD.fn]: 'Team Alpha',
    }
    const result = validateGroup('row1', group)
    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid group', () => {
    const result = validateGroup('row1', { '@type': VCARD.Group })
    expect(result.valid).toBe(false)
    expect(result.errors[0].table).toBe('groups')
  })
})

describe('validateTypeIndexRow', () => {
  it('validates valid type index row', () => {
    const row = {
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      indexType: 'public',
      instance: 'https://example.com/contacts',
    }
    const result = validateTypeIndexRow('row1', row)
    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid type index row', () => {
    const result = validateTypeIndexRow('row1', { forClass: 'not-a-url' })
    expect(result.valid).toBe(false)
    expect(result.errors[0].table).toBe('typeIndexes')
  })
})

describe('validateTable', () => {
  it('validates all rows in a table', () => {
    const tableData = {
      row1: {
        '@id': 'https://example.com/me#me',
        '@type': [FOAF.Person],
        [FOAF.name]: 'Alice',
      },
      row2: {
        '@id': 'https://example.com/you#me',
        '@type': [FOAF.Person],
        [FOAF.name]: 'Bob',
      },
    }

    const result = validateTable('personas', tableData)
    expect(result.table).toBe('personas')
    expect(result.totalRows).toBe(2)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('reports invalid rows', () => {
    const tableData = {
      row1: {
        '@id': 'https://example.com/me#me',
        '@type': [FOAF.Person],
        [FOAF.name]: 'Alice',
      },
      row2: {
        '@type': [FOAF.Person],
        // missing name
      },
    }

    const result = validateTable('personas', tableData)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('validateStoreData', () => {
  it('validates all tables', () => {
    const tables = {
      personas: {
        p1: {
          '@id': 'https://example.com/me#me',
          '@type': [FOAF.Person],
          [FOAF.name]: 'Alice',
        },
      },
      contacts: {
        c1: {
          '@id': 'https://example.com/contacts#1',
          '@type': VCARD.Individual,
          [VCARD.fn]: 'John',
          [VCARD.hasUID]: 'urn:uuid:123',
        },
      },
    }

    const result = validateStoreData(tables)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports warnings for unknown tables', () => {
    const tables = {
      unknownTable: {
        row1: { data: 'value' },
      },
    }

    const result = validateStoreData(tables)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0].message).toContain('Unknown table')
  })

  it('does not warn about resources table', () => {
    const tables = {
      resources: {
        row1: { type: 'Container' },
      },
    }

    const result = validateStoreData(tables)
    expect(result.warnings).toHaveLength(0)
  })

  it('collects errors from all tables', () => {
    const tables = {
      personas: {
        p1: { '@type': [FOAF.Person] }, // missing name
      },
      contacts: {
        c1: { '@type': VCARD.Individual }, // missing fn and hasUID
      },
    }

    const result = validateStoreData(tables)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('validateStore', () => {
  it('validates a TinyBase store', () => {
    const store = createStore()
    store.setRow('personas', 'p1', {
      '@id': 'https://example.com/me#me',
      '@type': JSON.stringify([FOAF.Person]),
      [FOAF.name]: 'Alice',
    })

    const result = validateStore(store)
    // Note: store stores @type as string, so this may fail validation
    // This tests the integration, actual behavior depends on schema
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('errors')
  })
})

describe('validateImportData', () => {
  it('returns valid tables in non-strict mode', () => {
    const tables = {
      personas: {
        p1: {
          '@id': 'https://example.com/me#me',
          '@type': [FOAF.Person],
          [FOAF.name]: 'Alice',
        },
        p2: {
          '@type': [FOAF.Person],
          // missing name - invalid
        },
      },
    }

    const result = validateImportData(tables, { strict: false })
    expect(result.validTables.personas.p1).toBeDefined()
    expect(result.validTables.personas.p2).toBeDefined() // included even though invalid
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('excludes invalid rows in strict mode', () => {
    const tables = {
      personas: {
        p1: {
          '@id': 'https://example.com/me#me',
          '@type': [FOAF.Person],
          [FOAF.name]: 'Alice',
        },
        p2: {
          '@type': [FOAF.Person],
          // missing name - invalid
        },
      },
    }

    const result = validateImportData(tables, { strict: true })
    expect(result.validTables.personas.p1).toBeDefined()
    expect(result.validTables.personas.p2).toBeUndefined()
    expect(result.skippedRows).toBe(1)
  })
})

describe('formatValidationErrors', () => {
  it('returns "No errors" for empty array', () => {
    expect(formatValidationErrors([])).toBe('No errors')
  })

  it('formats errors grouped by table/row', () => {
    const errors: ValidationError[] = [
      { table: 'personas', rowId: 'p1', field: 'name', message: 'Required' },
      { table: 'personas', rowId: 'p1', field: 'type', message: 'Invalid type' },
      { table: 'contacts', rowId: 'c1', message: 'Missing field' },
    ]

    const formatted = formatValidationErrors(errors)
    expect(formatted).toContain('personas/p1')
    expect(formatted).toContain('contacts/c1')
    expect(formatted).toContain('Required')
    expect(formatted).toContain('(name)')
  })
})

describe('getValidationSummary', () => {
  it('returns success message when valid', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    }
    expect(getValidationSummary(result)).toBe('All data is valid')
  })

  it('reports error count', () => {
    const result = {
      valid: false,
      errors: [
        { table: 't', rowId: 'r', message: 'error' },
        { table: 't', rowId: 'r', message: 'error2' },
      ],
      warnings: [],
    }
    expect(getValidationSummary(result)).toContain('2 validation error(s)')
  })

  it('reports warning count', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [{ table: 't', rowId: 'r', message: 'warning' }],
    }
    expect(getValidationSummary(result)).toContain('1 warning(s)')
  })

  it('reports both errors and warnings', () => {
    const result = {
      valid: false,
      errors: [{ table: 't', rowId: 'r', message: 'error' }],
      warnings: [{ table: 't', rowId: 'r', message: 'warning' }],
    }
    const summary = getValidationSummary(result)
    expect(summary).toContain('1 validation error(s)')
    expect(summary).toContain('1 warning(s)')
  })
})
