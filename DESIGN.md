# TinyBase Solid Pod - Design Document

## Overview

This project implements a browser-based Solid Pod that enables personal data portability across first-party applications. The pod uses Solid-compatible vocabularies and data structures, with TinyBase handling persistence and synchronization.

## Goals

1. **Personal data portability** - Use Solid vocabularies so data is structured, semantic, and portable across your own applications
2. **Offline-first architecture** - Accept that the pod is intermittently available; design for eventual consistency
3. **Upgrade path to federation** - Structure data so a future always-online sync target can enable full Solid federation

## Non-Goals (For Now)

- External Solid federation (other pods/apps reaching this pod)
- Resolvable WebID for external authentication
- Real-time availability for third-party Solid clients

## Architecture

### Current: Browser-Based, First-Party

```
┌─────────────────────────────────────────────────────┐
│                   Your Domain                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
│  │  App A  │───▶│         │◀───│  TinyBase       │  │
│  └─────────┘    │ Browser │    │  (persistence   │  │
│  ┌─────────┐    │  Pod    │    │   + sync)       │  │
│  │  App B  │───▶│ /my-pod │    └─────────────────┘  │
│  └─────────┘    └─────────┘                         │
└─────────────────────────────────────────────────────┘
```

- Pod exists at a route (e.g., `/my-pod`) on your domain
- Only apps on your domain can read/write
- TinyBase handles local persistence (IndexedDB) and sync
- WebID is a logical identifier (may not resolve externally)

### Future: Add Always-Online Sync Target

```
┌─────────────────────────────────────────────────────┐
│                   Your Domain                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
│  │  App A  │───▶│ Browser │◀──▶│  TinyBase       │  │
│  └─────────┘    │  Pod    │    │  Sync           │  │
│  ┌─────────┐    └─────────┘    └────────┬────────┘  │
│  │  App B  │───▶     │                  │           │
│  └─────────┘         │                  │           │
└──────────────────────┼──────────────────┼───────────┘
                       │                  │
                       ▼                  ▼
              ┌─────────────────────────────────┐
              │   Always-Online Solid Server    │
              │   (WebID resolvable, federated) │
              └─────────────────────────────────┘
```

- TinyBase syncs to a real Solid server
- WebID becomes externally resolvable
- Federation with other Solid pods unlocks

---

## Core Concepts

### 1. User Personas / Identities

Multiple WebID profiles for different contexts (work, personal, anonymous).

**Use Cases:**
- Present different identities to different apps/services
- Separate professional and personal data
- Pseudonymous interactions

**Vocabularies:** `foaf:`, `vcard:`, `solid:`, `cert:`

**Structure:**
```turtle
# Primary identity
</my-pod/profile/card#me> a foaf:Person, schema:Person ;
    foaf:name "Alice" ;
    vcard:hasEmail <mailto:alice@example.com> ;
    solid:oidcIssuer <https://login.provider.com> ;
    cert:key </my-pod/profile/card#publicKey> ;
    foaf:isPrimaryTopicOf </my-pod/profile/card> .

# Work persona (separate WebID)
</my-pod/profiles/work#me> a foaf:Person, schema:Person ;
    foaf:name "Alice Professional" ;
    vcard:hasEmail <mailto:alice@company.com> ;
    vcard:hasOrganizationName "ACME Corp" ;
    solid:oidcIssuer <https://company.okta.com> ;
    foaf:isPrimaryTopicOf </my-pod/profiles/work> .

# Anonymous/pseudonymous persona
</my-pod/profiles/anon#me> a foaf:Person ;
    foaf:nick "anon42" ;
    foaf:isPrimaryTopicOf </my-pod/profiles/anon> .
```

**Fields per Persona:**
- Display name, nickname
- Email, phone, other contact methods
- Avatar/photo
- Bio/description
- OIDC issuer (for auth)
- Public keys (for signing/encryption)
- Links to other profiles (owl:sameAs for linking, or keep separate)

---

### 2. Contacts (People / Agents)

Information about other people, bots, or agents you interact with.

**Use Cases:**
- Address book
- Track who you've interacted with
- Store their WebIDs for future federation
- Auth info for services/APIs they provide

**Vocabularies:** `vcard:` (primary), `foaf:`

**Structure:**
```turtle
# Address book index
</my-pod/contacts/index.ttl#this> a vcard:AddressBook ;
    dc:title "My Contacts" ;
    vcard:nameEmailIndex </my-pod/contacts/people.ttl> .

# Individual contact
</my-pod/contacts/people.ttl#jane-doe> a vcard:Individual ;
    vcard:fn "Jane Doe" ;
    vcard:hasUID "urn:uuid:550e8400-e29b-41d4-a716-446655440000" ;
    vcard:hasEmail <mailto:jane@example.com> ;
    vcard:hasTelephone <tel:+1-555-123-4567> ;
    vcard:hasPhoto <https://example.com/jane.jpg> ;
    vcard:hasNote "Met at conference 2025" ;
    # Link to their WebID if they have one
    solid:webid <https://jane.solidcommunity.net/profile/card#me> ;
    # Which of my personas knows them
    vcard:hasRelated </my-pod/profiles/work#me> .

# Agent/Bot contact
</my-pod/contacts/people.ttl#helper-bot> a vcard:Individual, schema:SoftwareApplication ;
    vcard:fn "Helper Bot" ;
    vcard:hasURL <https://helper.bot/api> ;
    schema:applicationCategory "Assistant" ;
    # API credentials (encrypted or reference to secure storage)
    :hasCredential </my-pod/credentials/helper-bot> .
```

**Fields per Contact:**
- Full name, nickname
- Contact methods (email, phone, URL)
- Photo
- Notes
- Their WebID (if they have one)
- Relationship to which of your personas
- For agents: API endpoints, credential references

---

### 3. Associations (Groups / Organizations / Teams)

Collections of people with membership and roles.

**Use Cases:**
- Teams you're part of
- Organizations you belong to
- Custom groups (family, project collaborators)
- Role-based access control

**Vocabularies:** `org:` (W3C Organization Ontology), `vcard:Group`, `foaf:Group`

**Structure:**
```turtle
# Organization
</my-pod/groups/acme-corp#org> a org:Organization, vcard:Organization ;
    vcard:fn "ACME Corporation" ;
    vcard:hasURL <https://acme.example.com> ;
    vcard:hasLogo <https://acme.example.com/logo.png> ;
    org:hasUnit </my-pod/groups/acme-engineering#team> .

# Team within organization
</my-pod/groups/acme-engineering#team> a org:OrganizationalUnit, vcard:Group ;
    vcard:fn "Engineering Team" ;
    org:unitOf </my-pod/groups/acme-corp#org> ;
    # Simple membership
    vcard:hasMember </my-pod/contacts/people.ttl#jane-doe> ;
    vcard:hasMember </my-pod/profiles/work#me> .

# Role-based membership
</my-pod/groups/acme-engineering#team> org:hasMembership [
    a org:Membership ;
    org:member </my-pod/profiles/work#me> ;
    org:role </my-pod/vocab/roles#lead> ;
    org:memberDuring [
        a time:Interval ;
        time:hasBeginning "2024-01-15"^^xsd:date
    ]
] .

# Custom group (not an org)
</my-pod/groups/book-club#group> a vcard:Group, foaf:Group ;
    vcard:fn "Tuesday Book Club" ;
    vcard:hasMember </my-pod/contacts/people.ttl#jane-doe> ;
    vcard:hasMember </my-pod/profiles/personal#me> ;
    dc:description "Weekly book discussion group" .
```

**Fields per Association:**
- Name, description
- Type (organization, team, informal group)
- Logo/image
- URL
- Parent organization (if applicable)
- Members (simple list or with roles)
- Membership metadata (role, start date, etc.)

---

### 4. Files (Binary Data)

Non-RDF resources like documents, images, etc.

**Use Cases:**
- Store documents, images, media
- Attach files to other resources
- Portable file storage across apps

**Vocabularies:** `ldp:` (Linked Data Platform), `posix:`, `dc:`

**Structure:**
```turtle
# Container (folder)
</my-pod/files/documents/> a ldp:Container, ldp:BasicContainer ;
    dc:title "Documents" ;
    dc:created "2025-06-01"^^xsd:date ;
    ldp:contains </my-pod/files/documents/report.pdf> ;
    ldp:contains </my-pod/files/documents/notes.md> .

# File resource (metadata)
</my-pod/files/documents/report.pdf> a ldp:NonRDFSource, schema:DigitalDocument ;
    dc:title "Q4 Report" ;
    dc:created "2026-01-15"^^xsd:date ;
    dc:modified "2026-01-20"^^xsd:date ;
    dc:format "application/pdf" ;
    posix:size 245000 ;
    schema:author </my-pod/profiles/work#me> ;
    # Access control
    acl:accessControl </my-pod/files/documents/report.pdf.acl> .

# Image with additional metadata
</my-pod/files/photos/vacation.jpg> a ldp:NonRDFSource, schema:ImageObject ;
    dc:title "Beach Sunset" ;
    dc:format "image/jpeg" ;
    posix:size 2450000 ;
    schema:contentLocation "Malibu, CA" ;
    schema:dateCreated "2025-12-25"^^xsd:date ;
    schema:exifData [
        schema:name "camera" ;
        schema:value "iPhone 15"
    ] .
```

**Metadata per File:**
- Title, description
- MIME type
- Size
- Created/modified dates
- Author (link to persona)
- Location (for photos)
- Access control reference
- Custom metadata as needed

---

## Pod Structure

```
/my-pod/
├── profile/
│   └── card                    # Primary WebID document
├── profiles/
│   ├── work                    # Work persona
│   ├── personal                # Personal persona
│   └── {persona-slug}          # Additional personas
├── contacts/
│   ├── index.ttl               # Address book index
│   └── people.ttl              # Contact entries
├── groups/
│   ├── index.ttl               # Groups index
│   └── {group-slug}.ttl        # Individual group documents
├── files/
│   ├── documents/              # Document container
│   ├── photos/                 # Photo container
│   └── {container}/            # Additional containers
├── settings/
│   └── prefs.ttl               # App preferences
└── credentials/
    └── {service-slug}          # Encrypted credential storage
```

---

## Ontology Prefixes

```turtle
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix ldp: <http://www.w3.org/ns/ldp#> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix posix: <http://www.w3.org/ns/posix/stat#> .
@prefix dc: <http://purl.org/dc/terms/> .
@prefix schema: <https://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix time: <http://www.w3.org/2006/time#> .
@prefix cert: <http://www.w3.org/ns/auth/cert#> .
```

---

## Design Considerations

### 1. Use Real IRIs

Even though WebIDs won't resolve externally yet, use real URLs based on your domain:

```turtle
# Good - upgradeable to real Solid
<https://yourdomain.com/my-pod/profile/card#me>

# Avoid - trapped locally
<local://profile#me>
<urn:local:profile:me>
```

### 2. Solid-Compliant Container Structure

Mirror standard Solid pod layout so a future server can sync directly:
- Use `ldp:Container` for folders
- Use `ldp:contains` for containment relationships
- Store metadata in `.meta` files or as RDF properties

### 3. RDF Serialization for TinyBase

Options for storing RDF in TinyBase:
- **JSON-LD** - Native JSON, easy to work with in JavaScript
- **Triple table** - `(subject, predicate, object)` rows
- **Quad table** - Add graph/document column for named graphs

Recommended: JSON-LD for individual documents, with TinyBase handling the document store.

### 4. Implement ACLs Early

Even as the only user, implement Web Access Control structure:

```turtle
# /my-pod/profile/card.acl
</my-pod/profile/card.acl#owner> a acl:Authorization ;
    acl:agent </my-pod/profile/card#me> ;
    acl:accessTo </my-pod/profile/card> ;
    acl:mode acl:Read, acl:Write, acl:Control .

</my-pod/profile/card.acl#public> a acl:Authorization ;
    acl:agentClass foaf:Agent ;
    acl:accessTo </my-pod/profile/card> ;
    acl:mode acl:Read .
```

### 5. Credential Storage

For API tokens and auth info:
- Store references in RDF, not raw secrets
- Actual credentials in encrypted storage (separate from RDF)
- Consider Web Crypto API for encryption

---

## TinyBase Integration

### Proposed Table Structure

```typescript
// Documents table - stores JSON-LD documents
{
  documents: {
    [iri: string]: {
      content: string,      // JSON-LD serialized
      contentType: string,  // 'application/ld+json' | 'text/turtle'
      modified: number,     // timestamp
      etag: string,         // for sync
    }
  }
}

// Binary files table - stores file metadata + blob references
{
  files: {
    [iri: string]: {
      metadata: string,     // JSON-LD metadata
      blobId: string,       // Reference to blob storage
      size: number,
      mimeType: string,
    }
  }
}

// Blob storage (IndexedDB via TinyBase persister)
// Actual binary content stored separately
```

### Sync Strategy

1. TinyBase persists to IndexedDB locally
2. TinyBase sync to remote server (future)
3. Conflict resolution: last-write-wins or custom merge

---

## Zod Schemas for Runtime Validation

Since TinyBase stores data as JSON, we use Zod for runtime validation of our Solid-compatible data structures. This provides type safety at runtime and enables TypeScript inference.

### Available Vocabulary Packages

```typescript
// Common RDF vocabularies (FOAF, vCard, LDP, etc.)
import { FOAF, VCARD, LDP, ACL, DCTERMS, POSIX, XSD } from '@inrupt/vocab-common-rdf';

// Solid-specific vocabularies
import { SOLID, ACP } from '@inrupt/vocab-solid-common';
```

### Base Schemas

```typescript
import { z } from 'zod';

// IRI (Internationalized Resource Identifier)
const IRI = z.string().url();

// Literal with optional datatype
const Literal = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({
    '@value': z.string(),
    '@type': z.string().optional(),
    '@language': z.string().optional(),
  }),
]);

// JSON-LD node reference
const NodeRef = z.object({
  '@id': IRI,
});

// Base for all JSON-LD documents
const JsonLdDocument = z.object({
  '@context': z.union([z.string(), z.record(z.string()), z.array(z.any())]).optional(),
  '@id': IRI.optional(),
  '@type': z.union([z.string(), z.array(z.string())]).optional(),
});
```

### Persona Schema

```typescript
import { FOAF, VCARD, SOLID } from '@inrupt/vocab-common-rdf';

const PersonaSchema = JsonLdDocument.extend({
  '@type': z.union([
    z.literal(FOAF.Person),
    z.array(z.string()).refine(arr => arr.includes(FOAF.Person)),
  ]),

  // Identity
  [FOAF.name]: z.string(),
  [FOAF.nick]: z.string().optional(),
  [FOAF.img]: IRI.optional(),

  // Contact
  [VCARD.hasEmail]: z.union([IRI, z.array(IRI)]).optional(),
  [VCARD.hasTelephone]: z.union([IRI, z.array(IRI)]).optional(),

  // Bio
  [VCARD.note]: z.string().optional(),

  // Auth
  [SOLID.oidcIssuer]: NodeRef.optional(),

  // Document metadata
  [FOAF.isPrimaryTopicOf]: NodeRef.optional(),
});

type Persona = z.infer<typeof PersonaSchema>;
```

### Contact Schema

```typescript
const ContactSchema = JsonLdDocument.extend({
  '@type': z.literal(VCARD.Individual),

  // Required
  [VCARD.fn]: z.string(),  // Full name
  [VCARD.hasUID]: z.string().uuid(),

  // Contact methods
  [VCARD.hasEmail]: z.union([IRI, z.array(IRI)]).optional(),
  [VCARD.hasTelephone]: z.union([IRI, z.array(IRI)]).optional(),
  [VCARD.hasURL]: z.union([IRI, z.array(IRI)]).optional(),

  // Metadata
  [VCARD.hasPhoto]: IRI.optional(),
  [VCARD.hasNote]: z.string().optional(),

  // Solid integration
  [SOLID.webid]: IRI.optional(),  // Their WebID if they have one

  // Relationship to your personas
  [VCARD.hasRelated]: z.union([NodeRef, z.array(NodeRef)]).optional(),
});

type Contact = z.infer<typeof ContactSchema>;
```

### Group/Organization Schema

```typescript
import { ORG } from '@inrupt/vocab-common-rdf';

const GroupType = z.enum(['organization', 'team', 'group']);

const MembershipSchema = z.object({
  '@type': z.literal(ORG.Membership),
  [ORG.member]: NodeRef,
  [ORG.role]: NodeRef.optional(),
  [ORG.memberDuring]: z.object({
    '@type': z.literal('http://www.w3.org/2006/time#Interval'),
    'http://www.w3.org/2006/time#hasBeginning': z.string().optional(),
    'http://www.w3.org/2006/time#hasEnd': z.string().optional(),
  }).optional(),
});

const GroupSchema = JsonLdDocument.extend({
  '@type': z.union([
    z.literal(VCARD.Group),
    z.literal(ORG.Organization),
    z.literal(ORG.OrganizationalUnit),
    z.array(z.string()),
  ]),

  // Identity
  [VCARD.fn]: z.string(),  // Name
  [DCTERMS.description]: z.string().optional(),
  [VCARD.hasURL]: IRI.optional(),
  [VCARD.hasLogo]: IRI.optional(),

  // Hierarchy
  [ORG.unitOf]: NodeRef.optional(),  // Parent org
  [ORG.hasUnit]: z.union([NodeRef, z.array(NodeRef)]).optional(),  // Child units

  // Simple membership
  [VCARD.hasMember]: z.union([NodeRef, z.array(NodeRef)]).optional(),

  // Role-based membership
  [ORG.hasMembership]: z.union([MembershipSchema, z.array(MembershipSchema)]).optional(),
});

type Group = z.infer<typeof GroupSchema>;
```

### File Metadata Schema

```typescript
const FileMetadataSchema = JsonLdDocument.extend({
  '@type': z.union([
    z.literal(LDP.NonRDFSource),
    z.array(z.string()).refine(arr => arr.includes(LDP.NonRDFSource)),
  ]),

  // Required
  [DCTERMS.title]: z.string(),
  [DCTERMS.format]: z.string(),  // MIME type
  [POSIX.size]: z.number().int().nonnegative(),

  // Timestamps
  [DCTERMS.created]: z.string().datetime().optional(),
  [DCTERMS.modified]: z.string().datetime().optional(),

  // Authorship
  'https://schema.org/author': NodeRef.optional(),

  // Access control
  [ACL.accessControl]: NodeRef.optional(),
});

type FileMetadata = z.infer<typeof FileMetadataSchema>;

const ContainerSchema = JsonLdDocument.extend({
  '@type': z.array(z.string()).refine(
    arr => arr.includes(LDP.Container) || arr.includes(LDP.BasicContainer)
  ),

  [DCTERMS.title]: z.string().optional(),
  [DCTERMS.created]: z.string().datetime().optional(),
  [LDP.contains]: z.union([NodeRef, z.array(NodeRef)]).optional(),
});

type Container = z.infer<typeof ContainerSchema>;
```

### Address Book Schema

```typescript
const AddressBookSchema = JsonLdDocument.extend({
  '@type': z.literal(VCARD.AddressBook),
  [DCTERMS.title]: z.string(),
  [VCARD.nameEmailIndex]: NodeRef.optional(),
});

type AddressBook = z.infer<typeof AddressBookSchema>;
```

### Validation Utilities

```typescript
// Validate and parse with helpful errors
function parsePersona(data: unknown): Persona {
  return PersonaSchema.parse(data);
}

// Safe parse (returns result object)
function safeParseContact(data: unknown) {
  return ContactSchema.safeParse(data);
}

// Validate JSON-LD from TinyBase
function validateDocument<T extends z.ZodType>(
  schema: T,
  jsonLd: string
): z.infer<T> {
  const parsed = JSON.parse(jsonLd);
  return schema.parse(parsed);
}

// Type guard
function isPersona(data: unknown): data is Persona {
  return PersonaSchema.safeParse(data).success;
}
```

### JSON-LD Context

For consistent serialization, use a shared context:

```typescript
const POD_CONTEXT = {
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
};
```

### Integration with TinyBase

```typescript
import { createStore } from 'tinybase';

const store = createStore();

// Define tables that match our schemas
store.setTablesSchema({
  personas: {
    id: { type: 'string' },        // IRI
    content: { type: 'string' },   // JSON-LD (validated by PersonaSchema)
    modified: { type: 'number' },
  },
  contacts: {
    id: { type: 'string' },
    content: { type: 'string' },   // JSON-LD (validated by ContactSchema)
    modified: { type: 'number' },
  },
  groups: {
    id: { type: 'string' },
    content: { type: 'string' },   // JSON-LD (validated by GroupSchema)
    modified: { type: 'number' },
  },
  files: {
    id: { type: 'string' },
    metadata: { type: 'string' },  // JSON-LD (validated by FileMetadataSchema)
    blobId: { type: 'string' },
    modified: { type: 'number' },
  },
});

// Helper to get typed data
function getPersona(store: Store, id: string): Persona | null {
  const row = store.getRow('personas', id);
  if (!row?.content) return null;
  return PersonaSchema.parse(JSON.parse(row.content as string));
}

// Helper to set validated data
function setContact(store: Store, contact: Contact): void {
  ContactSchema.parse(contact);  // Validate first
  store.setRow('contacts', contact['@id']!, {
    id: contact['@id']!,
    content: JSON.stringify(contact),
    modified: Date.now(),
  });
}
```

---

## Future Considerations

### Federation Readiness

When adding an always-online component:
- Sync TinyBase to Solid server (CSS, NSS, or custom)
- WebID URLs become resolvable
- Enable inbox for receiving notifications
- Implement WebID-OIDC for authentication

### Multi-Device

- TinyBase sync handles multi-device scenarios
- Same pod accessible from multiple browsers/devices
- Conflict resolution becomes important

### Interoperability Testing

- Test data exports against Solid validators
- Ensure compatibility with existing Solid apps
- Verify WebID profile meets minimum requirements

---

## References

- [Solid Specification](https://solidproject.org/TR/protocol)
- [WebID Specification](https://www.w3.org/2005/Incubator/webid/spec/identity/)
- [Solid OIDC](https://solidproject.org/TR/oidc)
- [Web Access Control](https://solidproject.org/TR/wac)
- [vCard Ontology](https://www.w3.org/TR/vcard-rdf/)
- [Organization Ontology](https://www.w3.org/TR/vocab-org/)
- [Linked Data Platform](https://www.w3.org/TR/ldp/)
- [TinyBase Documentation](https://tinybase.org/)
