import { describe, it, expect } from 'vitest'
import {
  TypeRegistrationSchema,
  TypeIndexSchema,
  TypeRegistrationInputSchema,
  TypeIndexRowSchema,
  TypeIndexTypeEnum,
  createTypeRegistration,
  createTypeIndex,
  getClassDisplayName,
  resolveClassIri,
  parseTypeRegistration,
  safeParseTypeRegistration,
  parseTypeIndex,
  safeParseTypeIndex,
  isTypeRegistration,
  isTypeIndex,
  SOLID,
  COMMON_TYPES,
} from '../../../src/schemas/typeIndex'

const BASE_URL = 'https://pod.example.com/'

describe('TypeRegistrationSchema', () => {
  const validRegistration = {
    '@type': SOLID.TypeRegistration,
    [SOLID.forClass]: { '@id': 'http://www.w3.org/2006/vcard/ns#Individual' },
    [SOLID.instance]: { '@id': 'https://pod.example.com/contacts/people' },
  }

  it('validates a minimal registration with instance', () => {
    const result = TypeRegistrationSchema.safeParse(validRegistration)
    expect(result.success).toBe(true)
  })

  it('validates registration with instanceContainer', () => {
    const registration = {
      '@type': SOLID.TypeRegistration,
      [SOLID.forClass]: { '@id': 'http://www.w3.org/2006/vcard/ns#Individual' },
      [SOLID.instanceContainer]: { '@id': 'https://pod.example.com/contacts/' },
    }
    expect(TypeRegistrationSchema.safeParse(registration).success).toBe(true)
  })

  it('validates registration with multiple instances', () => {
    const registration = {
      '@type': SOLID.TypeRegistration,
      [SOLID.forClass]: { '@id': 'http://xmlns.com/foaf/0.1/Person' },
      [SOLID.instance]: [
        { '@id': 'https://pod.example.com/profile#me' },
        { '@id': 'https://pod.example.com/work-profile#me' },
      ],
    }
    expect(TypeRegistrationSchema.safeParse(registration).success).toBe(true)
  })

  it('validates registration with both instance and instanceContainer', () => {
    const registration = {
      ...validRegistration,
      [SOLID.instanceContainer]: { '@id': 'https://pod.example.com/contacts/' },
    }
    expect(TypeRegistrationSchema.safeParse(registration).success).toBe(true)
  })

  it('rejects registration without forClass', () => {
    const invalid = {
      '@type': SOLID.TypeRegistration,
      [SOLID.instance]: { '@id': 'https://pod.example.com/contacts/people' },
    }
    expect(TypeRegistrationSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects wrong type', () => {
    const invalid = {
      '@type': 'http://example.com/WrongType',
      [SOLID.forClass]: { '@id': 'http://www.w3.org/2006/vcard/ns#Individual' },
      [SOLID.instance]: { '@id': 'https://pod.example.com/contacts/people' },
    }
    expect(TypeRegistrationSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('TypeIndexSchema', () => {
  const validTypeIndex = {
    '@id': 'https://pod.example.com/settings/publicTypeIndex',
    '@type': [SOLID.TypeIndex, SOLID.ListedDocument],
  }

  it('validates a type index', () => {
    const result = TypeIndexSchema.safeParse(validTypeIndex)
    expect(result.success).toBe(true)
  })

  it('validates private type index', () => {
    const typeIndex = {
      '@id': 'https://pod.example.com/settings/privateTypeIndex',
      '@type': [SOLID.TypeIndex, SOLID.UnlistedDocument],
    }
    expect(TypeIndexSchema.safeParse(typeIndex).success).toBe(true)
  })

  it('validates type index with single type', () => {
    const typeIndex = {
      '@id': 'https://pod.example.com/settings/typeIndex',
      '@type': SOLID.TypeIndex,
    }
    expect(TypeIndexSchema.safeParse(typeIndex).success).toBe(true)
  })

  it('rejects type index without TypeIndex type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/settings/notAnIndex',
      '@type': [SOLID.ListedDocument],
    }
    expect(TypeIndexSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('TypeIndexTypeEnum', () => {
  it('accepts public', () => {
    expect(TypeIndexTypeEnum.safeParse('public').success).toBe(true)
  })

  it('accepts private', () => {
    expect(TypeIndexTypeEnum.safeParse('private').success).toBe(true)
  })

  it('rejects invalid types', () => {
    expect(TypeIndexTypeEnum.safeParse('protected').success).toBe(false)
    expect(TypeIndexTypeEnum.safeParse('').success).toBe(false)
  })
})

describe('TypeRegistrationInputSchema', () => {
  it('validates input with instance', () => {
    const result = TypeRegistrationInputSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      instance: 'https://pod.example.com/contacts/people',
      indexType: 'public',
    })
    expect(result.success).toBe(true)
  })

  it('validates input with instanceContainer', () => {
    const result = TypeRegistrationInputSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      instanceContainer: 'https://pod.example.com/contacts/',
      indexType: 'private',
    })
    expect(result.success).toBe(true)
  })

  it('validates input with multiple instances', () => {
    const result = TypeRegistrationInputSchema.safeParse({
      forClass: 'http://xmlns.com/foaf/0.1/Person',
      instance: [
        'https://pod.example.com/profile#me',
        'https://pod.example.com/work#me',
      ],
      indexType: 'public',
    })
    expect(result.success).toBe(true)
  })

  it('rejects input without instance or instanceContainer', () => {
    const result = TypeRegistrationInputSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      indexType: 'public',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid forClass URL', () => {
    const result = TypeRegistrationInputSchema.safeParse({
      forClass: 'not-a-url',
      instance: 'https://pod.example.com/contacts/people',
      indexType: 'public',
    })
    expect(result.success).toBe(false)
  })
})

describe('TypeIndexRowSchema', () => {
  it('validates row with instance', () => {
    const result = TypeIndexRowSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      indexType: 'public',
      instance: 'https://pod.example.com/contacts/people',
    })
    expect(result.success).toBe(true)
  })

  it('validates row with instanceContainer', () => {
    const result = TypeIndexRowSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      indexType: 'private',
      instanceContainer: 'https://pod.example.com/contacts/',
    })
    expect(result.success).toBe(true)
  })

  it('validates row with JSON array instance', () => {
    const result = TypeIndexRowSchema.safeParse({
      forClass: 'http://xmlns.com/foaf/0.1/Person',
      indexType: 'public',
      instance: '["https://pod.example.com/profile#me","https://pod.example.com/work#me"]',
    })
    expect(result.success).toBe(true)
  })

  it('rejects row without instance or instanceContainer', () => {
    const result = TypeIndexRowSchema.safeParse({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      indexType: 'public',
    })
    expect(result.success).toBe(false)
  })
})

describe('createTypeRegistration', () => {
  it('creates registration with single instance', () => {
    const registration = createTypeRegistration({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      instance: 'https://pod.example.com/contacts/people',
      indexType: 'public',
    })

    expect(registration['@type']).toBe(SOLID.TypeRegistration)
    expect(registration[SOLID.forClass]).toEqual({ '@id': 'http://www.w3.org/2006/vcard/ns#Individual' })
    expect(registration[SOLID.instance]).toEqual({ '@id': 'https://pod.example.com/contacts/people' })
  })

  it('creates registration with multiple instances', () => {
    const registration = createTypeRegistration({
      forClass: 'http://xmlns.com/foaf/0.1/Person',
      instance: [
        'https://pod.example.com/profile#me',
        'https://pod.example.com/work#me',
      ],
      indexType: 'public',
    })

    expect(registration[SOLID.instance]).toEqual([
      { '@id': 'https://pod.example.com/profile#me' },
      { '@id': 'https://pod.example.com/work#me' },
    ])
  })

  it('creates registration with instanceContainer', () => {
    const registration = createTypeRegistration({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      instanceContainer: 'https://pod.example.com/contacts/',
      indexType: 'private',
    })

    expect(registration[SOLID.instanceContainer]).toEqual({ '@id': 'https://pod.example.com/contacts/' })
    expect(registration[SOLID.instance]).toBeUndefined()
  })
})

describe('createTypeIndex', () => {
  it('creates public type index', () => {
    const index = createTypeIndex('public', BASE_URL)

    expect(index['@id']).toBe('https://pod.example.com/settings/publicTypeIndex')
    expect(index['@type']).toContain(SOLID.TypeIndex)
    expect(index['@type']).toContain(SOLID.ListedDocument)
    expect(index.registrations).toEqual([])
  })

  it('creates private type index', () => {
    const index = createTypeIndex('private', BASE_URL)

    expect(index['@id']).toBe('https://pod.example.com/settings/privateTypeIndex')
    expect(index['@type']).toContain(SOLID.TypeIndex)
    expect(index['@type']).toContain(SOLID.UnlistedDocument)
  })

  it('creates type index with registrations', () => {
    const registrations = [
      createTypeRegistration({
        forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
        instance: 'https://pod.example.com/contacts/people',
        indexType: 'public',
      }),
    ]

    const index = createTypeIndex('public', BASE_URL, registrations)
    expect(index.registrations).toHaveLength(1)
  })

  it('includes @context', () => {
    const index = createTypeIndex('public', BASE_URL)
    expect(index['@context']).toBeDefined()
  })
})

describe('getClassDisplayName', () => {
  it('returns friendly name for common types', () => {
    expect(getClassDisplayName('http://www.w3.org/2006/vcard/ns#Individual')).toBe('vcard:Individual')
    expect(getClassDisplayName('http://xmlns.com/foaf/0.1/Person')).toBe('foaf:Person')
    expect(getClassDisplayName('https://schema.org/SoftwareApplication')).toBe('schema:SoftwareApplication')
  })

  it('extracts local name from unknown IRI with hash', () => {
    expect(getClassDisplayName('http://example.com/vocab#CustomType')).toBe('CustomType')
  })

  it('extracts local name from unknown IRI with slash', () => {
    expect(getClassDisplayName('http://example.com/vocab/CustomType')).toBe('CustomType')
  })

  it('returns full IRI if no separator found', () => {
    expect(getClassDisplayName('CustomType')).toBe('CustomType')
  })
})

describe('resolveClassIri', () => {
  it('returns URL as-is', () => {
    expect(resolveClassIri('http://example.com/Type')).toBe('http://example.com/Type')
    expect(resolveClassIri('https://example.com/Type')).toBe('https://example.com/Type')
  })

  it('resolves common type names', () => {
    expect(resolveClassIri('vcard:Individual')).toBe('http://www.w3.org/2006/vcard/ns#Individual')
    expect(resolveClassIri('foaf:Person')).toBe('http://xmlns.com/foaf/0.1/Person')
    expect(resolveClassIri('schema:SoftwareApplication')).toBe('https://schema.org/SoftwareApplication')
  })

  it('returns unknown names as-is', () => {
    expect(resolveClassIri('unknown:Type')).toBe('unknown:Type')
  })
})

describe('parseTypeRegistration', () => {
  it('parses valid registration', () => {
    const data = {
      '@type': SOLID.TypeRegistration,
      [SOLID.forClass]: { '@id': 'http://www.w3.org/2006/vcard/ns#Individual' },
      [SOLID.instance]: { '@id': 'https://pod.example.com/contacts/people' },
    }

    const registration = parseTypeRegistration(data)
    expect(registration['@type']).toBe(SOLID.TypeRegistration)
  })

  it('throws on invalid data', () => {
    expect(() => parseTypeRegistration({})).toThrow()
  })
})

describe('safeParseTypeRegistration', () => {
  it('returns success for valid data', () => {
    const data = {
      '@type': SOLID.TypeRegistration,
      [SOLID.forClass]: { '@id': 'http://www.w3.org/2006/vcard/ns#Individual' },
      [SOLID.instance]: { '@id': 'https://pod.example.com/contacts/people' },
    }

    const result = safeParseTypeRegistration(data)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid data', () => {
    const result = safeParseTypeRegistration({})
    expect(result.success).toBe(false)
  })
})

describe('parseTypeIndex', () => {
  it('parses valid type index', () => {
    const data = {
      '@id': 'https://pod.example.com/settings/publicTypeIndex',
      '@type': [SOLID.TypeIndex, SOLID.ListedDocument],
    }

    const index = parseTypeIndex(data)
    expect(index['@type']).toContain(SOLID.TypeIndex)
  })

  it('throws on invalid data', () => {
    expect(() => parseTypeIndex({})).toThrow()
  })
})

describe('safeParseTypeIndex', () => {
  it('returns success for valid data', () => {
    const data = {
      '@id': 'https://pod.example.com/settings/publicTypeIndex',
      '@type': SOLID.TypeIndex,
    }

    const result = safeParseTypeIndex(data)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid data', () => {
    const result = safeParseTypeIndex({})
    expect(result.success).toBe(false)
  })
})

describe('isTypeRegistration', () => {
  it('returns true for valid registration', () => {
    const registration = createTypeRegistration({
      forClass: 'http://www.w3.org/2006/vcard/ns#Individual',
      instance: 'https://pod.example.com/contacts/people',
      indexType: 'public',
    })
    expect(isTypeRegistration(registration)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isTypeRegistration({})).toBe(false)
    expect(isTypeRegistration(null)).toBe(false)
  })
})

describe('isTypeIndex', () => {
  it('returns true for valid type index', () => {
    const index = createTypeIndex('public', BASE_URL)
    expect(isTypeIndex(index)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isTypeIndex({})).toBe(false)
    expect(isTypeIndex(null)).toBe(false)
  })
})

describe('SOLID constants', () => {
  it('has correct namespace', () => {
    expect(SOLID.NAMESPACE).toBe('http://www.w3.org/ns/solid/terms#')
  })

  it('has expected terms', () => {
    expect(SOLID.TypeIndex).toBe('http://www.w3.org/ns/solid/terms#TypeIndex')
    expect(SOLID.TypeRegistration).toBe('http://www.w3.org/ns/solid/terms#TypeRegistration')
    expect(SOLID.forClass).toBe('http://www.w3.org/ns/solid/terms#forClass')
  })
})

describe('COMMON_TYPES', () => {
  it('has vcard types', () => {
    expect(COMMON_TYPES['vcard:Individual']).toBe('http://www.w3.org/2006/vcard/ns#Individual')
    expect(COMMON_TYPES['vcard:Group']).toBe('http://www.w3.org/2006/vcard/ns#Group')
  })

  it('has foaf types', () => {
    expect(COMMON_TYPES['foaf:Person']).toBe('http://xmlns.com/foaf/0.1/Person')
    expect(COMMON_TYPES['foaf:Group']).toBe('http://xmlns.com/foaf/0.1/Group')
  })

  it('has schema.org types', () => {
    expect(COMMON_TYPES['schema:Person']).toBe('https://schema.org/Person')
    expect(COMMON_TYPES['schema:SoftwareApplication']).toBe('https://schema.org/SoftwareApplication')
  })
})
