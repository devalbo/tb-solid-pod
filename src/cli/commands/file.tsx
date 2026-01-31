import { Box, Text } from 'ink';
import type { Command, CliContext, CommandResult } from '../types';
import { DCTERMS } from '@inrupt/vocab-common-rdf';
import { SCHEMA } from '../../schemas/file';
import { STORE_TABLES } from '../../storeLayout';
import { findPersona } from '../entity-lookup';
import { parseCliArgs, hasJsonFlag } from '../parse-args';
import { resolvePath } from '../path';

const PERSONAS_TABLE = STORE_TABLES.PERSONAS;
const RESOURCES_TABLE = STORE_TABLES.RESOURCES;

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
const infoSubcommand = (
  args: string[],
  context: CliContext,
  options?: { silent?: boolean; json?: boolean }
): CommandResult<{
  url: string;
  name: string;
  contentType: string;
  size: number;
  updated?: string;
  title?: string;
  description?: string;
  created?: string;
  modified?: string;
  authorId?: string;
  authorName?: string;
  image?: { width?: number; height?: number; location?: string };
}> => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const { positional, options: cmdOptions } = parseCliArgs(args);
  const path = positional[0];
  const jsonMode = options?.json || hasJsonFlag(cmdOptions);

  if (!path) {
    const msg = 'file info: missing file operand';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  const target = resolvePath(currentUrl, path, baseUrl);
  if (!target.valid) {
    const msg = `file info: ${target.error}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: target.code, message: msg } };
  }
  const targetUrl = target.url;
  const row = store.getRow(RESOURCES_TABLE, targetUrl) as Record<string, unknown> | undefined;

  if (!row) {
    const msg = `file info: ${path}: No such file`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
  }

  if (row.type === 'Container') {
    const msg = `file info: ${path}: Is a directory`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'NOT_A_FILE', message: msg } };
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

  const result: CommandResult<{
    url: string;
    name: string;
    contentType: string;
    size: number;
    updated?: string;
    title?: string;
    description?: string;
    created?: string;
    modified?: string;
    authorId?: string;
    authorName?: string;
    image?: { width?: number; height?: number; location?: string };
  }> = {
    success: true,
    data: {
      url: targetUrl,
      name,
      contentType: contentType || 'unknown',
      size,
      updated,
      title,
      description,
      created,
      modified,
      authorId,
      authorName,
      ...(isImage ? { image: { width, height, location } } : null),
    },
  };

  if (jsonMode) {
    if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
    return result;
  }

  if (!options?.silent) {
    addOutput(
      <Box flexDirection="column">
        <Text color="cyan" bold>
          {name}
        </Text>
        <Box>
          <Text dimColor>URL:</Text> <Text>{targetUrl}</Text>
        </Box>
        <Box>
          <Text dimColor>Type:</Text> <Text>{contentType || 'unknown'}</Text>
        </Box>
        <Box>
          <Text dimColor>Size:</Text> <Text>{formatSize(size)}</Text>
        </Box>
        {updated && (
          <Box>
            <Text dimColor>Updated:</Text> <Text>{new Date(updated).toLocaleString()}</Text>
          </Box>
        )}
        <Text bold>Metadata</Text>
        <Box>
          <Text dimColor>Title:</Text>{' '}
          <Text>{title || <Text dimColor>(not set)</Text>}</Text>
        </Box>
        <Box>
          <Text dimColor>Description:</Text>{' '}
          <Text>{description || <Text dimColor>(not set)</Text>}</Text>
        </Box>
        <Box>
          <Text dimColor>Author:</Text>{' '}
          {authorName ? (
            <Text>{authorName}</Text>
          ) : authorId ? (
            <Text dimColor>{authorId}</Text>
          ) : (
            <Text dimColor>(not set)</Text>
          )}
        </Box>
        {created && (
          <Box>
            <Text dimColor>Created:</Text> <Text>{new Date(created).toLocaleString()}</Text>
          </Box>
        )}
        {modified && (
          <Box>
            <Text dimColor>Modified:</Text> <Text>{new Date(modified).toLocaleString()}</Text>
          </Box>
        )}
        {isImage && (
          <Box flexDirection="column">
            <Text bold>Image Properties</Text>
            {width && height ? (
              <Box>
                <Text dimColor>Dimensions:</Text> <Text>{width} × {height} px</Text>
              </Box>
            ) : (
              <Box>
                <Text dimColor>Dimensions:</Text> <Text dimColor>(not set)</Text>
              </Box>
            )}
            <Box>
              <Text dimColor>Location:</Text>{' '}
              <Text>{location || <Text dimColor>(not set)</Text>}</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  return result;
};

/**
 * file set-author - Set file author
 */
const setAuthorSubcommand = (
  args: string[],
  context: CliContext,
  options?: { silent?: boolean }
): CommandResult<{ url: string; updated: string[] }> => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const [path, personaQuery] = args;

  if (!path) {
    const msg = 'file set-author: missing file operand';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  if (!personaQuery) {
    const msg = 'file set-author: missing persona operand';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  const target = resolvePath(currentUrl, path, baseUrl);
  if (!target.valid) {
    const msg = `file set-author: ${target.error}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: target.code, message: msg } };
  }
  const targetUrl = target.url;
  const row = store.getRow(RESOURCES_TABLE, targetUrl) as { type?: string } | undefined;

  if (!row) {
    const msg = `file set-author: ${path}: No such file`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
  }

  if (row.type === 'Container') {
    const msg = `file set-author: ${path}: Is a directory`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'NOT_A_FILE', message: msg } };
  }

  const lookup = findPersona(store, personaQuery);
  if (!lookup.found) {
    const msg = `file set-author: persona not found: ${personaQuery}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'ENTITY_NOT_FOUND', message: msg } };
  }
  const personaId = lookup.id;

  // Get persona name for display
  const persona = store.getRow(PERSONAS_TABLE, personaId) as Record<string, unknown> | undefined;
  const personaName = persona?.['http://xmlns.com/foaf/0.1/name'] as string || personaId;

  // Set author
  store.setCell(RESOURCES_TABLE, targetUrl, SCHEMA.author, JSON.stringify({ '@id': personaId }));
  store.setCell(RESOURCES_TABLE, targetUrl, DCTERMS.modified, new Date().toISOString());

  if (!options?.silent) {
    addOutput(<Text color="green">Set author of {path} to {personaName}</Text>, 'success', `Set author of ${path} to ${personaName}`);
  }

  return { success: true, data: { url: targetUrl, updated: [SCHEMA.author, DCTERMS.modified] } };
};

/**
 * file set-title - Set file title
 */
const setTitleSubcommand = (
  args: string[],
  context: CliContext,
  options?: { silent?: boolean }
): CommandResult<{ url: string; updated: string[] }> => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];
  const title = args.slice(1).join(' ');

  if (!path) {
    const msg = 'file set-title: missing file operand';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  if (!title) {
    const msg = 'file set-title: missing title';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  const target = resolvePath(currentUrl, path, baseUrl);
  if (!target.valid) {
    const msg = `file set-title: ${target.error}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: target.code, message: msg } };
  }
  const targetUrl = target.url;
  const row = store.getRow(RESOURCES_TABLE, targetUrl) as { type?: string } | undefined;

  if (!row) {
    const msg = `file set-title: ${path}: No such file`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
  }

  if (row.type === 'Container') {
    const msg = `file set-title: ${path}: Is a directory`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'NOT_A_FILE', message: msg } };
  }

  store.setCell(RESOURCES_TABLE, targetUrl, DCTERMS.title, title);
  store.setCell(RESOURCES_TABLE, targetUrl, DCTERMS.modified, new Date().toISOString());

  if (!options?.silent) addOutput(<Text color="green">Set title of {path} to "{title}"</Text>, 'success', `Set title of ${path}`);
  return { success: true, data: { url: targetUrl, updated: [DCTERMS.title, DCTERMS.modified] } };
};

/**
 * file set-description - Set file description
 */
const setDescriptionSubcommand = (
  args: string[],
  context: CliContext,
  options?: { silent?: boolean }
): CommandResult<{ url: string; updated: string[] }> => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];
  const description = args.slice(1).join(' ');

  if (!path) {
    const msg = 'file set-description: missing file operand';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  if (!description) {
    const msg = 'file set-description: missing description';
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
  }

  const target = resolvePath(currentUrl, path, baseUrl);
  if (!target.valid) {
    const msg = `file set-description: ${target.error}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: target.code, message: msg } };
  }
  const targetUrl = target.url;
  const row = store.getRow(RESOURCES_TABLE, targetUrl) as { type?: string } | undefined;

  if (!row) {
    const msg = `file set-description: ${path}: No such file`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
  }

  if (row.type === 'Container') {
    const msg = `file set-description: ${path}: Is a directory`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'NOT_A_FILE', message: msg } };
  }

  store.setCell(RESOURCES_TABLE, targetUrl, DCTERMS.description, description);
  store.setCell(RESOURCES_TABLE, targetUrl, DCTERMS.modified, new Date().toISOString());

  if (!options?.silent) addOutput(<Text color="green">Set description of {path}</Text>, 'success', `Set description of ${path}`);
  return { success: true, data: { url: targetUrl, updated: [DCTERMS.description, DCTERMS.modified] } };
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
  supportsJson: true,
  execute: (args, context, options) => {
    const subcommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    if (!subcommand || subcommand === 'help') {
      context.addOutput(<Text>{fileCommand.usage}</Text>);
      return { success: true };
    }

    switch (subcommand) {
      case 'info':
        return infoSubcommand(subArgs, context, options);
      case 'set-author':
        return setAuthorSubcommand(subArgs, context, options);
      case 'set-title':
        return setTitleSubcommand(subArgs, context, options);
      case 'set-description':
        return setDescriptionSubcommand(subArgs, context, options);
      default:
        context.addOutput(
          <Text color="red">file: unknown subcommand: {subcommand}. Type "file help" for usage.</Text>,
          'error'
        );
        return { success: false, error: { code: 'UNKNOWN_SUBCOMMAND', message: `file: unknown subcommand: ${subcommand}` } };
    }
  },
};
