/**
 * Persona/Identity schemas for Solid Pod.
 * Represents user identities (WebID profiles) with multiple personas.
 */

import { z } from 'zod';
import { FOAF, VCARD, LDP } from '@inrupt/vocab-common-rdf';
import { SOLID, WS } from '@inrupt/vocab-solid-common';
import {
  IRI,
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  oneOrMany,
  POD_CONTEXT,
} from './base';

// ============================================================================
// Persona Schema
// ============================================================================

/**
 * A user persona/identity (WebID profile)
 *
 * Each persona represents a distinct identity the user can present.
 * Examples: work identity, personal identity, anonymous identity.
 */
export const PersonaSchema = JsonLdBase.extend({
  // Type must include foaf:Person
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(FOAF.Person);
    },
    { message: `@type must include ${FOAF.Person}` }
  ),

  // ---- Identity ----

  /** Display name (required) */
  [FOAF.name]: z.string().min(1),

  /** Nickname/handle */
  [FOAF.nick]: z.string().optional(),

  /** Given/first name */
  [FOAF.givenName]: z.string().optional(),

  /** Family/last name */
  [FOAF.familyName]: z.string().optional(),

  // ---- Contact ----

  /** Email address(es) - mailto: URI */
  [VCARD.hasEmail]: oneOrMany(IRI).optional(),

  /** Phone number(s) - tel: URI */
  [VCARD.hasTelephone]: oneOrMany(IRI).optional(),

  // ---- Profile ----

  /** Profile image/avatar */
  [FOAF.img]: IRI.optional(),

  /** Bio/description */
  [VCARD.note]: z.string().optional(),

  /** Homepage URL */
  [FOAF.homepage]: IRI.optional(),

  // ---- Authentication ----

  /** OIDC issuer for authentication */
  [SOLID.oidcIssuer]: NodeRef.optional(),

  /** Public key reference */
  'http://www.w3.org/ns/auth/cert#key': NodeRef.optional(),

  // ---- Type Indexes (WebID / Solid profile) ----

  /** Link to public type index (discoverable types) */
  [SOLID.publicTypeIndex]: NodeRef.optional(),

  /** Link to private type index (in preferences) */
  [SOLID.privateTypeIndex]: NodeRef.optional(),

  // ---- WebID Profile (Phase 7) ----

  /** LDP inbox for notifications */
  [LDP.inbox]: NodeRef.optional(),

  /** Link to preferences document */
  [WS.preferencesFile]: NodeRef.optional(),

  // ---- Metadata ----

  /** Document this is the primary topic of */
  [FOAF.isPrimaryTopicOf]: NodeRef.optional(),
});

export type Persona = z.infer<typeof PersonaSchema>;

// ============================================================================
// Persona Input (for creation)
// ============================================================================

/**
 * Input schema for creating a new persona (relaxed requirements)
 */
export const PersonaInputSchema = z.object({
  /** Unique identifier (generated if not provided) */
  id: IRI.optional(),

  /** Display name (required) */
  name: z.string().min(1),

  /** Nickname/handle */
  nickname: z.string().optional(),

  /** Given/first name */
  givenName: z.string().optional(),

  /** Family/last name */
  familyName: z.string().optional(),

  /** Email address (will be converted to mailto: URI) */
  email: z.string().email().optional(),

  /** Additional emails */
  additionalEmails: z.array(z.string().email()).optional(),

  /** Phone number */
  phone: z.string().optional(),

  /** Profile image URL */
  image: z.string().url().optional(),

  /** Bio/description */
  bio: z.string().optional(),

  /** Homepage URL */
  homepage: z.string().url().optional(),

  /** OIDC issuer URL */
  oidcIssuer: z.string().url().optional(),

  /** WebID / Solid profile URLs */
  inbox: z.string().url().optional(),
  preferencesFile: z.string().url().optional(),
  publicTypeIndex: z.string().url().optional(),
  privateTypeIndex: z.string().url().optional(),
});

export type PersonaInput = z.infer<typeof PersonaInputSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new Persona JSON-LD document from input
 */
export function createPersona(input: PersonaInput, baseUrl: string): Persona {
  const id = input.id || `${baseUrl}/profiles/${crypto.randomUUID()}#me`;
  const documentUrl = id.replace(/#.*$/, '');

  // Collect all emails as mailto: URIs
  const emails: string[] = [];
  if (input.email) {
    emails.push(`mailto:${input.email}`);
  }
  if (input.additionalEmails) {
    emails.push(...input.additionalEmails.map(e => `mailto:${e}`));
  }

  const persona: Persona = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': [FOAF.Person],
    [FOAF.name]: input.name,
    [FOAF.isPrimaryTopicOf]: { '@id': documentUrl },
  };

  // Optional fields
  if (input.nickname) persona[FOAF.nick] = input.nickname;
  if (input.givenName) persona[FOAF.givenName] = input.givenName;
  if (input.familyName) persona[FOAF.familyName] = input.familyName;
  if (emails.length === 1) persona[VCARD.hasEmail] = emails[0];
  if (emails.length > 1) persona[VCARD.hasEmail] = emails;
  if (input.phone) persona[VCARD.hasTelephone] = `tel:${input.phone.replace(/\s/g, '')}`;
  if (input.image) persona[FOAF.img] = input.image;
  if (input.bio) persona[VCARD.note] = input.bio;
  if (input.homepage) persona[FOAF.homepage] = input.homepage;
  if (input.oidcIssuer) persona[SOLID.oidcIssuer] = { '@id': input.oidcIssuer };
  if (input.inbox) persona[LDP.inbox] = { '@id': input.inbox };
  if (input.preferencesFile) persona[WS.preferencesFile] = { '@id': input.preferencesFile };
  if (input.publicTypeIndex) persona[SOLID.publicTypeIndex] = { '@id': input.publicTypeIndex };
  if (input.privateTypeIndex) persona[SOLID.privateTypeIndex] = { '@id': input.privateTypeIndex };

  return persona;
}

/**
 * Parse and validate a Persona from JSON
 */
export function parsePersona(data: unknown): Persona {
  return PersonaSchema.parse(data);
}

/**
 * Safely parse a Persona, returning a result object
 */
export function safeParsePersona(data: unknown) {
  return PersonaSchema.safeParse(data);
}

/**
 * Type guard for Persona
 */
export function isPersona(data: unknown): data is Persona {
  return PersonaSchema.safeParse(data).success;
}
