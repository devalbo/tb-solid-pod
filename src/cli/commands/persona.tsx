import React from 'react';
import type { Command } from '../types';
import { parseCliArgs, getOptionString, getOptionBoolean } from '../parse-args';
import { FOAF, VCARD, LDP } from '@inrupt/vocab-common-rdf';
import { SOLID, WS } from '@inrupt/vocab-solid-common';
import { createPersona, type PersonaInput } from '../../schemas/persona';

const TABLE_NAME = 'personas';
const DEFAULT_PERSONA_KEY = 'defaultPersonaId';

/**
 * Get the display name from a persona record
 */
const getPersonaName = (record: Record<string, unknown>): string => {
  return (record[FOAF.name] as string) || '(unnamed)';
};

/**
 * Get the persona ID from the record
 */
const getPersonaId = (record: Record<string, unknown>): string => {
  return (record['@id'] as string) || '';
};

/**
 * persona - Main persona command with subcommands
 */
export const personaCommand: Command = {
  name: 'persona',
  description: 'Manage identity personas (list, create, show, edit, delete, set-default)',
  usage: 'persona <subcommand> [args]',
  execute: (args, context) => {
    const { addOutput } = context;
    const subcommand = args[0];

    if (!subcommand) {
      addOutput(
        <div>
          <div style={{ marginBottom: 8 }}>Usage: persona &lt;subcommand&gt;</div>
          <div style={{ color: '#888' }}>
            <div>Subcommands:</div>
            <div style={{ marginLeft: 16 }}>list                  - List all personas</div>
            <div style={{ marginLeft: 16 }}>create &lt;name&gt;        - Create a new persona</div>
            <div style={{ marginLeft: 16 }}>show &lt;id&gt; [--full]   - Show persona (--full = WebID document)</div>
            <div style={{ marginLeft: 16 }}>edit &lt;id&gt; [options]  - Edit a persona</div>
            <div style={{ marginLeft: 16 }}>delete &lt;id&gt;          - Delete a persona</div>
            <div style={{ marginLeft: 16 }}>set-default &lt;id&gt;     - Set default persona</div>
            <div style={{ marginLeft: 16 }}>set-inbox &lt;id&gt; &lt;url&gt;     - Set LDP inbox URL</div>
            <div style={{ marginLeft: 16 }}>set-typeindex &lt;id&gt; &lt;url&gt; [--private] - Set type index link</div>
          </div>
        </div>
      );
      return;
    }

    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
        return personaListExecute(subArgs, context);
      case 'create':
        return personaCreateExecute(subArgs, context);
      case 'show':
        return personaShowExecute(subArgs, context);
      case 'edit':
        return personaEditExecute(subArgs, context);
      case 'delete':
        return personaDeleteExecute(subArgs, context);
      case 'set-default':
        return personaSetDefaultExecute(subArgs, context);
      case 'set-inbox':
        return personaSetInboxExecute(subArgs, context);
      case 'set-typeindex':
        return personaSetTypeIndexExecute(subArgs, context);
      default:
        addOutput(
          <span style={{ color: '#ff6b6b' }}>
            Unknown subcommand: {subcommand}. Use "persona" for help.
          </span>,
          'error'
        );
    }
  },
};

/**
 * persona list - List all personas
 */
const personaListExecute: Command['execute'] = (_args, context) => {
  const { store, addOutput } = context;

  // Ensure personas table exists
  const personas = store.getTable(TABLE_NAME) || {};
  const personaIds = Object.keys(personas);

  if (personaIds.length === 0) {
    addOutput(
      <span style={{ color: '#888' }}>
        No personas found. Use "persona create &lt;name&gt;" to create one.
      </span>
    );
    return;
  }

  // Get default persona
  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>Personas ({personaIds.length}):</div>
      {personaIds.map((id) => {
        const record = personas[id] as Record<string, unknown>;
        const name = getPersonaName(record);
        const isDefault = id === defaultId;
        const nickname = record[FOAF.nick] as string | undefined;
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            <span style={{ color: isDefault ? '#f9ca24' : '#fff' }}>
              {isDefault ? '★ ' : '  '}
              {name}
            </span>
            {nickname && <span style={{ color: '#888', marginLeft: 8 }}>@{nickname}</span>}
            <span style={{ color: '#666', marginLeft: 8, fontSize: '0.9em' }}>
              [{id.split('/').pop()?.replace('#me', '')}]
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * persona create <name> - Create a new persona
 */
const personaCreateExecute: Command['execute'] = (args, context) => {
  const { store, baseUrl, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const name = positional[0];
  if (!name) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona create &lt;name&gt; [--nickname=...] [--email=...] [--bio=...]</span>,
      'error'
    );
    return;
  }

  // Build input from args and options
  const input: PersonaInput = {
    name,
    nickname: getOptionString(options, 'nickname') || getOptionString(options, 'nick'),
    givenName: getOptionString(options, 'given-name') || getOptionString(options, 'firstName'),
    familyName: getOptionString(options, 'family-name') || getOptionString(options, 'lastName'),
    email: getOptionString(options, 'email'),
    phone: getOptionString(options, 'phone'),
    bio: getOptionString(options, 'bio'),
    homepage: getOptionString(options, 'homepage'),
    image: getOptionString(options, 'image') || getOptionString(options, 'avatar'),
  };

  // Create the persona using the factory function
  const persona = createPersona(input, baseUrl);
  const id = persona['@id'];

  // Store the persona - flatten the JSON-LD for TinyBase
  store.setRow(TABLE_NAME, id, persona as Record<string, unknown>);

  // If this is the first persona, make it default
  const personas = store.getTable(TABLE_NAME) || {};
  if (Object.keys(personas).length === 1) {
    store.setValue(DEFAULT_PERSONA_KEY, id);
  }

  addOutput(
    <div>
      <div style={{ color: '#2ecc71' }}>Created persona: {name}</div>
      <div style={{ color: '#888', fontSize: '0.9em' }}>ID: {id}</div>
    </div>,
    'success'
  );
};

/**
 * persona show <id> [--full] - Show persona details or full WebID document
 */
const personaShowExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);
  const idArg = positional[0];
  const full = getOptionBoolean(options, 'full');

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona show &lt;id or partial-id&gt; [--full]</span>,
      'error'
    );
    return;
  }

  // Find persona by ID or partial match
  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const record = personas[personaId] as Record<string, unknown>;
  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
  const isDefault = personaId === defaultId;

  if (full) {
    addOutput(
      <pre style={{ margin: 0, fontSize: '0.85em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(record, null, 2)}
      </pre>
    );
    return;
  }

  addOutput(
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>{getPersonaName(record)}</span>
        {isDefault && <span style={{ color: '#f9ca24', marginLeft: 8 }}>★ default</span>}
      </div>
      <PersonaDetails record={record} />
      <div style={{ marginTop: 8, color: '#666', fontSize: '0.85em' }}>
        ID: {personaId}
      </div>
    </div>
  );
};

/**
 * Helper to get @id from a NodeRef value
 */
const getIdFromRef = (value: unknown): string | null => {
  if (value && typeof value === 'object' && '@id' in value) {
    return (value as { '@id': string })['@id'];
  }
  return null;
};

/**
 * Helper component to display persona details
 */
const PersonaDetails: React.FC<{ record: Record<string, unknown> }> = ({ record }) => {
  const fields = [
    { label: 'Nickname', key: FOAF.nick },
    { label: 'Given Name', key: FOAF.givenName },
    { label: 'Family Name', key: FOAF.familyName },
    { label: 'Email', key: VCARD.hasEmail },
    { label: 'Phone', key: VCARD.hasTelephone },
    { label: 'Bio', key: VCARD.note },
    { label: 'Homepage', key: FOAF.homepage },
    { label: 'Image', key: FOAF.img },
    { label: 'OIDC Issuer', key: SOLID.oidcIssuer, ref: true },
    { label: 'Inbox', key: LDP.inbox, ref: true },
    { label: 'Preferences File', key: WS.preferencesFile, ref: true },
    { label: 'Public Type Index', key: SOLID.publicTypeIndex, ref: true },
    { label: 'Private Type Index', key: SOLID.privateTypeIndex, ref: true },
  ];

  return (
    <div style={{ fontSize: '0.9em' }}>
      {fields.map(({ label, key, ref }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = ref
          ? getIdFromRef(value) ?? JSON.stringify(value)
          : typeof value === 'string'
            ? value.replace(/^mailto:/, '').replace(/^tel:/, '')
            : JSON.stringify(value);
        return (
          <div key={String(key)} style={{ marginBottom: 2 }}>
            <span style={{ color: '#888' }}>{label}:</span>{' '}
            <span style={{ color: '#f5f5f5' }}>{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * persona edit <id> - Edit a persona
 */
const personaEditExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const idArg = positional[0];
  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: persona edit &lt;id&gt; [--name=...] [--nickname=...] [--email=...] [--bio=...]
      </span>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>,
      'error'
    );
    return;
  }

  // Update fields based on options
  const updates: Record<string, unknown> = {};

  const optionMappings: Array<{ option: string; key: string; transform?: (v: string) => unknown }> = [
    { option: 'name', key: FOAF.name },
    { option: 'nickname', key: FOAF.nick },
    { option: 'nick', key: FOAF.nick },
    { option: 'given-name', key: FOAF.givenName },
    { option: 'family-name', key: FOAF.familyName },
    { option: 'email', key: VCARD.hasEmail, transform: (v) => v.startsWith('mailto:') ? v : `mailto:${v}` },
    { option: 'phone', key: VCARD.hasTelephone, transform: (v) => v.startsWith('tel:') ? v : `tel:${v.replace(/\s/g, '')}` },
    { option: 'bio', key: VCARD.note },
    { option: 'homepage', key: FOAF.homepage },
    { option: 'image', key: FOAF.img },
    { option: 'avatar', key: FOAF.img },
    { option: 'oidc-issuer', key: SOLID.oidcIssuer, transform: (v) => ({ '@id': v }) },
    { option: 'inbox', key: LDP.inbox, transform: (v) => ({ '@id': v }) },
    { option: 'preferences-file', key: WS.preferencesFile, transform: (v) => ({ '@id': v }) },
    { option: 'public-type-index', key: SOLID.publicTypeIndex, transform: (v) => ({ '@id': v }) },
    { option: 'private-type-index', key: SOLID.privateTypeIndex, transform: (v) => ({ '@id': v }) },
  ];

  for (const { option, key, transform } of optionMappings) {
    const value = getOptionString(options, option);
    if (value !== undefined) {
      updates[key] = transform ? transform(value) : value;
    }
  }

  if (Object.keys(updates).length === 0) {
    addOutput(
      <span style={{ color: '#f9ca24' }}>
        No changes specified. Use options like --name="New Name" --email="new@email.com"
      </span>
    );
    return;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    store.setCell(TABLE_NAME, personaId, key, value as string);
  }

  addOutput(
    <div style={{ color: '#2ecc71' }}>
      Updated persona: {getPersonaName(store.getRow(TABLE_NAME, personaId) as Record<string, unknown>)}
    </div>,
    'success'
  );
};

/**
 * persona delete <id> - Delete a persona
 */
const personaDeleteExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona delete &lt;id or partial-id&gt;</span>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const name = getPersonaName(personas[personaId] as Record<string, unknown>);

  // Remove from store
  store.delRow(TABLE_NAME, personaId);

  // If this was the default, clear the default
  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
  if (defaultId === personaId) {
    store.delValue(DEFAULT_PERSONA_KEY);
    // Set next available persona as default
    const remaining = store.getTable(TABLE_NAME) || {};
    const remainingIds = Object.keys(remaining);
    if (remainingIds.length > 0) {
      store.setValue(DEFAULT_PERSONA_KEY, remainingIds[0]);
    }
  }

  addOutput(
    <span style={{ color: '#2ecc71' }}>Deleted persona: {name}</span>,
    'success'
  );
};

/**
 * persona set-default <id> - Set the default persona
 */
const personaSetDefaultExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona set-default &lt;id or partial-id&gt;</span>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const name = getPersonaName(personas[personaId] as Record<string, unknown>);

  // Set as default
  store.setValue(DEFAULT_PERSONA_KEY, personaId);

  addOutput(
    <span style={{ color: '#2ecc71' }}>Set default persona: {name}</span>,
    'success'
  );
};

/**
 * persona set-inbox <id> <url> - Set LDP inbox URL
 */
const personaSetInboxExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];
  const urlArg = args[1];

  if (!idArg || !urlArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona set-inbox &lt;id&gt; &lt;url&gt;</span>,
      'error'
    );
    return;
  }

  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(<span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>, 'error');
    return;
  }

  store.setCell(TABLE_NAME, personaId, LDP.inbox, { '@id': urlArg });
  addOutput(
    <span style={{ color: '#2ecc71' }}>Set inbox for {getPersonaName(store.getRow(TABLE_NAME, personaId) as Record<string, unknown>)}: {urlArg}</span>,
    'success'
  );
};

/**
 * persona set-typeindex <id> <url> [--private] - Set type index link
 */
const personaSetTypeIndexExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);
  const idArg = positional[0];
  const urlArg = positional[1];
  const isPrivate = getOptionBoolean(options, 'private');

  if (!idArg || !urlArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: persona set-typeindex &lt;id&gt; &lt;url&gt; [--private]</span>,
      'error'
    );
    return;
  }

  const personas = store.getTable(TABLE_NAME) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(<span style={{ color: '#ff6b6b' }}>Persona not found: {idArg}</span>, 'error');
    return;
  }

  const key = isPrivate ? SOLID.privateTypeIndex : SOLID.publicTypeIndex;
  store.setCell(TABLE_NAME, personaId, key, { '@id': urlArg });
  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Set {isPrivate ? 'private' : 'public'} type index for {getPersonaName(store.getRow(TABLE_NAME, personaId) as Record<string, unknown>)}: {urlArg}
    </span>,
    'success'
  );
};

/**
 * Find persona ID by exact match or partial match
 */
function findPersonaId(
  personas: Record<string, Record<string, unknown>>,
  searchId: string
): string | null {
  // Exact match first
  if (personas[searchId]) {
    return searchId;
  }

  // Try matching by the short ID (UUID part)
  for (const id of Object.keys(personas)) {
    const shortId = id.split('/').pop()?.replace('#me', '') || '';
    if (shortId === searchId || shortId.startsWith(searchId)) {
      return id;
    }
  }

  // Try matching by name (case insensitive)
  const searchLower = searchId.toLowerCase();
  for (const [id, record] of Object.entries(personas)) {
    const name = getPersonaName(record).toLowerCase();
    if (name === searchLower || name.includes(searchLower)) {
      return id;
    }
  }

  return null;
}
