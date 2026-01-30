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
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file info: missing file operand</span>,
      'error'
    );
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl) as Record<string, unknown> | undefined;

  if (!row) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file info: {path}: No such file</span>,
      'error'
    );
    return;
  }

  if (row.type === 'Container') {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file info: {path}: Is a directory</span>,
      'error'
    );
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
    <div style={{ fontFamily: 'monospace', lineHeight: 1.6 }}>
      <div style={{ marginBottom: 8, fontWeight: 600, color: '#4ecdc4' }}>
        {name}
      </div>
      <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>URL:</span> {targetUrl}</div>
      <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Type:</span> {contentType || 'unknown'}</div>
      <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Size:</span> {formatSize(size)}</div>
      {updated && (
        <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Updated:</span> {new Date(updated).toLocaleString()}</div>
      )}
      <div style={{ marginTop: 12, marginBottom: 4, fontWeight: 500, color: '#aaa' }}>
        Metadata
      </div>
      <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Title:</span> {title || <span style={{ color: '#666' }}>(not set)</span>}</div>
      <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Description:</span> {description || <span style={{ color: '#666' }}>(not set)</span>}</div>
      <div>
        <span style={{ color: '#888', width: 100, display: 'inline-block' }}>Author:</span>
        {authorName ? (
          <span>{authorName}</span>
        ) : authorId ? (
          <span style={{ color: '#666' }}>{authorId}</span>
        ) : (
          <span style={{ color: '#666' }}>(not set)</span>
        )}
      </div>
      {created && (
        <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Created:</span> {new Date(created).toLocaleString()}</div>
      )}
      {modified && (
        <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Modified:</span> {new Date(modified).toLocaleString()}</div>
      )}
      {isImage && (
        <>
          <div style={{ marginTop: 12, marginBottom: 4, fontWeight: 500, color: '#aaa' }}>
            Image Properties
          </div>
          {(width && height) ? (
            <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Dimensions:</span> {width} × {height} px</div>
          ) : (
            <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Dimensions:</span> <span style={{ color: '#666' }}>(not set)</span></div>
          )}
          <div><span style={{ color: '#888', width: 100, display: 'inline-block' }}>Location:</span> {location || <span style={{ color: '#666' }}>(not set)</span>}</div>
        </>
      )}
    </div>
  );
};

/**
 * file set-author - Set file author
 */
const setAuthorSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const [path, personaQuery] = args;

  if (!path) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-author: missing file operand</span>,
      'error'
    );
    return;
  }

  if (!personaQuery) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-author: missing persona operand</span>,
      'error'
    );
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-author: {path}: No such file</span>,
      'error'
    );
    return;
  }

  if (row.type === 'Container') {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-author: {path}: Is a directory</span>,
      'error'
    );
    return;
  }

  // Find the persona
  const personaId = findPersonaId(store, personaQuery);
  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-author: persona not found: {personaQuery}</span>,
      'error'
    );
    return;
  }

  // Get persona name for display
  const persona = store.getRow(PERSONAS_TABLE, personaId) as Record<string, unknown> | undefined;
  const personaName = persona?.['http://xmlns.com/foaf/0.1/name'] as string || personaId;

  // Set author
  store.setCell('resources', targetUrl, SCHEMA.author, JSON.stringify({ '@id': personaId }));
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Set author of {path} to {personaName}
    </span>,
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
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-title: missing file operand</span>,
      'error'
    );
    return;
  }

  if (!title) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-title: missing title</span>,
      'error'
    );
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-title: {path}: No such file</span>,
      'error'
    );
    return;
  }

  if (row.type === 'Container') {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-title: {path}: Is a directory</span>,
      'error'
    );
    return;
  }

  store.setCell('resources', targetUrl, DCTERMS.title, title);
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Set title of {path} to "{title}"
    </span>,
    'success'
  );
};

/**
 * file set-description - Set file description
 */
const setDescriptionSubcommand = (args: string[], context: CliContext) => {
  const { currentUrl, baseUrl, store, addOutput } = context;
  const path = args[0];
  const description = args.slice(1).join(' ');

  if (!path) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-description: missing file operand</span>,
      'error'
    );
    return;
  }

  if (!description) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-description: missing description</span>,
      'error'
    );
    return;
  }

  const targetUrl = resolvePath(currentUrl, path, baseUrl);
  const row = store.getRow('resources', targetUrl);

  if (!row) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-description: {path}: No such file</span>,
      'error'
    );
    return;
  }

  if (row.type === 'Container') {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>file set-description: {path}: Is a directory</span>,
      'error'
    );
    return;
  }

  store.setCell('resources', targetUrl, DCTERMS.description, description);
  store.setCell('resources', targetUrl, DCTERMS.modified, new Date().toISOString());

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Set description of {path}
    </span>,
    'success'
  );
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
      context.addOutput(
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {fileCommand.usage}
        </pre>
      );
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
          <span style={{ color: '#ff6b6b' }}>
            file: unknown subcommand: {subcommand}. Type "file help" for usage.
          </span>,
          'error'
        );
    }
  },
};
