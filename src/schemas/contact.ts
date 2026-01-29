/**
 * Contact schemas for Solid Pod.
 * Represents people, agents, and bots in the user's address book.
 */

import { z } from 'zod';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';
import { SOLID } from '@inrupt/vocab-solid-common';
import {
  IRI,
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  oneOrMany,
  generateUID,
  POD_CONTEXT,
} from './base';

// ============================================================================
// Contact Schema
// ============================================================================

/**
 * A contact (person or agent) in the address book
 */
export const ContactSchema = JsonLdBase.extend({
  // Type should be vcard:Individual
  '@type': oneOrMany(z.string()),

  // ---- Identity ----

  /** Full name (required) */
  [VCARD.fn]: z.string().min(1),

  /** Unique identifier (UUID URN) */
  [VCARD.hasUID]: z.string(),

  /** Nickname */
  [VCARD.nickname]: z.string().optional(),

  // ---- Contact Methods ----

  /** Email address(es) - mailto: URI */
  [VCARD.hasEmail]: oneOrMany(IRI).optional(),

  /** Phone number(s) - tel: URI */
  [VCARD.hasTelephone]: oneOrMany(IRI).optional(),

  /** URL(s) */
  [VCARD.hasURL]: oneOrMany(IRI).optional(),

  // ---- Profile ----

  /** Photo */
  [VCARD.hasPhoto]: IRI.optional(),

  /** Notes about this contact */
  [VCARD.hasNote]: z.string().optional(),

  // ---- Organization ----

  /** Organization name */
  [VCARD.hasOrganizationName]: z.string().optional(),

  /** Role/title */
  [VCARD.hasRole]: z.string().optional(),

  // ---- Solid Integration ----

  /** Their WebID (if they have one) */
  [SOLID.webid]: IRI.optional(),

  // ---- Relationships ----

  /** Related to which of your personas */
  [VCARD.hasRelated]: oneOrMany(NodeRef).optional(),

  /** People this contact knows (foaf:knows) */
  [FOAF.knows]: oneOrMany(NodeRef).optional(),
});

export type Contact = z.infer<typeof ContactSchema>;

// ============================================================================
// Address Book Schema
// ============================================================================

// vCard AddressBook terms (not in @inrupt/vocab-common-rdf)
const VCARD_ADDRESS_BOOK = 'http://www.w3.org/2006/vcard/ns#AddressBook';
const VCARD_NAME_EMAIL_INDEX = 'http://www.w3.org/2006/vcard/ns#nameEmailIndex';

/**
 * An address book container
 */
export const AddressBookSchema = JsonLdBase.extend({
  '@type': z.literal(VCARD_ADDRESS_BOOK),

  /** Title of the address book */
  'http://purl.org/dc/terms/title': z.string(),

  /** Index of names/emails */
  [VCARD_NAME_EMAIL_INDEX]: NodeRef.optional(),
});

export type AddressBook = z.infer<typeof AddressBookSchema>;

// ============================================================================
// Agent/Bot Contact Schema
// ============================================================================

/**
 * A software agent or bot contact
 */
export const AgentContactSchema = ContactSchema.extend({
  // Additional type for software application
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes('https://schema.org/SoftwareApplication');
    },
    { message: '@type must include schema:SoftwareApplication for agents' }
  ),

  /** Application category */
  'https://schema.org/applicationCategory': z.string().optional(),

  /** API endpoint */
  'https://schema.org/url': IRI.optional(),
});

export type AgentContact = z.infer<typeof AgentContactSchema>;

// ============================================================================
// Contact Input (for creation)
// ============================================================================

/**
 * Input schema for creating a new contact
 */
export const ContactInputSchema = z.object({
  /** Full name (required) */
  name: z.string().min(1),

  /** Nickname */
  nickname: z.string().optional(),

  /** Email address */
  email: z.string().email().optional(),

  /** Additional emails */
  additionalEmails: z.array(z.string().email()).optional(),

  /** Phone number */
  phone: z.string().optional(),

  /** URL */
  url: z.string().url().optional(),

  /** Photo URL */
  photo: z.string().url().optional(),

  /** Notes */
  notes: z.string().optional(),

  /** Organization name */
  organization: z.string().optional(),

  /** Role/title */
  role: z.string().optional(),

  /** Their WebID */
  webId: z.string().url().optional(),

  /** Is this an agent/bot? */
  isAgent: z.boolean().optional(),

  /** Agent category (if isAgent) */
  agentCategory: z.string().optional(),
});

export type ContactInput = z.infer<typeof ContactInputSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new Contact JSON-LD document from input
 */
export function createContact(input: ContactInput, baseUrl: string): Contact {
  const uid = generateUID();
  const id = `${baseUrl}/contacts/people#${crypto.randomUUID()}`;

  // Determine type(s)
  const types: string[] = [VCARD.Individual];
  if (input.isAgent) {
    types.push('https://schema.org/SoftwareApplication');
  }

  // Collect emails as mailto: URIs
  const emails: string[] = [];
  if (input.email) {
    emails.push(`mailto:${input.email}`);
  }
  if (input.additionalEmails) {
    emails.push(...input.additionalEmails.map(e => `mailto:${e}`));
  }

  const contact: Contact = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': types.length === 1 ? types[0] : types,
    [VCARD.fn]: input.name,
    [VCARD.hasUID]: uid,
  };

  // Optional fields
  if (input.nickname) contact[VCARD.nickname] = input.nickname;
  if (emails.length === 1) contact[VCARD.hasEmail] = emails[0];
  if (emails.length > 1) contact[VCARD.hasEmail] = emails;
  if (input.phone) contact[VCARD.hasTelephone] = `tel:${input.phone.replace(/\s/g, '')}`;
  if (input.url) contact[VCARD.hasURL] = input.url;
  if (input.photo) contact[VCARD.hasPhoto] = input.photo;
  if (input.notes) contact[VCARD.hasNote] = input.notes;
  if (input.organization) contact[VCARD.hasOrganizationName] = input.organization;
  if (input.role) contact[VCARD.hasRole] = input.role;
  if (input.webId) contact[SOLID.webid] = input.webId;

  // Agent-specific fields
  if (input.isAgent && input.agentCategory) {
    (contact as AgentContact)['https://schema.org/applicationCategory'] = input.agentCategory;
  }

  return contact;
}

/**
 * Create a new AddressBook JSON-LD document
 */
export function createAddressBook(title: string, baseUrl: string): AddressBook {
  return {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': `${baseUrl}/contacts/index#this`,
    '@type': VCARD_ADDRESS_BOOK,
    'http://purl.org/dc/terms/title': title,
    [VCARD_NAME_EMAIL_INDEX]: { '@id': `${baseUrl}/contacts/people` },
  };
}

/**
 * Parse and validate a Contact from JSON
 */
export function parseContact(data: unknown): Contact {
  return ContactSchema.parse(data);
}

/**
 * Safely parse a Contact, returning a result object
 */
export function safeParseContact(data: unknown) {
  return ContactSchema.safeParse(data);
}

/**
 * Type guard for Contact
 */
export function isContact(data: unknown): data is Contact {
  return ContactSchema.safeParse(data).success;
}
