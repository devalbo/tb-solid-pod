import { describe, it, expect } from 'vitest'
import { FOAF, VCARD, LDP } from '@inrupt/vocab-common-rdf'
import { SOLID, WS } from '@inrupt/vocab-solid-common'
import {
  PersonaSchema,
  PersonaInputSchema,
  createPersona,
  parsePersona,
  safeParsePersona,
  isPersona,
} from '../../../src/schemas/persona'

const BASE_URL = 'https://pod.example.com'

describe('PersonaSchema', () => {
  const validPersona = {
    '@id': 'https://pod.example.com/profiles/123#me',
    '@type': [FOAF.Person],
    [FOAF.name]: 'Alice Smith',
  }

  it('validates a minimal persona', () => {
    const result = PersonaSchema.safeParse(validPersona)
    expect(result.success).toBe(true)
  })

  it('validates a persona with all fields', () => {
    const fullPersona = {
      ...validPersona,
      [FOAF.nick]: 'alice',
      [FOAF.givenName]: 'Alice',
      [FOAF.familyName]: 'Smith',
      [VCARD.hasEmail]: 'mailto:alice@example.com',
      [VCARD.hasTelephone]: 'tel:+1234567890',
      [FOAF.img]: 'https://example.com/alice.jpg',
      [VCARD.note]: 'A note about Alice',
      [FOAF.homepage]: 'https://alice.example.com',
      [SOLID.oidcIssuer]: { '@id': 'https://idp.example.com' },
      [SOLID.publicTypeIndex]: { '@id': 'https://pod.example.com/settings/publicTypeIndex' },
      [SOLID.privateTypeIndex]: { '@id': 'https://pod.example.com/settings/privateTypeIndex' },
      [LDP.inbox]: { '@id': 'https://pod.example.com/inbox/' },
      [WS.preferencesFile]: { '@id': 'https://pod.example.com/settings/prefs' },
    }

    const result = PersonaSchema.safeParse(fullPersona)
    expect(result.success).toBe(true)
  })

  it('validates persona with multiple emails', () => {
    const persona = {
      ...validPersona,
      [VCARD.hasEmail]: ['mailto:alice@work.com', 'mailto:alice@home.com'],
    }
    expect(PersonaSchema.safeParse(persona).success).toBe(true)
  })

  it('rejects persona without foaf:Person type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/profiles/123#me',
      '@type': ['http://www.w3.org/2006/vcard/ns#Individual'],
      [FOAF.name]: 'Alice',
    }
    const result = PersonaSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects persona without name', () => {
    const invalid = {
      '@id': 'https://pod.example.com/profiles/123#me',
      '@type': [FOAF.Person],
    }
    const result = PersonaSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects persona with empty name', () => {
    const invalid = {
      ...validPersona,
      [FOAF.name]: '',
    }
    const result = PersonaSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('PersonaInputSchema', () => {
  it('validates minimal input', () => {
    const result = PersonaInputSchema.safeParse({ name: 'Alice' })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      id: 'https://pod.example.com/me#me',
      name: 'Alice Smith',
      nickname: 'alice',
      givenName: 'Alice',
      familyName: 'Smith',
      email: 'alice@example.com',
      additionalEmails: ['alice@work.com'],
      phone: '+1234567890',
      image: 'https://example.com/alice.jpg',
      bio: 'Software developer',
      homepage: 'https://alice.example.com',
      oidcIssuer: 'https://idp.example.com',
      inbox: 'https://pod.example.com/inbox/',
      preferencesFile: 'https://pod.example.com/settings/prefs',
      publicTypeIndex: 'https://pod.example.com/settings/publicTypeIndex',
      privateTypeIndex: 'https://pod.example.com/settings/privateTypeIndex',
    }

    const result = PersonaInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = PersonaInputSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = PersonaInputSchema.safeParse({ name: 'Alice', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(PersonaInputSchema.safeParse({ name: 'Alice', homepage: 'not-a-url' }).success).toBe(false)
    expect(PersonaInputSchema.safeParse({ name: 'Alice', image: 'not-a-url' }).success).toBe(false)
  })
})

describe('createPersona', () => {
  it('creates a valid persona with minimal input', () => {
    const persona = createPersona({ name: 'Alice' }, BASE_URL)

    expect(persona['@id']).toMatch(/^https:\/\/pod\.example\.com\/profiles\/[a-f0-9-]+#me$/)
    expect(persona['@type']).toContain(FOAF.Person)
    expect(persona[FOAF.name]).toBe('Alice')
    expect(persona[FOAF.isPrimaryTopicOf]).toBeDefined()
  })

  it('creates a persona with custom id', () => {
    const persona = createPersona({
      id: 'https://custom.example.com/me#me',
      name: 'Alice',
    }, BASE_URL)

    expect(persona['@id']).toBe('https://custom.example.com/me#me')
  })

  it('adds email as mailto URI', () => {
    const persona = createPersona({
      name: 'Alice',
      email: 'alice@example.com',
    }, BASE_URL)

    expect(persona[VCARD.hasEmail]).toBe('mailto:alice@example.com')
  })

  it('handles multiple emails', () => {
    const persona = createPersona({
      name: 'Alice',
      email: 'alice@example.com',
      additionalEmails: ['alice@work.com'],
    }, BASE_URL)

    expect(persona[VCARD.hasEmail]).toEqual(['mailto:alice@example.com', 'mailto:alice@work.com'])
  })

  it('adds phone as tel URI and removes spaces', () => {
    const persona = createPersona({
      name: 'Alice',
      phone: '+1 234 567 890',
    }, BASE_URL)

    expect(persona[VCARD.hasTelephone]).toBe('tel:+1234567890')
  })

  it('adds optional profile fields', () => {
    const persona = createPersona({
      name: 'Alice',
      nickname: 'alice',
      givenName: 'Alice',
      familyName: 'Smith',
      bio: 'Developer',
      homepage: 'https://alice.example.com',
      image: 'https://example.com/alice.jpg',
    }, BASE_URL)

    expect(persona[FOAF.nick]).toBe('alice')
    expect(persona[FOAF.givenName]).toBe('Alice')
    expect(persona[FOAF.familyName]).toBe('Smith')
    expect(persona[VCARD.note]).toBe('Developer')
    expect(persona[FOAF.homepage]).toBe('https://alice.example.com')
    expect(persona[FOAF.img]).toBe('https://example.com/alice.jpg')
  })

  it('adds WebID profile fields as NodeRefs', () => {
    const persona = createPersona({
      name: 'Alice',
      oidcIssuer: 'https://idp.example.com',
      inbox: 'https://pod.example.com/inbox/',
      preferencesFile: 'https://pod.example.com/settings/prefs',
      publicTypeIndex: 'https://pod.example.com/settings/publicTypeIndex',
      privateTypeIndex: 'https://pod.example.com/settings/privateTypeIndex',
    }, BASE_URL)

    expect(persona[SOLID.oidcIssuer]).toEqual({ '@id': 'https://idp.example.com' })
    expect(persona[LDP.inbox]).toEqual({ '@id': 'https://pod.example.com/inbox/' })
    expect(persona[WS.preferencesFile]).toEqual({ '@id': 'https://pod.example.com/settings/prefs' })
    expect(persona[SOLID.publicTypeIndex]).toEqual({ '@id': 'https://pod.example.com/settings/publicTypeIndex' })
    expect(persona[SOLID.privateTypeIndex]).toEqual({ '@id': 'https://pod.example.com/settings/privateTypeIndex' })
  })

  it('includes @context', () => {
    const persona = createPersona({ name: 'Alice' }, BASE_URL)
    expect(persona['@context']).toBeDefined()
  })
})

describe('parsePersona', () => {
  it('parses valid persona data', () => {
    const data = {
      '@id': 'https://pod.example.com/me#me',
      '@type': [FOAF.Person],
      [FOAF.name]: 'Alice',
    }

    const persona = parsePersona(data)
    expect(persona[FOAF.name]).toBe('Alice')
  })

  it('throws on invalid data', () => {
    expect(() => parsePersona({})).toThrow()
    expect(() => parsePersona({ [FOAF.name]: 'Alice' })).toThrow()
  })
})

describe('safeParsePersona', () => {
  it('returns success for valid data', () => {
    const data = {
      '@id': 'https://pod.example.com/me#me',
      '@type': [FOAF.Person],
      [FOAF.name]: 'Alice',
    }

    const result = safeParsePersona(data)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid data', () => {
    const result = safeParsePersona({})
    expect(result.success).toBe(false)
  })
})

describe('isPersona', () => {
  it('returns true for valid persona', () => {
    const persona = createPersona({ name: 'Alice' }, BASE_URL)
    expect(isPersona(persona)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isPersona({})).toBe(false)
    expect(isPersona({ name: 'Alice' })).toBe(false)
    expect(isPersona(null)).toBe(false)
  })
})
