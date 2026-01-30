import { describe, it, expect } from 'vitest'
import {
  IRI,
  NodeRef,
  TypedLiteral,
  Literal,
  JsonLdBase,
  oneOrMany,
  generateUID,
  iri,
  isNodeRef,
  getId,
  toArray,
  nowISO,
  NS,
  POD_CONTEXT,
} from '../../../src/schemas/base'

describe('IRI schema', () => {
  it('validates valid URLs', () => {
    expect(IRI.safeParse('https://example.com').success).toBe(true)
    expect(IRI.safeParse('http://example.org/path').success).toBe(true)
    expect(IRI.safeParse('https://example.com/path?query=1#fragment').success).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(IRI.safeParse('not-a-url').success).toBe(false)
    expect(IRI.safeParse('').success).toBe(false)
    expect(IRI.safeParse(123).success).toBe(false)
  })
})

describe('NodeRef schema', () => {
  it('validates valid node references', () => {
    const result = NodeRef.safeParse({ '@id': 'https://example.com/resource' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data['@id']).toBe('https://example.com/resource')
    }
  })

  it('rejects invalid node references', () => {
    expect(NodeRef.safeParse({ '@id': 'not-a-url' }).success).toBe(false)
    expect(NodeRef.safeParse({}).success).toBe(false)
    expect(NodeRef.safeParse({ id: 'https://example.com' }).success).toBe(false)
  })
})

describe('TypedLiteral schema', () => {
  it('validates typed literals', () => {
    const result = TypedLiteral.safeParse({
      '@value': 'hello',
      '@type': 'http://www.w3.org/2001/XMLSchema#string',
    })
    expect(result.success).toBe(true)
  })

  it('validates literals with language tag', () => {
    const result = TypedLiteral.safeParse({
      '@value': 'bonjour',
      '@language': 'fr',
    })
    expect(result.success).toBe(true)
  })

  it('validates minimal typed literal', () => {
    const result = TypedLiteral.safeParse({ '@value': 'test' })
    expect(result.success).toBe(true)
  })
})

describe('Literal schema', () => {
  it('validates string literals', () => {
    expect(Literal.safeParse('hello').success).toBe(true)
  })

  it('validates number literals', () => {
    expect(Literal.safeParse(42).success).toBe(true)
    expect(Literal.safeParse(3.14).success).toBe(true)
  })

  it('validates boolean literals', () => {
    expect(Literal.safeParse(true).success).toBe(true)
    expect(Literal.safeParse(false).success).toBe(true)
  })

  it('validates typed literals', () => {
    expect(Literal.safeParse({ '@value': 'test' }).success).toBe(true)
  })
})

describe('JsonLdBase schema', () => {
  it('validates documents with @id', () => {
    const result = JsonLdBase.safeParse({
      '@id': 'https://example.com/doc',
    })
    expect(result.success).toBe(true)
  })

  it('validates documents with @type', () => {
    const result = JsonLdBase.safeParse({
      '@type': 'http://xmlns.com/foaf/0.1/Person',
    })
    expect(result.success).toBe(true)
  })

  it('validates documents with array @type', () => {
    const result = JsonLdBase.safeParse({
      '@type': ['http://xmlns.com/foaf/0.1/Person', 'http://www.w3.org/2006/vcard/ns#Individual'],
    })
    expect(result.success).toBe(true)
  })

  it('allows passthrough properties', () => {
    const result = JsonLdBase.safeParse({
      '@id': 'https://example.com',
      customProperty: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customProperty).toBe('value')
    }
  })
})

describe('oneOrMany helper', () => {
  it('creates schema accepting single values', () => {
    const schema = oneOrMany(IRI)
    expect(schema.safeParse('https://example.com').success).toBe(true)
  })

  it('creates schema accepting arrays', () => {
    const schema = oneOrMany(IRI)
    expect(schema.safeParse(['https://a.com', 'https://b.com']).success).toBe(true)
  })
})

describe('generateUID', () => {
  it('generates valid URN UUIDs', () => {
    const uid = generateUID()
    expect(uid).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique UIDs', () => {
    const uid1 = generateUID()
    const uid2 = generateUID()
    expect(uid1).not.toBe(uid2)
  })
})

describe('iri function', () => {
  it('creates IRIs from namespace and local name', () => {
    expect(iri('foaf', 'Person')).toBe('http://xmlns.com/foaf/0.1/Person')
    expect(iri('vcard', 'Individual')).toBe('http://www.w3.org/2006/vcard/ns#Individual')
    expect(iri('solid', 'TypeIndex')).toBe('http://www.w3.org/ns/solid/terms#TypeIndex')
  })
})

describe('isNodeRef', () => {
  it('returns true for valid node references', () => {
    expect(isNodeRef({ '@id': 'https://example.com' })).toBe(true)
  })

  it('returns false for non-objects', () => {
    expect(isNodeRef('string')).toBe(false)
    expect(isNodeRef(123)).toBe(false)
    expect(isNodeRef(null)).toBe(false)
    expect(isNodeRef(undefined)).toBe(false)
  })

  it('returns false for objects without @id', () => {
    expect(isNodeRef({})).toBe(false)
    expect(isNodeRef({ id: 'test' })).toBe(false)
  })
})

describe('getId', () => {
  it('extracts @id from NodeRef', () => {
    expect(getId({ '@id': 'https://example.com' })).toBe('https://example.com')
  })

  it('returns string as-is', () => {
    expect(getId('https://example.com')).toBe('https://example.com')
  })
})

describe('toArray', () => {
  it('wraps single values in array', () => {
    expect(toArray('single')).toEqual(['single'])
    expect(toArray(42)).toEqual([42])
  })

  it('returns arrays unchanged', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3])
    expect(toArray(['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('nowISO', () => {
  it('returns valid ISO date string', () => {
    const iso = nowISO()
    expect(new Date(iso).toISOString()).toBe(iso)
  })
})

describe('NS constants', () => {
  it('has all expected namespaces', () => {
    expect(NS.foaf).toBe('http://xmlns.com/foaf/0.1/')
    expect(NS.vcard).toBe('http://www.w3.org/2006/vcard/ns#')
    expect(NS.solid).toBe('http://www.w3.org/ns/solid/terms#')
    expect(NS.ldp).toBe('http://www.w3.org/ns/ldp#')
  })
})

describe('POD_CONTEXT', () => {
  it('has required prefixes', () => {
    expect(POD_CONTEXT['@vocab']).toBe('http://www.w3.org/2006/vcard/ns#')
    expect(POD_CONTEXT.foaf).toBe('http://xmlns.com/foaf/0.1/')
    expect(POD_CONTEXT.solid).toBe('http://www.w3.org/ns/solid/terms#')
  })
})
