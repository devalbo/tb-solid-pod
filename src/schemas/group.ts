/**
 * Group/Organization schemas for Solid Pod.
 * Represents teams, organizations, and custom groups with membership.
 */

import { z } from 'zod';
import { FOAF, VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';
import {
  IRI,
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  oneOrMany,
  POD_CONTEXT,
} from './base';

// ============================================================================
// W3C Organization Ontology Constants
// (Not in @inrupt/vocab-common-rdf, so we define them here)
// ============================================================================

export const ORG = {
  NAMESPACE: 'http://www.w3.org/ns/org#',
  Organization: 'http://www.w3.org/ns/org#Organization',
  OrganizationalUnit: 'http://www.w3.org/ns/org#OrganizationalUnit',
  Membership: 'http://www.w3.org/ns/org#Membership',
  Role: 'http://www.w3.org/ns/org#Role',
  member: 'http://www.w3.org/ns/org#member',
  hasMember: 'http://www.w3.org/ns/org#hasMember',
  hasMembership: 'http://www.w3.org/ns/org#hasMembership',
  memberOf: 'http://www.w3.org/ns/org#memberOf',
  hasUnit: 'http://www.w3.org/ns/org#hasUnit',
  unitOf: 'http://www.w3.org/ns/org#unitOf',
  role: 'http://www.w3.org/ns/org#role',
  memberDuring: 'http://www.w3.org/ns/org#memberDuring',
} as const;

// Time ontology constants
export const TIME = {
  NAMESPACE: 'http://www.w3.org/2006/time#',
  Interval: 'http://www.w3.org/2006/time#Interval',
  hasBeginning: 'http://www.w3.org/2006/time#hasBeginning',
  hasEnd: 'http://www.w3.org/2006/time#hasEnd',
} as const;

// ============================================================================
// Membership Schema
// ============================================================================

/**
 * A membership with role and time interval
 */
export const MembershipSchema = z.object({
  '@type': z.literal(ORG.Membership),
  [ORG.member]: NodeRef,
  [ORG.role]: NodeRef.optional(),
  [ORG.memberDuring]: z.object({
    '@type': z.literal(TIME.Interval).optional(),
    [TIME.hasBeginning]: z.string().optional(),
    [TIME.hasEnd]: z.string().optional(),
  }).optional(),
});

export type Membership = z.infer<typeof MembershipSchema>;

// ============================================================================
// Group Types
// ============================================================================

export const GroupTypeEnum = z.enum([
  'organization',  // Formal organization (company, non-profit)
  'team',          // Team within an organization
  'group',         // Informal group (book club, friends)
]);

export type GroupType = z.infer<typeof GroupTypeEnum>;

// ============================================================================
// Group Schema
// ============================================================================

/**
 * A group, team, or organization
 */
export const GroupSchema = JsonLdBase.extend({
  // Type can be vcard:Group, org:Organization, or org:OrganizationalUnit
  '@type': oneOrMany(z.string()),

  // ---- Identity ----

  /** Name (required) */
  [VCARD.fn]: z.string().min(1),

  /** Description */
  [DCTERMS.description]: z.string().optional(),

  /** URL */
  [VCARD.hasURL]: IRI.optional(),

  /** Logo */
  [VCARD.hasLogo]: IRI.optional(),

  // ---- Hierarchy ----

  /** Parent organization */
  [ORG.unitOf]: NodeRef.optional(),

  /** Child units */
  [ORG.hasUnit]: oneOrMany(NodeRef).optional(),

  // ---- Simple Membership ----

  /** Members (simple list) */
  [VCARD.hasMember]: oneOrMany(NodeRef).optional(),

  // ---- Role-based Membership ----

  /** Members with roles and metadata */
  [ORG.hasMembership]: oneOrMany(MembershipSchema).optional(),
});

export type Group = z.infer<typeof GroupSchema>;

// ============================================================================
// Organization Schema (more specific)
// ============================================================================

/**
 * A formal organization
 */
export const OrganizationSchema = GroupSchema.extend({
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(ORG.Organization) || arr.includes(VCARD.Organization);
    },
    { message: `@type must include org:Organization or vcard:Organization` }
  ),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============================================================================
// Team Schema (organizational unit)
// ============================================================================

/**
 * A team within an organization
 */
export const TeamSchema = GroupSchema.extend({
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(ORG.OrganizationalUnit);
    },
    { message: `@type must include org:OrganizationalUnit` }
  ),

  /** Parent organization (required for teams) */
  [ORG.unitOf]: NodeRef,
});

export type Team = z.infer<typeof TeamSchema>;

// ============================================================================
// Group Input (for creation)
// ============================================================================

/**
 * Input schema for creating a new group
 */
export const GroupInputSchema = z.object({
  /** Name (required) */
  name: z.string().min(1),

  /** Type of group */
  type: GroupTypeEnum,

  /** Description */
  description: z.string().optional(),

  /** URL */
  url: z.string().url().optional(),

  /** Logo URL */
  logo: z.string().url().optional(),

  /** Parent organization ID (for teams) */
  parentId: z.string().url().optional(),

  /** Initial member IDs */
  memberIds: z.array(z.string().url()).optional(),
});

export type GroupInput = z.infer<typeof GroupInputSchema>;

/**
 * Input for adding a member with a role
 */
export const MembershipInputSchema = z.object({
  /** Member ID */
  memberId: z.string().url(),

  /** Role ID (optional) */
  roleId: z.string().url().optional(),

  /** Start date (ISO string) */
  startDate: z.string().optional(),

  /** End date (ISO string, optional) */
  endDate: z.string().optional(),
});

export type MembershipInput = z.infer<typeof MembershipInputSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Get the RDF types for a group type
 */
function getGroupTypes(type: GroupType): string[] {
  switch (type) {
    case 'organization':
      return [ORG.Organization, VCARD.Organization];
    case 'team':
      return [ORG.OrganizationalUnit, VCARD.Group];
    case 'group':
      return [VCARD.Group, FOAF.Group];
  }
}

/**
 * Create a new Group JSON-LD document from input
 */
export function createGroup(input: GroupInput, baseUrl: string): Group {
  const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const id = `${baseUrl}/groups/${slug}#${input.type === 'organization' ? 'org' : input.type}`;

  const types = getGroupTypes(input.type);

  const group: Group = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': types,
    [VCARD.fn]: input.name,
  };

  // Optional fields
  if (input.description) group[DCTERMS.description] = input.description;
  if (input.url) group[VCARD.hasURL] = input.url;
  if (input.logo) group[VCARD.hasLogo] = input.logo;
  if (input.parentId) group[ORG.unitOf] = { '@id': input.parentId };

  // Add members
  if (input.memberIds && input.memberIds.length > 0) {
    const memberRefs = input.memberIds.map(id => ({ '@id': id }));
    group[VCARD.hasMember] = memberRefs.length === 1 ? memberRefs[0] : memberRefs;
  }

  return group;
}

/**
 * Create a Membership object
 */
export function createMembership(input: MembershipInput): Membership {
  const membership: Membership = {
    '@type': ORG.Membership,
    [ORG.member]: { '@id': input.memberId },
  };

  if (input.roleId) {
    membership[ORG.role] = { '@id': input.roleId };
  }

  if (input.startDate || input.endDate) {
    membership[ORG.memberDuring] = {
      '@type': TIME.Interval,
    };
    if (input.startDate) {
      membership[ORG.memberDuring]![TIME.hasBeginning] = input.startDate;
    }
    if (input.endDate) {
      membership[ORG.memberDuring]![TIME.hasEnd] = input.endDate;
    }
  }

  return membership;
}

/**
 * Parse and validate a Group from JSON
 */
export function parseGroup(data: unknown): Group {
  return GroupSchema.parse(data);
}

/**
 * Safely parse a Group, returning a result object
 */
export function safeParseGroup(data: unknown) {
  return GroupSchema.safeParse(data);
}

/**
 * Type guard for Group
 */
export function isGroup(data: unknown): data is Group {
  return GroupSchema.safeParse(data).success;
}
