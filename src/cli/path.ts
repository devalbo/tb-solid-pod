import { z } from 'zod';
import { errorCodeSchema } from './types';

/**
 * Centralized path utilities for the virtual pod. This is the single source of truth
 * for resolving/validating paths for CLI, UI, and (as a safety net) VirtualPod.
 *
 * - Containers end with a trailing slash `/`
 * - Resource (file) URLs do not end with `/`
 * - All child names are URL-encoded segments
 */

const MAX_SEGMENT_LENGTH = 255;
const hasControlChars = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
};

export const pathResultSchema = z.object({
  valid: z.literal(true),
  url: z.string(),
  isContainer: z.boolean(),
});

export const pathErrorSchema = z.object({
  valid: z.literal(false),
  error: z.string(),
  code: errorCodeSchema,
});

export type PathResult = z.infer<typeof pathResultSchema>;
export type PathError = z.infer<typeof pathErrorSchema>;
export type ResolveResult = PathResult | PathError;

export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export function removeTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function isContainer(url: string): boolean {
  return url.endsWith('/');
}

export function isDescendantOf(url: string, ancestorUrl: string): boolean {
  const a = ensureTrailingSlash(ancestorUrl);
  return url === a || url.startsWith(a);
}

export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // If decoding fails, fall back to raw segment for display (but callers may treat as invalid).
    return segment;
  }
}

export function encodeSegment(name: string): string {
  return encodeURIComponent(name);
}

/**
 * Validate a single path segment name (decoded).
 *
 * Returns null when valid, otherwise a PathError-like object (valid:false).
 * Error codes are mapped to CLI ErrorCode values for compatibility.
 */
export function validateName(name: string): PathError | null {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name cannot be empty', code: 'INVALID_PATH' };
  }
  if (name.includes('/')) {
    return { valid: false, error: 'Name cannot contain forward slash', code: 'INVALID_PATH' };
  }
  if (name.length > MAX_SEGMENT_LENGTH) {
    return {
      valid: false,
      error: `Name too long (max ${MAX_SEGMENT_LENGTH} chars)`,
      code: 'INVALID_PATH',
    };
  }
  if (hasControlChars(name)) {
    return {
      valid: false,
      error: 'Name contains invalid control characters',
      code: 'INVALID_PATH',
    };
  }
  return null;
}

export function getParentUrl(url: string, baseUrl: string): string {
  const base = ensureTrailingSlash(baseUrl);
  const cur = ensureTrailingSlash(url);
  try {
    const parent = new URL('..', cur).href;
    return parent.startsWith(base) ? parent : base;
  } catch {
    return base;
  }
}

export function getSegments(url: string, baseUrl: string): string[] {
  const base = ensureTrailingSlash(baseUrl);
  if (!url.startsWith(base)) return [];
  const rel = url.slice(base.length);
  const raw = rel.split('/').filter(Boolean);
  return raw.map(decodeSegment);
}

/**
 * Resolve a user-provided path (absolute `/...` or relative) to a fully qualified URL
 * within `baseUrl`, using `currentUrl` as the starting point.
 */
export function resolvePath(currentUrl: string, inputPath: string, baseUrl: string): ResolveResult {
  const base = ensureTrailingSlash(baseUrl);
  const current = ensureTrailingSlash(currentUrl);
  const raw = inputPath.trim();

  if (!raw || raw === '.') {
    return { valid: true, url: currentUrl, isContainer: isContainer(currentUrl) };
  }

  // Absolute "pod path": /foo/bar
  if (raw.startsWith('/')) {
    const relativePart = raw.slice(1);
    return resolveRelative(base, relativePart, base);
  }

  // Parent traversal shortcuts
  if (raw === '..' || raw === '../') {
    return { valid: true, url: getParentUrl(currentUrl, base), isContainer: true };
  }

  return resolveRelative(current, raw, base);
}

function resolveRelative(base: string, path: string, rootUrl: string): ResolveResult {
  const trailingSlash = path.endsWith('/');
  const rawSegments = path.split('/').filter((s) => s && s !== '.');
  let cur = ensureTrailingSlash(base);

  for (const seg of rawSegments) {
    if (seg === '..') {
      cur = getParentUrl(cur, rootUrl);
      continue;
    }

    // Segment may already be encoded (e.g. user types "%20"). Decode for validation and normalize.
    let decoded: string;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      return { valid: false, error: `Invalid URL encoding in segment: ${seg}`, code: 'INVALID_PATH' };
    }

    const nameError = validateName(decoded);
    if (nameError) return nameError;

    cur = cur + encodeSegment(decoded) + '/';
  }

  // Prevent escape above root
  if (!cur.startsWith(rootUrl)) {
    return { valid: false, error: 'Path escapes root directory', code: 'ESCAPE_ATTEMPT' };
  }

  // Remove trailing slash for file targets when input doesn't end in '/'
  let resolved = cur;
  if (!trailingSlash && rawSegments.length > 0) {
    resolved = removeTrailingSlash(resolved);
  }

  return { valid: true, url: resolved, isContainer: isContainer(resolved) };
}

