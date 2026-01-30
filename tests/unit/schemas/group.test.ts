import { describe, it, expect } from 'vitest'
import { FOAF, VCARD, DCTERMS } from '@inrupt/vocab-common-rdf'
import {
  GroupSchema,
  OrganizationSchema,
  TeamSchema,
  MembershipSchema,
  GroupInputSchema,
  MembershipInputSchema,
  GroupTypeEnum,
  createGroup,
  createMembership,
  parseGroup,
  safeParseGroup,
  isGroup,
  ORG,
  TIME,
} from '../../../src/schemas/group'

const BASE_URL = 'https://pod.example.com'

describe('MembershipSchema', () => {
  const validMembership = {
    '@type': ORG.Membership,
    [ORG.member]: { '@id': 'https://pod.example.com/contacts/people#john' },
  }

  it('validates a minimal membership', () => {
    const result = MembershipSchema.safeParse(validMembership)
    expect(result.success).toBe(true)
  })

  it('validates membership with role', () => {
    const membership = {
      ...validMembership,
      [ORG.role]: { '@id': 'https://example.com/roles#developer' },
    }
    expect(MembershipSchema.safeParse(membership).success).toBe(true)
  })

  it('validates membership with time interval', () => {
    const membership = {
      ...validMembership,
      [ORG.memberDuring]: {
        '@type': TIME.Interval,
        [TIME.hasBeginning]: '2024-01-01T00:00:00Z',
        [TIME.hasEnd]: '2024-12-31T23:59:59Z',
      },
    }
    expect(MembershipSchema.safeParse(membership).success).toBe(true)
  })

  it('rejects membership without member', () => {
    const invalid = { '@type': ORG.Membership }
    expect(MembershipSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('GroupSchema', () => {
  const validGroup = {
    '@id': 'https://pod.example.com/groups/team-alpha#group',
    '@type': VCARD.Group,
    [VCARD.fn]: 'Team Alpha',
  }

  it('validates a minimal group', () => {
    const result = GroupSchema.safeParse(validGroup)
    expect(result.success).toBe(true)
  })

  it('validates group with all fields', () => {
    const fullGroup = {
      ...validGroup,
      [DCTERMS.description]: 'A great team',
      [VCARD.hasURL]: 'https://team-alpha.example.com',
      [VCARD.hasLogo]: 'https://example.com/logo.png',
      [ORG.unitOf]: { '@id': 'https://pod.example.com/groups/acme#org' },
      [ORG.hasUnit]: { '@id': 'https://pod.example.com/groups/sub-team#group' },
      [VCARD.hasMember]: { '@id': 'https://pod.example.com/contacts#john' },
      [ORG.hasMembership]: {
        '@type': ORG.Membership,
        [ORG.member]: { '@id': 'https://pod.example.com/contacts#jane' },
      },
    }

    expect(GroupSchema.safeParse(fullGroup).success).toBe(true)
  })

  it('validates group with multiple members', () => {
    const group = {
      ...validGroup,
      [VCARD.hasMember]: [
        { '@id': 'https://pod.example.com/contacts#john' },
        { '@id': 'https://pod.example.com/contacts#jane' },
      ],
    }
    expect(GroupSchema.safeParse(group).success).toBe(true)
  })

  it('validates group with multiple types', () => {
    const group = {
      ...validGroup,
      '@type': [VCARD.Group, FOAF.Group],
    }
    expect(GroupSchema.safeParse(group).success).toBe(true)
  })

  it('rejects group without name', () => {
    const invalid = {
      '@id': 'https://pod.example.com/groups/team#group',
      '@type': VCARD.Group,
    }
    expect(GroupSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects group with empty name', () => {
    const invalid = { ...validGroup, [VCARD.fn]: '' }
    expect(GroupSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('OrganizationSchema', () => {
  it('validates an organization', () => {
    const org = {
      '@id': 'https://pod.example.com/groups/acme#org',
      '@type': [ORG.Organization],
      [VCARD.fn]: 'Acme Corporation',
    }
    expect(OrganizationSchema.safeParse(org).success).toBe(true)
  })

  it('validates organization with vcard type', () => {
    const org = {
      '@id': 'https://pod.example.com/groups/acme#org',
      '@type': [VCARD.Organization],
      [VCARD.fn]: 'Acme Corporation',
    }
    expect(OrganizationSchema.safeParse(org).success).toBe(true)
  })

  it('rejects non-organization type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/groups/team#group',
      '@type': [VCARD.Group],
      [VCARD.fn]: 'Not an org',
    }
    expect(OrganizationSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('TeamSchema', () => {
  it('validates a team with parent', () => {
    const team = {
      '@id': 'https://pod.example.com/groups/team-alpha#team',
      '@type': [ORG.OrganizationalUnit],
      [VCARD.fn]: 'Team Alpha',
      [ORG.unitOf]: { '@id': 'https://pod.example.com/groups/acme#org' },
    }
    expect(TeamSchema.safeParse(team).success).toBe(true)
  })

  it('rejects team without parent', () => {
    const invalid = {
      '@id': 'https://pod.example.com/groups/team#team',
      '@type': [ORG.OrganizationalUnit],
      [VCARD.fn]: 'Orphan Team',
    }
    expect(TeamSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects non-team type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/groups/group#group',
      '@type': [VCARD.Group],
      [VCARD.fn]: 'Not a team',
      [ORG.unitOf]: { '@id': 'https://pod.example.com/groups/acme#org' },
    }
    expect(TeamSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('GroupTypeEnum', () => {
  it('accepts valid group types', () => {
    expect(GroupTypeEnum.safeParse('organization').success).toBe(true)
    expect(GroupTypeEnum.safeParse('team').success).toBe(true)
    expect(GroupTypeEnum.safeParse('group').success).toBe(true)
  })

  it('rejects invalid types', () => {
    expect(GroupTypeEnum.safeParse('invalid').success).toBe(false)
    expect(GroupTypeEnum.safeParse('').success).toBe(false)
  })
})

describe('GroupInputSchema', () => {
  it('validates minimal input', () => {
    const result = GroupInputSchema.safeParse({ name: 'Test Group', type: 'group' })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      name: 'Team Alpha',
      type: 'team',
      description: 'A great team',
      url: 'https://team.example.com',
      logo: 'https://example.com/logo.png',
      parentId: 'https://pod.example.com/groups/acme#org',
      memberIds: ['https://pod.example.com/contacts#john'],
    }

    expect(GroupInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(GroupInputSchema.safeParse({ name: '', type: 'group' }).success).toBe(false)
  })

  it('rejects invalid type', () => {
    expect(GroupInputSchema.safeParse({ name: 'Test', type: 'invalid' }).success).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(GroupInputSchema.safeParse({ name: 'Test', type: 'group', url: 'not-url' }).success).toBe(false)
    expect(GroupInputSchema.safeParse({ name: 'Test', type: 'group', logo: 'not-url' }).success).toBe(false)
    expect(GroupInputSchema.safeParse({ name: 'Test', type: 'group', parentId: 'not-url' }).success).toBe(false)
  })
})

describe('MembershipInputSchema', () => {
  it('validates minimal input', () => {
    const result = MembershipInputSchema.safeParse({
      memberId: 'https://pod.example.com/contacts#john',
    })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      memberId: 'https://pod.example.com/contacts#john',
      roleId: 'https://example.com/roles#developer',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    }
    expect(MembershipInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects invalid member URL', () => {
    expect(MembershipInputSchema.safeParse({ memberId: 'not-url' }).success).toBe(false)
  })
})

describe('createGroup', () => {
  it('creates an organization', () => {
    const group = createGroup({ name: 'Acme Corp', type: 'organization' }, BASE_URL)

    expect(group['@id']).toBe('https://pod.example.com/groups/acme-corp#org')
    expect(group['@type']).toContain(ORG.Organization)
    expect(group['@type']).toContain(VCARD.Organization)
    expect(group[VCARD.fn]).toBe('Acme Corp')
  })

  it('creates a team', () => {
    const group = createGroup({ name: 'Team Alpha', type: 'team' }, BASE_URL)

    expect(group['@id']).toBe('https://pod.example.com/groups/team-alpha#team')
    expect(group['@type']).toContain(ORG.OrganizationalUnit)
    expect(group['@type']).toContain(VCARD.Group)
  })

  it('creates an informal group', () => {
    const group = createGroup({ name: 'Book Club', type: 'group' }, BASE_URL)

    expect(group['@id']).toBe('https://pod.example.com/groups/book-club#group')
    expect(group['@type']).toContain(VCARD.Group)
    expect(group['@type']).toContain(FOAF.Group)
  })

  it('sanitizes name for URL slug', () => {
    const group = createGroup({ name: 'Test Group 123!@#', type: 'group' }, BASE_URL)
    expect(group['@id']).toMatch(/\/groups\/test-group-123#group$/)
  })

  it('adds optional fields', () => {
    const group = createGroup({
      name: 'Team',
      type: 'team',
      description: 'A description',
      url: 'https://team.example.com',
      logo: 'https://example.com/logo.png',
      parentId: 'https://pod.example.com/groups/acme#org',
    }, BASE_URL)

    expect(group[DCTERMS.description]).toBe('A description')
    expect(group[VCARD.hasURL]).toBe('https://team.example.com')
    expect(group[VCARD.hasLogo]).toBe('https://example.com/logo.png')
    expect(group[ORG.unitOf]).toEqual({ '@id': 'https://pod.example.com/groups/acme#org' })
  })

  it('adds single member', () => {
    const group = createGroup({
      name: 'Team',
      type: 'group',
      memberIds: ['https://pod.example.com/contacts#john'],
    }, BASE_URL)

    expect(group[VCARD.hasMember]).toEqual({ '@id': 'https://pod.example.com/contacts#john' })
  })

  it('adds multiple members', () => {
    const group = createGroup({
      name: 'Team',
      type: 'group',
      memberIds: [
        'https://pod.example.com/contacts#john',
        'https://pod.example.com/contacts#jane',
      ],
    }, BASE_URL)

    expect(group[VCARD.hasMember]).toEqual([
      { '@id': 'https://pod.example.com/contacts#john' },
      { '@id': 'https://pod.example.com/contacts#jane' },
    ])
  })

  it('includes @context', () => {
    const group = createGroup({ name: 'Test', type: 'group' }, BASE_URL)
    expect(group['@context']).toBeDefined()
  })
})

describe('createMembership', () => {
  it('creates a minimal membership', () => {
    const membership = createMembership({
      memberId: 'https://pod.example.com/contacts#john',
    })

    expect(membership['@type']).toBe(ORG.Membership)
    expect(membership[ORG.member]).toEqual({ '@id': 'https://pod.example.com/contacts#john' })
    expect(membership[ORG.role]).toBeUndefined()
    expect(membership[ORG.memberDuring]).toBeUndefined()
  })

  it('creates membership with role', () => {
    const membership = createMembership({
      memberId: 'https://pod.example.com/contacts#john',
      roleId: 'https://example.com/roles#developer',
    })

    expect(membership[ORG.role]).toEqual({ '@id': 'https://example.com/roles#developer' })
  })

  it('creates membership with start date only', () => {
    const membership = createMembership({
      memberId: 'https://pod.example.com/contacts#john',
      startDate: '2024-01-01T00:00:00Z',
    })

    expect(membership[ORG.memberDuring]).toEqual({
      '@type': TIME.Interval,
      [TIME.hasBeginning]: '2024-01-01T00:00:00Z',
    })
  })

  it('creates membership with full time interval', () => {
    const membership = createMembership({
      memberId: 'https://pod.example.com/contacts#john',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    })

    expect(membership[ORG.memberDuring]).toEqual({
      '@type': TIME.Interval,
      [TIME.hasBeginning]: '2024-01-01T00:00:00Z',
      [TIME.hasEnd]: '2024-12-31T23:59:59Z',
    })
  })
})

describe('parseGroup', () => {
  it('parses valid group data', () => {
    const data = {
      '@id': 'https://pod.example.com/groups/team#group',
      '@type': VCARD.Group,
      [VCARD.fn]: 'Team',
    }

    const group = parseGroup(data)
    expect(group[VCARD.fn]).toBe('Team')
  })

  it('throws on invalid data', () => {
    expect(() => parseGroup({})).toThrow()
  })
})

describe('safeParseGroup', () => {
  it('returns success for valid data', () => {
    const data = {
      '@id': 'https://pod.example.com/groups/team#group',
      '@type': VCARD.Group,
      [VCARD.fn]: 'Team',
    }

    const result = safeParseGroup(data)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid data', () => {
    const result = safeParseGroup({})
    expect(result.success).toBe(false)
  })
})

describe('isGroup', () => {
  it('returns true for valid group', () => {
    const group = createGroup({ name: 'Team', type: 'group' }, BASE_URL)
    expect(isGroup(group)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isGroup({})).toBe(false)
    expect(isGroup({ name: 'Team' })).toBe(false)
    expect(isGroup(null)).toBe(false)
  })
})

describe('ORG constants', () => {
  it('has correct namespace', () => {
    expect(ORG.NAMESPACE).toBe('http://www.w3.org/ns/org#')
  })

  it('has expected terms', () => {
    expect(ORG.Organization).toBe('http://www.w3.org/ns/org#Organization')
    expect(ORG.Membership).toBe('http://www.w3.org/ns/org#Membership')
    expect(ORG.member).toBe('http://www.w3.org/ns/org#member')
  })
})

describe('TIME constants', () => {
  it('has correct namespace', () => {
    expect(TIME.NAMESPACE).toBe('http://www.w3.org/2006/time#')
  })

  it('has expected terms', () => {
    expect(TIME.Interval).toBe('http://www.w3.org/2006/time#Interval')
    expect(TIME.hasBeginning).toBe('http://www.w3.org/2006/time#hasBeginning')
    expect(TIME.hasEnd).toBe('http://www.w3.org/2006/time#hasEnd')
  })
})
