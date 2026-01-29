/**
 * Base Zod schemas for Solid Pod data structures.
 * These provide the foundation for all other schemas.
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * IRI (Internationalized Resource Identifier) - a URL or URI
 */
export const IRI = z.string().url();
export type IRI = z.infer<typeof IRI>;

/**
 * A reference to another JSON-LD node by its @id
 */
export const NodeRef = z.object({
  '@id': IRI,
});
export type NodeRef = z.infer<typeof NodeRef>;

/**
 * RDF Literal with optional datatype or language tag
 */
export const TypedLiteral = z.object({
  '@value': z.string(),
  '@type': z.string().optional(),
  '@language': z.string().optional(),
});
export type TypedLiteral = z.infer<typeof TypedLiteral>;

/**
 * Any RDF literal value (simple or typed)
 */
export const Literal = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  TypedLiteral,
]);
export type Literal = z.infer<typeof Literal>;

/**
 * A value that can be either a single item or an array
 */
export function oneOrMany<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.array(schema)]);
}

// ============================================================================
// JSON-LD Base Structures
// ============================================================================

/**
 * JSON-LD @context type - represents the @context field in JSON-LD
 * Kept loose to allow various context formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLdContext = any;

/**
 * Base schema for all JSON-LD documents
 * Note: Uses passthrough to allow additional properties like @context
 */
export const JsonLdBase = z.object({
  '@id': IRI.optional(),
  '@type': oneOrMany(z.string()).optional(),
}).passthrough();

export type JsonLdBase = z.infer<typeof JsonLdBase> & {
  '@context'?: JsonLdContext;
};

// ============================================================================
// Default Context
// ============================================================================

/**
 * Shared JSON-LD context for all pod documents
 */
export const POD_CONTEXT = {
  '@vocab': 'http://www.w3.org/2006/vcard/ns#',
  'foaf': 'http://xmlns.com/foaf/0.1/',
  'solid': 'http://www.w3.org/ns/solid/terms#',
  'vcard': 'http://www.w3.org/2006/vcard/ns#',
  'org': 'http://www.w3.org/ns/org#',
  'ldp': 'http://www.w3.org/ns/ldp#',
  'acl': 'http://www.w3.org/ns/auth/acl#',
  'dc': 'http://purl.org/dc/terms/',
  'posix': 'http://www.w3.org/ns/posix/stat#',
  'xsd': 'http://www.w3.org/2001/XMLSchema#',
  'schema': 'https://schema.org/',
  'cert': 'http://www.w3.org/ns/auth/cert#',
} as const;

// ============================================================================
// Vocabulary Namespace Constants
// ============================================================================

/**
 * Common namespace prefixes for building IRIs
 */
export const NS = {
  foaf: 'http://xmlns.com/foaf/0.1/',
  vcard: 'http://www.w3.org/2006/vcard/ns#',
  solid: 'http://www.w3.org/ns/solid/terms#',
  org: 'http://www.w3.org/ns/org#',
  ldp: 'http://www.w3.org/ns/ldp#',
  acl: 'http://www.w3.org/ns/auth/acl#',
  dc: 'http://purl.org/dc/terms/',
  posix: 'http://www.w3.org/ns/posix/stat#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  schema: 'https://schema.org/',
  cert: 'http://www.w3.org/ns/auth/cert#',
  time: 'http://www.w3.org/2006/time#',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a UUID-based URN
 */
export function generateUID(): string {
  return `urn:uuid:${crypto.randomUUID()}`;
}

/**
 * Create an IRI from a namespace and local name
 */
export function iri(namespace: keyof typeof NS, localName: string): string {
  return `${NS[namespace]}${localName}`;
}

/**
 * Type guard to check if a value is a NodeRef
 */
export function isNodeRef(value: unknown): value is NodeRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '@id' in value &&
    typeof (value as NodeRef)['@id'] === 'string'
  );
}

/**
 * Extract @id from a value that might be a NodeRef or string
 */
export function getId(value: NodeRef | string): string {
  return isNodeRef(value) ? value['@id'] : value;
}

/**
 * Ensure a value is an array (wrap single values)
 */
export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Get current ISO datetime string
 */
export function nowISO(): string {
  return new Date().toISOString();
}
