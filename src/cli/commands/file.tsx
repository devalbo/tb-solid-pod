import React from 'react';
import { Box, Text } from 'ink';
import type { Command, CliContext } from '../types';
import { DCTERMS } from '@inrupt/vocab-common-rdf';
import { SCHEMA } from '../../schemas/file';

const PERSONAS_TABLE = 'personas';

/**
 * Resolve a path relative to the current URL
 */
const resolvePath = (currentUrl: string, path: string, baseUrl: string): string => {
  if (path.startsWith('/')) {
    return baseUrl + path.slice(1);
  }
  if (path === '..' || path === '../') {
    const url = new URL(currentUrl);
    const parent = new URL('..', url).href;
    return parent.startsWith(baseUrl) ? parent : baseUrl;
  }
  const base = currentUrl.endsWith('/') ? currentUrl : currentUrl + '/';
  return new URL(path, base).href;
};

/**
 * Find a persona by partial ID or name
 */
const findPersonaId = (
  store: CliContext['store'],
  query: string
): string | null => {
  const personas = store.getTable(PERSONAS_TABLE) || {};

  // Check exact match first
  if (personas[query]) return query;

  // Check by short ID (last part of URL)
  for (const id of Object.keys(personas)) {
    const shortId = id.split('/').pop()?.replace('#me', '');
    if (shortId === query) return id;
  }

  // Check by name (case-insensitive)
  for (const [id, record] of Object.entries(personas)) {
    const name = (record as Record<string, unknown>)['http://xmlns.com/foaf/0.1/name'] as string | undefined;
    if (name?.toLowerCase() === query.toLowerCase()) return id;
  }

  return null;
};

/**
 * Format file size in human-readable format
 */
const formatSize = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === null) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * file info - Show file metadata
 */
const infoSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];

  if (!path) {
    addOutput(<Text color="red">file info: missing file operand</Text>, 'error');
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl) as Record<string, unknown> | undefined;

  if (!row) {
    addOutput(<Text color="red">file info: {path}: No such file</Text>, 'error');
    return;
  }

  if (row.type === 'Container') {
    addOutput(<Text color="red">file info: {path}: Is a directory</Text>, 'error');
    return;
  }

  const name = targetUrl.split('/').filter(Boolean).pop() || path;
  const contentType = row.contentType as string | undefined;
  const body = row.body as string | undefined;
  const size = body ? body.length : 0;
  const updated = row.updated as string | undefined;

  // Get metadata fields
  const title = row[DCTERMS.title] as string | undefined;
  const description = row[DCTERMS.description] as string | undefined;
  const created = row[DCTERMS.created] as string | undefined;
  const modified = row[DCTERMS.modified] as string | undefined;
  const authorRef = row[SCHEMA.author] as { '@id': string } | string | undefined;
  const authorId = typeof authorRef === 'object' ? authorRef['@id'] : authorRef;

  // Get image-specific metadata
  const isImage = contentType?.startsWith('image/');
  const width = row['https://schema.org/width'] as number | undefined;
  const height = row['https://schema.org/height'] as number | undefined;
  const location = row[SCHEMA.contentLocation] as string | undefined;

  // Look up author name if we have an ID
  let authorName: string | undefined;
  if (authorId) {
    const persona = store.getRow(PERSONAS_TABLE, authorId) as Record<string, unknown> | undefined;
    authorName = persona?.['http://xmlns.com/foaf/0.1/name'] as string | undefined;
  }

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan" bold>{name}</Text>
      <Box><Text dimColor>URL:</Text> <Text>{targetUrl}</Text></Box>
      <Box><Text dimColor>Type:</Text> <Text>{contentType || 'unknown'}</Text></Box>
      <Box><Text dimColor>Size:</Text> <Text>{formatSize(size)}</Text></Box>
      {updated && (
        <Box><Text dimColor>Updated:</Text> <Text>{new Date(updated).toLocaleString()}</Text></Box>
      )}
      <Text bold>Metadata</Text>
      <Box><Text dimColor>Title:</Text> <Text>{title || <Text dimColor>(not set)</Text>}</Text></Box>
      <Box><Text dimColor>Description:</Text> <Text>{description || <Text dimColor>(not set)</Text>}</Text></Box>
      <Box>
        <Text dimColor>Author:</Text>
        {authorName ? <Text>{authorName}</Text> : authorId ? <Text dimColor>{authorId}</Text> : <Text dimColor>(not set)</Text>}
      </Box>
      {created && (
        <Box><Text dimColor>Created:</Text> <Text>{new Date(created).toLocaleString()}</Text></Box>
      )}
      {modified && (
        <Box><Text dimColor>Modified:</Text> <Text>{new Date(modified).toLocaleString()}</Text></Box>
      )}
      {isImage && (
        <Box flexDirection="column">
          <Text bold>Image Properties</Text>
          {(width && height) ? (
            <Box><Text dimColor>Dimensions:</Text> <Text>{width} × {height} px</Text></Box>
          ) : (
            <Box><Text dimColor>Dimensions:</Text> <Text dimColor>(not set)</Text></Box>
          )}
          <Box><Text dimColor>Location:</Text> <Text>{location || <Text dimColor>(not set)</Text>}</Text></Box>
        </Box>
      )}
    </Box>
  );
};

/**
 * file set-author - Set file author
 */
const setAuthorSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const [path, personaQuery] = args;

  if (!path) {
    addOutput(<Text color="red">file set-author: missing file operand</Text>, 'error');
    return;
  }

  if (!personaQuery) {
    addOutput(<Text color="red">file set-author: missing persona operand</Text>, 'error');
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(<Text color="red">file set-author: {path}: No such file</Text>, 'error');
    return;
  }

  if (row.type === 'Container') {
    addOutput(<Text color="red">file set-author: {path}: Is a directory</Text>, 'error');
    return;
  }

  const personaId = findPersonaId(store, personaQuery);
  if (!personaId) {
    addOutput(<Text color="red">file set-author: persona not found: {personaQuery}</Text>, 'error');
    return;
  }

  // Get persona name for display
  const persona = store.getRow(PERSONAS_TABLE, personaId) as Record<string, unknown> | undefined;
  const personaName = persona?.['http://xmlns.com/foaf/0.1/name'] as string || personaId;

  // Set author
  store.setCell('resources', targetUrl, SCHEMA.author, JSON.stringify({ '@id': personaId }));
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(
    <Text color="green">Set author of {path} to {personaName}</Text>,
    'success'
  );
};

/**
 * file set-title - Set file title
 */
const setTitleSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];
  const title = args.slice(1).join(' ');

  if (!path) {
    addOutput(<Text color="red">file set-title: missing file operand</Text>, 'error');
    return;
  }

  if (!title) {
    addOutput(<Text color="red">file set-title: missing title</Text>, 'error');
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(<Text color="red">file set-title: {path}: No such file</Text>, 'error');
    return;
  }

  if (row.type === 'Container') {
    addOutput(<Text color="red">file set-title: {path}: Is a directory</Text>, 'error');
    return;
  }

  store.setCell('resources', targetUrl, DCTERMS.title, title);
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(<Text color="green">Set title of {path} to "{title}"</Text>, 'success');
};

/**
 * file set-description - Set file description
 */
const setDescriptionSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];
  const description = args.slice(1).join(' ');

  if (!path) {
    addOutput(<Text color="red">file set-description: missing file operand</Text>, 'error');
    return;
  }

  if (!description) {
    addOutput(<Text color="red">file set-description: missing description</Text>, 'error');
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(<Text color="red">file set-description: {path}: No such file</Text>, 'error');
    return;
  }

  if (row.type === 'Container') {
    addOutput(<Text color="red">file set-description: {path}: Is a directory</Text>, 'error');
    return;
  }

  store.setCell('resources', targetUrl, DCTERMS.description, description);
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(<Text color="green">Set description of {path}</Text>, 'success');
};

/**
 * file command - File metadata management
 */
export const fileCommand: Command = {
  name: 'file',
  description: 'File metadata management',
  usage: `file <subcommand> [options]

Subcommands:
  info <path>                    Show file metadata
  set-author <path> <persona>    Set file author
  set-title <path> <title>       Set file title
  set-description <path> <desc>  Set file description

Examples:
  file info notes.txt
  file set-author notes.txt "John Doe"
  file set-title notes.txt "My Important Notes"
  file set-description notes.txt "Contains meeting notes from January"`,
  execute: (args, context) => {
    const subcommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    if (!subcommand || subcommand === 'help') {
      context.addOutput(<Text>{fileCommand.usage}</Text>);
      return;
    }

    switch (subcommand) {
      case 'info':
        return infoSubcommand(subArgs, context);
      case 'set-author':
        return setAuthorSubcommand(subArgs, context);
      case 'set-title':
        return setTitleSubcommand(subArgs, context);
      case 'set-description':
        return setDescriptionSubcommand(subArgs, context);
      default:
        context.addOutput(
          <Text color="red">file: unknown subcommand: {subcommand}. Type "file help" for usage.</Text>,
          'error'
        );
    }
  },
};
