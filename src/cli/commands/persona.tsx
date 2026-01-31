import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../types';
import { parseCliArgs, getOptionString, getOptionBoolean } from '../parse-args';
import { FOAF, VCARD, LDP } from '@inrupt/vocab-common-rdf';
import { SOLID, WS } from '@inrupt/vocab-solid-common';
import { createPersona, type PersonaInput } from '../../schemas/persona';
import { getPersona, setPersona, type Persona } from '../../utils/storeAccessors';
import { STORE_TABLES } from '../../storeLayout';

const DEFAULT_PERSONA_KEY = 'defaultPersonaId';

/** Get display name from a persona (validated row or record). */
const getPersonaName = (record: Persona | Record<string, unknown>): string => {
  return (record[FOAF.name] as string) || '(unnamed)';
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
        <Box flexDirection="column">
          <Text>Usage: persona &lt;subcommand&gt;</Text>
          <Text dimColor>Subcommands: list, create, show, edit, delete, set-default, set-inbox, set-typeindex</Text>
        </Box>,
        undefined,
        'Usage: persona\nSubcommands: list, create, show, edit, delete, set-default, set-inbox, set-typeindex'
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
          <Text color="red">Unknown subcommand: {subcommand}. Use "persona" for help.</Text>,
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
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaIds = Object.keys(personas);

  if (personaIds.length === 0) {
    addOutput(
      <Text dimColor>No personas found. Use "persona create &lt;name&gt;" to create one.</Text>,
      undefined,
      'No personas found. Use "persona create <name>" to create one.'
    );
    return;
  }

  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
  const nameLines = personaIds.map((id) => {
    const record = personas[id] as Record<string, unknown>;
    const name = getPersonaName(record);
    return (id === defaultId ? '★ ' : '  ') + name;
  });
  const plainText = `Personas (${personaIds.length}):\n${nameLines.join('\n')}`;

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan">Personas ({personaIds.length}):</Text>
      {personaIds.map((id) => {
        const record = personas[id] as Record<string, unknown>;
        const name = getPersonaName(record);
        const isDefault = id === defaultId;
        const nickname = record[FOAF.nick] as string | undefined;
        return (
          <Box key={id}>
            <Text color={isDefault ? 'yellow' : undefined}>
              {isDefault ? '★ ' : '  '}
              {name}
            </Text>
            {nickname && <Text dimColor> @{nickname}</Text>}
            <Text dimColor> [{id.split('/').pop()?.replace('#me', '')}]</Text>
          </Box>
        );
      })}
    </Box>,
    undefined,
    plainText
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
      <Text color="red">Usage: persona create &lt;name&gt; [--nickname=...] [--email=...] [--bio=...]</Text>,
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
  const rawId = persona['@id'];
  const id = typeof rawId === 'string' ? rawId : String((rawId as { '@id'?: string })?.['@id'] ?? '');

  setPersona(store, persona);

  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  if (Object.keys(personas).length === 1) {
    store.setValue(DEFAULT_PERSONA_KEY, id);
  }

  addOutput(
    <Box flexDirection="column">
      <Text color="green">Created persona: {name}</Text>
      <Text dimColor>ID: {id}</Text>
    </Box>,
    'success',
    `Created persona: ${name}`
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
      <Text color="red">Usage: persona show &lt;id or partial-id&gt; [--full]</Text>,
      'error'
    );
    return;
  }

  // Find persona by ID or partial match
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <Text color="red">Persona not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const record = personas[personaId] as Record<string, unknown>;
  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
  const isDefault = personaId === defaultId;

  if (full) {
    addOutput(<Text>{JSON.stringify(record, null, 2)}</Text>);
    return;
  }

  addOutput(
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>{getPersonaName(record)}</Text>
        {isDefault && <Text color="yellow"> ★ default</Text>}
      </Box>
      <PersonaDetails record={record} />
      <Text dimColor>ID: {personaId}</Text>
    </Box>
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
    <Box flexDirection="column">
      {fields.map(({ label, key, ref }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = ref
          ? getIdFromRef(value) ?? JSON.stringify(value)
          : typeof value === 'string'
            ? value.replace(/^mailto:/, '').replace(/^tel:/, '')
            : JSON.stringify(value);
        return (
          <Box key={String(key)}>
            <Text dimColor>{label}:</Text>
            <Text> {displayValue}</Text>
          </Box>
        );
      })}
    </Box>
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
      <Text color="red">
        Usage: persona edit &lt;id&gt; [--name=...] [--nickname=...] [--email=...] [--bio=...]
      </Text>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <Text color="red">Persona not found: {idArg}</Text>,
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
      <Text color="yellow">
        No changes specified. Use options like --name="New Name" --email="new@email.com"
      </Text>
    );
    return;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    store.setCell(STORE_TABLES.PERSONAS, personaId, key, value as string);
  }

  const updated = getPersona(store, personaId);
  addOutput(
    <Box flexDirection="column">
      <Text color="green">Updated persona: {updated ? getPersonaName(updated) : '(invalid or missing)'}</Text>
    </Box>,
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
      <Text color="red">Usage: persona delete &lt;id or partial-id&gt;</Text>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <Text color="red">Persona not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const name = getPersonaName(personas[personaId] as Record<string, unknown>);

  // Remove from store
  store.delRow(STORE_TABLES.PERSONAS, personaId);

  // If this was the default, clear the default
  const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
  if (defaultId === personaId) {
    store.delValue(DEFAULT_PERSONA_KEY);
    // Set next available persona as default
    const remaining = store.getTable(STORE_TABLES.PERSONAS) || {};
    const remainingIds = Object.keys(remaining);
    if (remainingIds.length > 0) {
      store.setValue(DEFAULT_PERSONA_KEY, remainingIds[0]);
    }
  }

  addOutput(
    <Text color="green">Deleted persona: {name}</Text>,
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
      <Text color="red">Usage: persona set-default &lt;id or partial-id&gt;</Text>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(
      <Text color="red">Persona not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const name = getPersonaName(personas[personaId] as Record<string, unknown>);

  // Set as default
  store.setValue(DEFAULT_PERSONA_KEY, personaId);

  addOutput(
    <Text color="green">Set default persona: {name}</Text>,
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
      <Text color="red">Usage: persona set-inbox &lt;id&gt; &lt;url&gt;</Text>,
      'error'
    );
    return;
  }

  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(<Text color="red">Persona not found: {idArg}</Text>, 'error');
    return;
  }

  store.setCell(STORE_TABLES.PERSONAS, personaId, LDP.inbox, { '@id': urlArg } as unknown as Parameters<typeof store.setCell>[3]);
  const persona = getPersona(store, personaId);
  addOutput(
    <Text color="green">Set inbox for {getPersonaName(persona ?? {})}: {urlArg}</Text>,
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
      <Text color="red">Usage: persona set-typeindex &lt;id&gt; &lt;url&gt; [--private]</Text>,
      'error'
    );
    return;
  }

  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, idArg);

  if (!personaId) {
    addOutput(<Text color="red">Persona not found: {idArg}</Text>, 'error');
    return;
  }

  const key = isPrivate ? SOLID.privateTypeIndex : SOLID.publicTypeIndex;
  store.setCell(STORE_TABLES.PERSONAS, personaId, key, { '@id': urlArg } as unknown as Parameters<typeof store.setCell>[3]);
  const persona = getPersona(store, personaId);
  addOutput(
    <Text color="green">
      Set {isPrivate ? 'private' : 'public'} type index for {getPersonaName(persona ?? {})}: {urlArg}
    </Text>,
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
