import { describe, it, expect } from 'vitest'
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf'
import { SOLID } from '@inrupt/vocab-solid-common'
import {
  ContactSchema,
  AddressBookSchema,
  AgentContactSchema,
  ContactInputSchema,
  createContact,
  createAddressBook,
  parseContact,
  safeParseContact,
  isContact,
} from '../../../src/schemas/contact'

const BASE_URL = 'https://pod.example.com'

describe('ContactSchema', () => {
  const validContact = {
    '@id': 'https://pod.example.com/contacts/people#abc',
    '@type': VCARD.Individual,
    [VCARD.fn]: 'John Doe',
    [VCARD.hasUID]: 'urn:uuid:12345',
  }

  it('validates a minimal contact', () => {
    const result = ContactSchema.safeParse(validContact)
    expect(result.success).toBe(true)
  })

  it('validates contact with all fields', () => {
    const fullContact = {
      ...validContact,
      [VCARD.nickname]: 'johnny',
      [VCARD.hasEmail]: 'mailto:john@example.com',
      [VCARD.hasTelephone]: 'tel:+1234567890',
      [VCARD.hasURL]: 'https://john.example.com',
      [VCARD.hasPhoto]: 'https://example.com/john.jpg',
      [VCARD.hasNote]: 'A note about John',
      [VCARD.hasOrganizationName]: 'Acme Corp',
      [VCARD.hasRole]: 'Developer',
      [SOLID.webid]: 'https://john.example.com/profile/card#me',
      [VCARD.hasRelated]: { '@id': 'https://pod.example.com/profiles/me#me' },
      [FOAF.knows]: { '@id': 'https://other.example.com/profile#me' },
    }

    const result = ContactSchema.safeParse(fullContact)
    expect(result.success).toBe(true)
  })

  it('validates contact with multiple emails', () => {
    const contact = {
      ...validContact,
      [VCARD.hasEmail]: ['mailto:john@work.com', 'mailto:john@home.com'],
    }
    expect(ContactSchema.safeParse(contact).success).toBe(true)
  })

  it('validates contact with array type', () => {
    const contact = {
      ...validContact,
      '@type': [VCARD.Individual, 'https://schema.org/Person'],
    }
    expect(ContactSchema.safeParse(contact).success).toBe(true)
  })

  it('rejects contact without name', () => {
    const invalid = {
      '@id': 'https://pod.example.com/contacts/people#abc',
      '@type': VCARD.Individual,
      [VCARD.hasUID]: 'urn:uuid:12345',
    }
    expect(ContactSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects contact with empty name', () => {
    const invalid = { ...validContact, [VCARD.fn]: '' }
    expect(ContactSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('AddressBookSchema', () => {
  const validAddressBook = {
    '@id': 'https://pod.example.com/contacts/index#this',
    '@type': 'http://www.w3.org/2006/vcard/ns#AddressBook',
    'http://purl.org/dc/terms/title': 'My Contacts',
  }

  it('validates a minimal address book', () => {
    const result = AddressBookSchema.safeParse(validAddressBook)
    expect(result.success).toBe(true)
  })

  it('validates address book with name email index', () => {
    const addressBook = {
      ...validAddressBook,
      'http://www.w3.org/2006/vcard/ns#nameEmailIndex': {
        '@id': 'https://pod.example.com/contacts/people',
      },
    }
    expect(AddressBookSchema.safeParse(addressBook).success).toBe(true)
  })

  it('rejects non-AddressBook type', () => {
    const invalid = {
      ...validAddressBook,
      '@type': VCARD.Individual,
    }
    expect(AddressBookSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('AgentContactSchema', () => {
  const validAgent = {
    '@id': 'https://pod.example.com/contacts/people#agent1',
    '@type': [VCARD.Individual, 'https://schema.org/SoftwareApplication'],
    [VCARD.fn]: 'AI Assistant',
    [VCARD.hasUID]: 'urn:uuid:agent-123',
  }

  it('validates a valid agent contact', () => {
    const result = AgentContactSchema.safeParse(validAgent)
    expect(result.success).toBe(true)
  })

  it('validates agent with category and url', () => {
    const agent = {
      ...validAgent,
      'https://schema.org/applicationCategory': 'AI/Chatbot',
      'https://schema.org/url': 'https://api.example.com/agent',
    }
    expect(AgentContactSchema.safeParse(agent).success).toBe(true)
  })

  it('rejects contact without SoftwareApplication type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/contacts/people#abc',
      '@type': VCARD.Individual,
      [VCARD.fn]: 'Not an agent',
      [VCARD.hasUID]: 'urn:uuid:12345',
    }
    expect(AgentContactSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('ContactInputSchema', () => {
  it('validates minimal input', () => {
    const result = ContactInputSchema.safeParse({ name: 'John' })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      name: 'John Doe',
      nickname: 'johnny',
      email: 'john@example.com',
      additionalEmails: ['john@work.com'],
      phone: '+1234567890',
      url: 'https://john.example.com',
      photo: 'https://example.com/john.jpg',
      notes: 'A note',
      organization: 'Acme Corp',
      role: 'Developer',
      webId: 'https://john.example.com/profile#me',
      isAgent: false,
    }

    const result = ContactInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates agent input', () => {
    const input = {
      name: 'AI Assistant',
      isAgent: true,
      agentCategory: 'AI/Chatbot',
    }
    expect(ContactInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(ContactInputSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(ContactInputSchema.safeParse({ name: 'John', email: 'not-email' }).success).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(ContactInputSchema.safeParse({ name: 'John', url: 'not-url' }).success).toBe(false)
    expect(ContactInputSchema.safeParse({ name: 'John', photo: 'not-url' }).success).toBe(false)
    expect(ContactInputSchema.safeParse({ name: 'John', webId: 'not-url' }).success).toBe(false)
  })
})

describe('createContact', () => {
  it('creates a valid contact with minimal input', () => {
    const contact = createContact({ name: 'John Doe' }, BASE_URL)

    expect(contact['@id']).toMatch(/^https:\/\/pod\.example\.com\/contacts\/people#[a-f0-9-]+$/)
    expect(contact['@type']).toBe(VCARD.Individual)
    expect(contact[VCARD.fn]).toBe('John Doe')
    expect(contact[VCARD.hasUID]).toMatch(/^urn:uuid:/)
  })

  it('creates an agent contact when isAgent is true', () => {
    const contact = createContact({ name: 'AI Bot', isAgent: true }, BASE_URL)

    expect(contact['@type']).toContain(VCARD.Individual)
    expect(contact['@type']).toContain('https://schema.org/SoftwareApplication')
  })

  it('adds email as mailto URI', () => {
    const contact = createContact({
      name: 'John',
      email: 'john@example.com',
    }, BASE_URL)

    expect(contact[VCARD.hasEmail]).toBe('mailto:john@example.com')
  })

  it('handles multiple emails', () => {
    const contact = createContact({
      name: 'John',
      email: 'john@example.com',
      additionalEmails: ['john@work.com'],
    }, BASE_URL)

    expect(contact[VCARD.hasEmail]).toEqual(['mailto:john@example.com', 'mailto:john@work.com'])
  })

  it('adds phone as tel URI and removes spaces', () => {
    const contact = createContact({
      name: 'John',
      phone: '+1 234 567 890',
    }, BASE_URL)

    expect(contact[VCARD.hasTelephone]).toBe('tel:+1234567890')
  })

  it('adds optional fields', () => {
    const contact = createContact({
      name: 'John',
      nickname: 'johnny',
      url: 'https://john.example.com',
      photo: 'https://example.com/john.jpg',
      notes: 'A note',
      organization: 'Acme',
      role: 'Dev',
      webId: 'https://john.example.com/profile#me',
    }, BASE_URL)

    expect(contact[VCARD.nickname]).toBe('johnny')
    expect(contact[VCARD.hasURL]).toBe('https://john.example.com')
    expect(contact[VCARD.hasPhoto]).toBe('https://example.com/john.jpg')
    expect(contact[VCARD.hasNote]).toBe('A note')
    expect(contact[VCARD.hasOrganizationName]).toBe('Acme')
    expect(contact[VCARD.hasRole]).toBe('Dev')
    expect(contact[SOLID.webid]).toBe('https://john.example.com/profile#me')
  })

  it('adds agent category for agents', () => {
    const contact = createContact({
      name: 'AI Bot',
      isAgent: true,
      agentCategory: 'AI/Chatbot',
    }, BASE_URL)

    expect(contact['https://schema.org/applicationCategory']).toBe('AI/Chatbot')
  })

  it('includes @context', () => {
    const contact = createContact({ name: 'John' }, BASE_URL)
    expect(contact['@context']).toBeDefined()
  })
})

describe('createAddressBook', () => {
  it('creates a valid address book', () => {
    const book = createAddressBook('My Contacts', BASE_URL)

    expect(book['@id']).toBe('https://pod.example.com/contacts/index#this')
    expect(book['@type']).toBe('http://www.w3.org/2006/vcard/ns#AddressBook')
    expect(book['http://purl.org/dc/terms/title']).toBe('My Contacts')
    expect(book['http://www.w3.org/2006/vcard/ns#nameEmailIndex']).toEqual({
      '@id': 'https://pod.example.com/contacts/people',
    })
  })

  it('includes @context', () => {
    const book = createAddressBook('My Contacts', BASE_URL)
    expect(book['@context']).toBeDefined()
  })
})

describe('parseContact', () => {
  it('parses valid contact data', () => {
    const data = {
      '@id': 'https://pod.example.com/contacts#1',
      '@type': VCARD.Individual,
      [VCARD.fn]: 'John',
      [VCARD.hasUID]: 'urn:uuid:123',
    }

    const contact = parseContact(data)
    expect(contact[VCARD.fn]).toBe('John')
  })

  it('throws on invalid data', () => {
    expect(() => parseContact({})).toThrow()
  })
})

describe('safeParseContact', () => {
  it('returns success for valid data', () => {
    const data = {
      '@id': 'https://pod.example.com/contacts#1',
      '@type': VCARD.Individual,
      [VCARD.fn]: 'John',
      [VCARD.hasUID]: 'urn:uuid:123',
    }

    const result = safeParseContact(data)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid data', () => {
    const result = safeParseContact({})
    expect(result.success).toBe(false)
  })
})

describe('isContact', () => {
  it('returns true for valid contact', () => {
    const contact = createContact({ name: 'John' }, BASE_URL)
    expect(isContact(contact)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isContact({})).toBe(false)
    expect(isContact({ name: 'John' })).toBe(false)
    expect(isContact(null)).toBe(false)
  })
})
