/**
 * Solid Preferences document schema.
 * A preferences file is referenced by pim:preferencesFile from a WebID profile.
 * It typically contains the private type index and other app preferences.
 *
 * @see https://solidproject.org/TR/protocol#preferences
 */

import { z } from 'zod';
import { SOLID } from '@inrupt/vocab-solid-common';
import {
  NodeRef,
  JsonLdBase,
  JsonLdContext,
  POD_CONTEXT,
} from './base';

// ============================================================================
// Preferences Schema
// ============================================================================

/**
 * A Solid preferences document.
 * Often stored at .../settings/prefs and linked from the WebID profile.
 */
export const PreferencesSchema = JsonLdBase.extend({
  /** Link to private type index (common in preferences) */
  [SOLID.privateTypeIndex]: NodeRef.optional(),
}).passthrough();

export type Preferences = z.infer<typeof PreferencesSchema>;

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a preferences document
 */
export function createPreferences(
  id: string,
  options?: { privateTypeIndex?: string }
): Preferences & { '@context': JsonLdContext } {
  const prefs: Preferences & { '@context': JsonLdContext } = {
    '@context': POD_CONTEXT as JsonLdContext,
    '@id': id,
  };

  if (options?.privateTypeIndex) {
    prefs[SOLID.privateTypeIndex] = { '@id': options.privateTypeIndex };
  }

  return prefs;
}

/**
 * Parse and validate a Preferences document
 */
export function parsePreferences(data: unknown): Preferences {
  return PreferencesSchema.parse(data);
}

/**
 * Safely parse Preferences
 */
export function safeParsePreferences(data: unknown) {
  return PreferencesSchema.safeParse(data);
}
