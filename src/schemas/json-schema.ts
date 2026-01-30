/**
 * JSON Schema support for Solid Pod schemas.
 *
 * There are no canonical JSON Schema definitions for Solid data types (WebID profile, type
 * indexes, etc.); the Solid ecosystem uses SHACL/ShEx for validation. We therefore generate
 * JSON Schema from our Zod types—Zod is the source of truth. Use these for OpenAPI, form
 * generators, validation in non-JS runtimes, etc.
 *
 * Uses Zod v4's built-in z.toJSONSchema() (draft-2020-12 by default). Schemas that use .refine()
 * (e.g. PersonaSchema, FileMetadataSchema) are not directly representable; we export input
 * schemas and all schemas that convert successfully.
 *
 * @example
 * ```ts
 * import { personaInputJsonSchema, contactInputJsonSchema } from 'tb-solid-pod';
 * // Use in OpenAPI spec, AJV, or any JSON Schema consumer
 * ```
 */

import { z } from 'zod';
import { IRI, NodeRef, TypedLiteral, JsonLdBase } from './base';
import { PersonaInputSchema, PersonaSchema } from './persona';
import { ContactSchema, ContactInputSchema, AddressBookSchema, AgentContactSchema } from './contact';
import { GroupSchema, GroupInputSchema, MembershipSchema, MembershipInputSchema } from './group';
import {
  FileMetadataSchema,
  FileInputSchema,
  ContainerSchema,
  ContainerInputSchema,
} from './file';
import { PreferencesSchema } from './preferences';
import {
  TypeRegistrationSchema,
  TypeIndexSchema,
  TypeRegistrationInputSchema,
  TypeIndexRowSchema,
} from './typeIndex';

export type JsonSchemaDraft = 'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0';

export interface ToJsonSchemaOptions {
  target?: JsonSchemaDraft;
}

const defaultOptions: ToJsonSchemaOptions = { target: 'draft-2020-12' };

function toJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: ToJsonSchemaOptions = {}
): Record<string, unknown> {
  const opts = { ...defaultOptions, ...options };
  const result = z.toJSONSchema(schema, { target: opts.target });
  return typeof result === 'object' && result !== null && '$schema' in result
    ? (result as Record<string, unknown>)
    : { $schema: 'https://json-schema.org/draft/2020-12/schema', ...(result as Record<string, unknown>) };
}

/**
 * Try to convert a Zod schema to JSON Schema. Returns undefined if the schema
 * uses features that cannot be represented (e.g. .refine(), transform).
 */
export function tryToJsonSchema(
  schema: z.ZodTypeAny,
  options: ToJsonSchemaOptions = {}
): Record<string, unknown> | undefined {
  try {
    return toJsonSchema(schema, options);
  } catch {
    return undefined;
  }
}

// ============================================================================
// Base
// ============================================================================

export const iriJsonSchema = toJsonSchema(IRI);
export const nodeRefJsonSchema = toJsonSchema(NodeRef);
export const typedLiteralJsonSchema = toJsonSchema(TypedLiteral);
export const jsonLdBaseJsonSchema = toJsonSchema(JsonLdBase);

// ============================================================================
// Persona
// ============================================================================

export const personaInputJsonSchema = toJsonSchema(PersonaInputSchema);
export const personaJsonSchema = tryToJsonSchema(PersonaSchema);

// ============================================================================
// Contact
// ============================================================================

export const contactJsonSchema = toJsonSchema(ContactSchema);
export const contactInputJsonSchema = toJsonSchema(ContactInputSchema);
export const addressBookJsonSchema = toJsonSchema(AddressBookSchema);
export const agentContactJsonSchema = tryToJsonSchema(AgentContactSchema);

// ============================================================================
// Group
// ============================================================================

export const groupJsonSchema = tryToJsonSchema(GroupSchema);
export const groupInputJsonSchema = toJsonSchema(GroupInputSchema);
export const membershipJsonSchema = toJsonSchema(MembershipSchema);
export const membershipInputJsonSchema = toJsonSchema(MembershipInputSchema);

// ============================================================================
// File
// ============================================================================

export const fileMetadataJsonSchema = tryToJsonSchema(FileMetadataSchema);
export const fileInputJsonSchema = toJsonSchema(FileInputSchema);
export const containerJsonSchema = tryToJsonSchema(ContainerSchema);
export const containerInputJsonSchema = toJsonSchema(ContainerInputSchema);

// ============================================================================
// Preferences
// ============================================================================

export const preferencesJsonSchema = toJsonSchema(PreferencesSchema);

// ============================================================================
// Type index
// ============================================================================

export const typeRegistrationJsonSchema = toJsonSchema(TypeRegistrationSchema);
export const typeIndexJsonSchema = tryToJsonSchema(TypeIndexSchema);
export const typeRegistrationInputJsonSchema = tryToJsonSchema(TypeRegistrationInputSchema);
export const typeIndexRowJsonSchema = tryToJsonSchema(TypeIndexRowSchema);
