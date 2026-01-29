/**
 * File and Container schemas for Solid Pod.
 * Represents binary files and LDP containers.
 */

import { z } from 'zod';
import { LDP, DCTERMS, POSIX, ACL } from '@inrupt/vocab-common-rdf';
import {
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  oneOrMany,
  nowISO,
  POD_CONTEXT,
} from './base';

// ============================================================================
// Schema.org Constants (for file metadata)
// ============================================================================

export const SCHEMA = {
  NAMESPACE: 'https://schema.org/',
  DigitalDocument: 'https://schema.org/DigitalDocument',
  ImageObject: 'https://schema.org/ImageObject',
  AudioObject: 'https://schema.org/AudioObject',
  VideoObject: 'https://schema.org/VideoObject',
  MediaObject: 'https://schema.org/MediaObject',
  author: 'https://schema.org/author',
  dateCreated: 'https://schema.org/dateCreated',
  dateModified: 'https://schema.org/dateModified',
  contentLocation: 'https://schema.org/contentLocation',
  contentSize: 'https://schema.org/contentSize',
  encodingFormat: 'https://schema.org/encodingFormat',
} as const;

// ============================================================================
// File Metadata Schema
// ============================================================================

/**
 * Metadata for a non-RDF file resource
 */
export const FileMetadataSchema = JsonLdBase.extend({
  // Type must include ldp:NonRDFSource
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(LDP.NonRDFSource);
    },
    { message: `@type must include ${LDP.NonRDFSource}` }
  ),

  // ---- Required ----

  /** Title/name of the file */
  [DCTERMS.title]: z.string().min(1),

  /** MIME type */
  [DCTERMS.format]: z.string(),

  /** File size in bytes */
  [POSIX.size]: z.number().int().nonnegative(),

  // ---- Timestamps ----

  /** Creation date (ISO string) */
  [DCTERMS.created]: z.string().optional(),

  /** Last modified date (ISO string) */
  [DCTERMS.modified]: z.string().optional(),

  // ---- Authorship ----

  /** Author reference */
  [SCHEMA.author]: NodeRef.optional(),

  // ---- Access Control ----

  /** ACL document reference */
  [ACL.accessControl]: NodeRef.optional(),

  // ---- Optional Metadata ----

  /** Description */
  [DCTERMS.description]: z.string().optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// ============================================================================
// Image Metadata Schema (extends FileMetadata)
// ============================================================================

/**
 * Metadata for an image file
 */
export const ImageMetadataSchema = FileMetadataSchema.extend({
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(LDP.NonRDFSource) && arr.includes(SCHEMA.ImageObject);
    },
    { message: `@type must include ${LDP.NonRDFSource} and ${SCHEMA.ImageObject}` }
  ),

  /** Location where photo was taken */
  [SCHEMA.contentLocation]: z.string().optional(),

  /** Original creation date (e.g., when photo was taken) */
  [SCHEMA.dateCreated]: z.string().optional(),

  /** Width in pixels */
  'https://schema.org/width': z.number().int().positive().optional(),

  /** Height in pixels */
  'https://schema.org/height': z.number().int().positive().optional(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

// ============================================================================
// Container Schema
// ============================================================================

/**
 * An LDP Container (folder)
 */
export const ContainerSchema = JsonLdBase.extend({
  // Type must include ldp:Container or ldp:BasicContainer
  '@type': oneOrMany(z.string()).refine(
    (types) => {
      const arr = Array.isArray(types) ? types : [types];
      return arr.includes(LDP.Container) || arr.includes(LDP.BasicContainer);
    },
    { message: `@type must include ${LDP.Container} or ${LDP.BasicContainer}` }
  ),

  /** Title/name of the container */
  [DCTERMS.title]: z.string().optional(),

  /** Description */
  [DCTERMS.description]: z.string().optional(),

  /** Creation date (ISO string) */
  [DCTERMS.created]: z.string().optional(),

  /** Last modified date (ISO string) */
  [DCTERMS.modified]: z.string().optional(),

  /** Contained resources */
  [LDP.contains]: oneOrMany(NodeRef).optional(),
});

export type Container = z.infer<typeof ContainerSchema>;

// ============================================================================
// File Input (for creation)
// ============================================================================

/**
 * Input schema for creating file metadata
 */
export const FileInputSchema = z.object({
  /** File name/title */
  name: z.string().min(1),

  /** MIME type */
  mimeType: z.string(),

  /** File size in bytes */
  size: z.number().int().nonnegative(),

  /** Description */
  description: z.string().optional(),

  /** Author persona ID */
  authorId: z.string().url().optional(),

  // Image-specific
  /** Is this an image? */
  isImage: z.boolean().optional(),

  /** Width (for images) */
  width: z.number().int().positive().optional(),

  /** Height (for images) */
  height: z.number().int().positive().optional(),

  /** Location (for images) */
  location: z.string().optional(),
});

export type FileInput = z.infer<typeof FileInputSchema>;

/**
 * Input schema for creating a container
 */
export const ContainerInputSchema = z.object({
  /** Container name/title */
  name: z.string().min(1),

  /** Description */
  description: z.string().optional(),
});

export type ContainerInput = z.infer<typeof ContainerInputSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Determine the schema.org type based on MIME type
 */
function getMediaType(mimeType: string): string | null {
  if (mimeType.startsWith('image/')) return SCHEMA.ImageObject;
  if (mimeType.startsWith('audio/')) return SCHEMA.AudioObject;
  if (mimeType.startsWith('video/')) return SCHEMA.VideoObject;
  if (mimeType.startsWith('application/pdf')) return SCHEMA.DigitalDocument;
  if (mimeType.startsWith('text/')) return SCHEMA.DigitalDocument;
  return null;
}

/**
 * Create file metadata JSON-LD document
 */
export function createFileMetadata(
  input: FileInput,
  containerId: string,
  fileName: string
): FileMetadata {
  const id = `${containerId}${fileName}`;
  const now = nowISO();

  // Determine types
  const types: string[] = [LDP.NonRDFSource];
  const mediaType = getMediaType(input.mimeType);
  if (mediaType) types.push(mediaType);

  const metadata: FileMetadata = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': types,
    [DCTERMS.title]: input.name,
    [DCTERMS.format]: input.mimeType,
    [POSIX.size]: input.size,
    [DCTERMS.created]: now,
    [DCTERMS.modified]: now,
  };

  // Optional fields
  if (input.description) metadata[DCTERMS.description] = input.description;
  if (input.authorId) metadata[SCHEMA.author] = { '@id': input.authorId };

  // Image-specific fields
  if (input.isImage || input.mimeType.startsWith('image/')) {
    const imgMeta = metadata as ImageMetadata;
    if (input.width) imgMeta['https://schema.org/width'] = input.width;
    if (input.height) imgMeta['https://schema.org/height'] = input.height;
    if (input.location) imgMeta[SCHEMA.contentLocation] = input.location;
  }

  return metadata;
}

/**
 * Create container JSON-LD document
 */
export function createContainer(
  input: ContainerInput,
  baseUrl: string,
  path: string
): Container {
  const id = `${baseUrl}${path}`;
  const now = nowISO();

  const container: Container = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
    '@type': [LDP.Container, LDP.BasicContainer],
    [DCTERMS.title]: input.name,
    [DCTERMS.created]: now,
    [DCTERMS.modified]: now,
  };

  if (input.description) container[DCTERMS.description] = input.description;

  return container;
}

/**
 * Add a resource to a container
 */
export function addToContainer(container: Container, resourceId: string): Container {
  const existing = container[LDP.contains];
  const newRef: NodeRef = { '@id': resourceId };

  if (!existing) {
    container[LDP.contains] = newRef;
  } else if (Array.isArray(existing)) {
    container[LDP.contains] = [...existing, newRef] as NodeRef[];
  } else {
    container[LDP.contains] = [existing, newRef] as NodeRef[];
  }

  // Update modified timestamp
  container[DCTERMS.modified] = nowISO();

  return container;
}

/**
 * Parse and validate FileMetadata from JSON
 */
export function parseFileMetadata(data: unknown): FileMetadata {
  return FileMetadataSchema.parse(data);
}

/**
 * Parse and validate Container from JSON
 */
export function parseContainer(data: unknown): Container {
  return ContainerSchema.parse(data);
}

/**
 * Type guard for FileMetadata
 */
export function isFileMetadata(data: unknown): data is FileMetadata {
  return FileMetadataSchema.safeParse(data).success;
}

/**
 * Type guard for Container
 */
export function isContainer(data: unknown): data is Container {
  return ContainerSchema.safeParse(data).success;
}
