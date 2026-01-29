/**
 * Solid Pod Schemas
 *
 * Zod schemas for Solid-compatible data structures.
 * Use these to validate, parse, and create JSON-LD documents
 * that conform to Solid vocabularies.
 *
 * @example
 * ```typescript
 * import {
 *   createPersona,
 *   createContact,
 *   createGroup,
 *   PersonaSchema,
 *   ContactSchema,
 * } from './schemas';
 *
 * // Create a new persona
 * const persona = createPersona({
 *   name: 'Alice',
 *   email: 'alice@example.com',
 * }, 'https://alice.example.com/my-pod');
 *
 * // Validate unknown data
 * const result = PersonaSchema.safeParse(unknownData);
 * if (result.success) {
 *   console.log('Valid persona:', result.data);
 * }
 * ```
 */

// ============================================================================
// Re-export everything from individual modules
// ============================================================================

// Base types and utilities
export {
  // Schemas
  IRI,
  NodeRef,
  TypedLiteral,
  Literal,
  JsonLdBase,
  // Types
  type JsonLdContext,
  // Utilities
  oneOrMany,
  generateUID,
  iri,
  isNodeRef,
  getId,
  toArray,
  nowISO,
  // Constants
  POD_CONTEXT,
  NS,
} from './base';

// Persona (user identities)
export {
  PersonaSchema,
  PersonaInputSchema,
  createPersona,
  parsePersona,
  safeParsePersona,
  isPersona,
  type Persona,
  type PersonaInput,
} from './persona';

// Contacts (address book)
export {
  ContactSchema,
  AddressBookSchema,
  AgentContactSchema,
  ContactInputSchema,
  createContact,
  createAddressBook,
  parseContact,
  safeParseContact,
  isContact,
  type Contact,
  type AddressBook,
  type AgentContact,
  type ContactInput,
} from './contact';

// Groups and Organizations
export {
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
  // Constants
  ORG,
  TIME,
  type Group,
  type Organization,
  type Team,
  type Membership,
  type GroupInput,
  type MembershipInput,
  type GroupType,
} from './group';

// Files and Containers
export {
  FileMetadataSchema,
  ImageMetadataSchema,
  ContainerSchema,
  FileInputSchema,
  ContainerInputSchema,
  createFileMetadata,
  createContainer,
  addToContainer,
  parseFileMetadata,
  parseContainer,
  isFileMetadata,
  isContainer,
  // Constants
  SCHEMA,
  type FileMetadata,
  type ImageMetadata,
  type Container,
  type FileInput,
  type ContainerInput,
} from './file';

// ============================================================================
// Vocabulary Re-exports (for convenience)
// ============================================================================

export { FOAF, VCARD, LDP, ACL, DCTERMS, POSIX, XSD } from '@inrupt/vocab-common-rdf';
export { SOLID } from '@inrupt/vocab-solid-common';
