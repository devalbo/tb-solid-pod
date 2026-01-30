/**
 * Type Index schemas for Solid Pod.
 * Implements Solid Type Indexes for data discovery.
 *
 * Type indexes allow apps to find where specific types of data are stored
 * without hardcoding paths. Solid uses two type index documents:
 * - Public Type Index: Listed in profile, points to publicly discoverable data
 * - Private Type Index: Listed in preferences, points to private data locations
 */

import { z } from 'zod';
import {
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  oneOrMany,
  POD_CONTEXT,
} from './base';

// ============================================================================
// Solid Terms Constants
// ============================================================================

export const SOLID = {
  NAMESPACE: 'http://www.w3.org/ns/solid/terms#',
  TypeIndex: 'http://www.w3.org/ns/solid/terms#TypeIndex',
  TypeRegistration: 'http://www.w3.org/ns/solid/terms#TypeRegistration',
  UnlistedDocument: 'http://www.w3.org/ns/solid/terms#UnlistedDocument',
  ListedDocument: 'http://www.w3.org/ns/solid/terms#ListedDocument',
  forClass: 'http://www.w3.org/ns/solid/terms#forClass',
  instance: 'http://www.w3.org/ns/solid/terms#instance',
  instanceContainer: 'http://www.w3.org/ns/solid/terms#instanceContainer',
  publicTypeIndex: 'http://www.w3.org/ns/solid/terms#publicTypeIndex',
  privateTypeIndex: 'http://www.w3.org/ns/solid/terms#privateTypeIndex',
} as const;

// Common RDF type IRIs for convenience
export const COMMON_TYPES = {
  // Contacts
  'vcard:Individual': 'http://www.w3.org/2006/vcard/ns#Individual',
  'vcard:Group': 'http://www.w3.org/2006/vcard/ns#Group',
  'vcard:Organization': 'http://www.w3.org/2006/vcard/ns#Organization',
  // FOAF
  'foaf:Person': 'http://xmlns.com/foaf/0.1/Person',
  'foaf:Group': 'http://xmlns.com/foaf/0.1/Group',
  // Organization
  'org:Organization': 'http://www.w3.org/ns/org#Organization',
  'org:OrganizationalUnit': 'http://www.w3.org/ns/org#OrganizationalUnit',
  // Schema.org
  'schema:Person': 'https://schema.org/Person',
  'schema:Organization': 'https://schema.org/Organization',
  'schema:SoftwareApplication': 'https://schema.org/SoftwareApplication',
  // LDP
  'ldp:Resource': 'http://www.w3.org/ns/ldp#Resource',
  'ldp:Container': 'http://www.w3.org/ns/ldp#Container',
} as const;

// ============================================================================
// Type Registration Schema
// ============================================================================

/**
 * A type registration maps an RDF class to a location where instances are stored.
 *
 * Can use either:
 * - solid:instance - Points to specific resources of that type
 * - solid:instanceContainer - Points to a container holding resources of that type
 */
export const TypeRegistrationSchema = JsonLdBase.extend({
  '@type': z.literal(SOLID.TypeRegistration),

  /** The RDF class this registration is for */
  [SOLID.forClass]: NodeRef,

  /** Specific instance(s) of this type */
  [SOLID.instance]: oneOrMany(NodeRef).optional(),

  /** Container where instances of this type are stored */
  [SOLID.instanceContainer]: NodeRef.optional(),
});

export type TypeRegistration = z.infer<typeof TypeRegistrationSchema>;

// ============================================================================
// Type Index Schema
// ============================================================================

/**
 * A Type Index document containing type registrations.
 *
 * The @type should include:
 * - solid:TypeIndex (always)
 * - solid:ListedDocument (for public) or solid:UnlistedDocument (for private)
 */
export const TypeIndexSchema = JsonLdBase.extend({
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(SOLID.TypeIndex);
    },
    { message: `@type must include solid:TypeIndex` }
  ),
});

export type TypeIndex = z.infer<typeof TypeIndexSchema>;

// ============================================================================
// Input Schemas
// ============================================================================

export const TypeIndexTypeEnum = z.enum(['public', 'private']);
export type TypeIndexType = z.infer<typeof TypeIndexTypeEnum>;

/**
 * Input for creating a type registration
 */
export const TypeRegistrationInputSchema = z.object({
  /** The RDF class IRI to register */
  forClass: z.string().url(),

  /** Specific instance URL(s) */
  instance: z.union([z.string().url(), z.array(z.string().url())]).optional(),

  /** Container URL where instances are stored */
  instanceContainer: z.string().url().optional(),

  /** Whether this is a public or private registration */
  indexType: TypeIndexTypeEnum,
}).refine(
  (data) => data.instance !== undefined || data.instanceContainer !== undefined,
  { message: 'Either instance or instanceContainer must be provided' }
);

export type TypeRegistrationInput = z.infer<typeof TypeRegistrationInputSchema>;

/**
 * Schema for a type index row as stored in TinyBase (typeIndexes table).
 * instance may be a single URL string or a JSON string of URL array.
 */
export const TypeIndexRowSchema = z
  .object({
    forClass: z.string().url(),
    indexType: TypeIndexTypeEnum,
    instance: z.string().optional(),
    instanceContainer: z.string().url().optional(),
  })
  .refine(
    (data) => data.instance !== undefined || data.instanceContainer !== undefined,
    { message: 'Either instance or instanceContainer must be provided' }
  );

export type TypeIndexRow = z.infer<typeof TypeIndexRowSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new TypeRegistration
 */
export function createTypeRegistration(input: TypeRegistrationInput): TypeRegistration {
  const registration: TypeRegistration = {
    '@type': SOLID.TypeRegistration,
    [SOLID.forClass]: { '@id': input.forClass },
  };

  if (input.instance !== undefined) {
    if (Array.isArray(input.instance)) {
      registration[SOLID.instance] = input.instance.map(url => ({ '@id': url }));
    } else {
      registration[SOLID.instance] = { '@id': input.instance };
    }
  }

  if (input.instanceContainer !== undefined) {
    registration[SOLID.instanceContainer] = { '@id': input.instanceContainer };
  }

  return registration;
}

/**
 * Create a new TypeIndex document
 */
export function createTypeIndex(
  indexType: TypeIndexType,
  baseUrl: string,
  registrations: TypeRegistration[] = []
): TypeIndex & { registrations: TypeRegistration[] } {
  const isPublic = indexType === 'public';
  const id = `${baseUrl}settings/${isPublic ? 'publicTypeIndex' : 'privateTypeIndex'}`;

  const types = [
    SOLID.TypeIndex,
    isPublic ? SOLID.ListedDocument : SOLID.UnlistedDocument,
  ];

  return {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': types,
    registrations,
  };
}

/**
 * Get a friendly name for a class IRI
 */
export function getClassDisplayName(classIri: string): string {
  // Check common types first
  for (const [name, iri] of Object.entries(COMMON_TYPES)) {
    if (iri === classIri) return name;
  }

  // Try to extract local name from IRI
  const hashIndex = classIri.lastIndexOf('#');
  const slashIndex = classIri.lastIndexOf('/');
  const separatorIndex = Math.max(hashIndex, slashIndex);

  if (separatorIndex !== -1) {
    return classIri.substring(separatorIndex + 1);
  }

  return classIri;
}

/**
 * Resolve a short class name to full IRI
 */
export function resolveClassIri(classNameOrIri: string): string {
  // If it's already a URL, return as-is
  if (classNameOrIri.startsWith('http://') || classNameOrIri.startsWith('https://')) {
    return classNameOrIri;
  }

  // Check common types
  const commonType = COMMON_TYPES[classNameOrIri as keyof typeof COMMON_TYPES];
  if (commonType) return commonType;

  // Return as-is (caller should validate)
  return classNameOrIri;
}

// ============================================================================
// Parse Functions
// ============================================================================

/**
 * Parse and validate a TypeRegistration
 */
export function parseTypeRegistration(data: unknown): TypeRegistration {
  return TypeRegistrationSchema.parse(data);
}

/**
 * Safely parse a TypeRegistration
 */
export function safeParseTypeRegistration(data: unknown) {
  return TypeRegistrationSchema.safeParse(data);
}

/**
 * Parse and validate a TypeIndex
 */
export function parseTypeIndex(data: unknown): TypeIndex {
  return TypeIndexSchema.parse(data);
}

/**
 * Safely parse a TypeIndex
 */
export function safeParseTypeIndex(data: unknown) {
  return TypeIndexSchema.safeParse(data);
}

/**
 * Type guard for TypeRegistration
 */
export function isTypeRegistration(data: unknown): data is TypeRegistration {
  return TypeRegistrationSchema.safeParse(data).success;
}

/**
 * Type guard for TypeIndex
 */
export function isTypeIndex(data: unknown): data is TypeIndex {
  return TypeIndexSchema.safeParse(data).success;
}
