import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../types';
import { parseCliArgs, getOptionString } from '../parse-args';
import { VCARD } from '@inrupt/vocab-common-rdf';
import { SOLID } from '@inrupt/vocab-solid-common';
import { createContact, type ContactInput, type Contact } from '../../schemas/contact';
import { getContact, setContact } from '../../utils/storeAccessors';
import { STORE_TABLES } from '../../storeLayout';

/** Get display name from a contact (validated row or record). */
const getContactName = (record: Contact | Record<string, unknown>): string => {
  return (record[VCARD.fn] as string) || '(unnamed)';
};

/**
 * Check if contact is an agent/bot
 */
const isAgent = (record: Record<string, unknown>): boolean => {
  const types = record['@type'];
  if (Array.isArray(types)) {
    return types.includes('https://schema.org/SoftwareApplication');
  }
  return types === 'https://schema.org/SoftwareApplication';
};

/**
 * contact - Main contact command with subcommands
 */
export const contactCommand: Command = {
  name: 'contact',
  description: 'Manage address book contacts (list, add, show, edit, delete, search, link)',
  usage: 'contact <subcommand> [args]',
  execute: (args, context) => {
    const { addOutput } = context;
    const subcommand = args[0];

    if (!subcommand) {
      addOutput(
        <Box flexDirection="column">
          <Text>Usage: contact &lt;subcommand&gt;</Text>
          <Text dimColor>Subcommands: list, add, show, edit, delete, search, link</Text>
        </Box>,
        undefined,
        'Usage: contact\nSubcommands: list, add, show, edit, delete, search, link'
      );
      return;
    }

    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
        return contactListExecute(subArgs, context);
      case 'add':
        return contactAddExecute(subArgs, context);
      case 'show':
        return contactShowExecute(subArgs, context);
      case 'edit':
        return contactEditExecute(subArgs, context);
      case 'delete':
        return contactDeleteExecute(subArgs, context);
      case 'search':
        return contactSearchExecute(subArgs, context);
      case 'link':
        return contactLinkExecute(subArgs, context);
      default:
        addOutput(
          <Text color="red">Unknown subcommand: {subcommand}. Use "contact" for help.</Text>,
          'error'
        );
    }
  },
};

/**
 * contact list - List all contacts
 */
const contactListExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { options } = parseCliArgs(args);

  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const contactIds = Object.keys(contacts);

  if (contactIds.length === 0) {
    addOutput(
      <Text dimColor>No contacts found. Use "contact add &lt;name&gt;" to add one.</Text>,
      undefined,
      'No contacts found. Use "contact add <name>" to add one.'
    );
    return;
  }

  // Filter by type if requested
  const showAgents = options['agents'] || options['a'];
  const showPeople = options['people'] || options['p'];

  const filtered = contactIds.filter((id) => {
    const record = contacts[id] as Record<string, unknown>;
    const contactIsAgent = isAgent(record);
    if (showAgents && !contactIsAgent) return false;
    if (showPeople && contactIsAgent) return false;
    return true;
  });

  const nameLines = filtered.map((id) => {
    const record = contacts[id] as Record<string, unknown>;
    const name = getContactName(record);
    const contactIsAgent = isAgent(record);
    const prefix = contactIsAgent ? '🤖 ' : '👤 ';
    return prefix + name;
  });
  const plainText = `Contacts (${filtered.length}):\n${nameLines.join('\n')}`;

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan">Contacts ({filtered.length}):</Text>
      {filtered.map((id) => {
        const record = contacts[id] as Record<string, unknown>;
        const name = getContactName(record);
        const contactIsAgent = isAgent(record);
        const email = record[VCARD.hasEmail] as string | undefined;
        const org = record[VCARD.hasOrganizationName] as string | undefined;
        return (
          <Box key={id}>
            <Text color={contactIsAgent ? 'magenta' : undefined}>
              {contactIsAgent ? '🤖 ' : '👤 '}
              {name}
            </Text>
            {org && <Text dimColor> ({org})</Text>}
            {email && <Text dimColor> {email.replace('mailto:', '')}</Text>}
          </Box>
        );
      })}
    </Box>,
    undefined,
    plainText
  );
};

/**
 * contact add <name> - Add a new contact
 */
const contactAddExecute: Command['execute'] = (args, context) => {
  const { store, baseUrl, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const name = positional[0];
  if (!name) {
    addOutput(
      <Text color="red">
        Usage: contact add &lt;name&gt; [--email=...] [--phone=...] [--org=...] [--agent]
      </Text>,
      'error'
    );
    return;
  }

  // Build input from args and options
  const input: ContactInput = {
    name,
    nickname: getOptionString(options, 'nickname') || getOptionString(options, 'nick'),
    email: getOptionString(options, 'email'),
    phone: getOptionString(options, 'phone'),
    url: getOptionString(options, 'url'),
    photo: getOptionString(options, 'photo'),
    notes: getOptionString(options, 'notes'),
    organization: getOptionString(options, 'org') || getOptionString(options, 'organization'),
    role: getOptionString(options, 'role'),
    webId: getOptionString(options, 'webid'),
    isAgent: !!options['agent'],
    agentCategory: getOptionString(options, 'category'),
  };

  // Create the contact using the factory function
  const contact = createContact(input, baseUrl);
  const id = typeof contact['@id'] === 'string' ? contact['@id'] : String((contact['@id'] as { '@id'?: string })?.['@id'] ?? '');

  setContact(store, contact);

  addOutput(
    <Box flexDirection="column">
      <Text color="green">Added contact: {name}</Text>
      <Text dimColor>ID: {id}</Text>
    </Box>,
    'success',
    `Added contact: ${name}`
  );
};

/**
 * contact show <id> - Show contact details
 */
const contactShowExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <Text color="red">Usage: contact show &lt;id or name&gt;</Text>,
      'error'
    );
    return;
  }

  // Find contact by ID or partial match
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <Text color="red">Contact not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const record = contacts[contactId] as Record<string, unknown>;
  const contactIsAgent = isAgent(record);

  addOutput(
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          {contactIsAgent ? '🤖 ' : '👤 '}
          {getContactName(record)}
        </Text>
        {contactIsAgent && (
          <Text color="magenta"> (Agent)</Text>
        )}
      </Box>
      <ContactDetails record={record} />
      <Box marginTop={1}>
        <Text dimColor>ID: {contactId}</Text>
      </Box>
    </Box>
  );
};

/**
 * Helper component to display contact details
 */
const ContactDetails: React.FC<{ record: Record<string, unknown> }> = ({ record }) => {
  const fields = [
    { label: 'Nickname', key: VCARD.nickname },
    { label: 'Email', key: VCARD.hasEmail },
    { label: 'Phone', key: VCARD.hasTelephone },
    { label: 'URL', key: VCARD.hasURL },
    { label: 'Organization', key: VCARD.hasOrganizationName },
    { label: 'Role', key: VCARD.hasRole },
    { label: 'Notes', key: VCARD.hasNote },
    { label: 'WebID', key: SOLID.webid },
    { label: 'Photo', key: VCARD.hasPhoto },
  ];

  return (
    <Box flexDirection="column">
      {fields.map(({ label, key }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = typeof value === 'string'
          ? value.replace(/^mailto:/, '').replace(/^tel:/, '')
          : JSON.stringify(value);
        return (
          <Box key={key} marginBottom={1}>
            <Text dimColor>{label}: </Text>
            <Text>{displayValue}</Text>
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * contact edit <id> - Edit a contact
 */
const contactEditExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const idArg = positional[0];
  if (!idArg) {
    addOutput(
      <Text color="red">
        Usage: contact edit &lt;id&gt; [--name=...] [--email=...] [--phone=...] [--org=...]
      </Text>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <Text color="red">Contact not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  // Update fields based on options
  const updates: Record<string, unknown> = {};

  const optionMappings: Array<{ option: string; key: string; transform?: (v: string) => string }> = [
    { option: 'name', key: VCARD.fn },
    { option: 'nickname', key: VCARD.nickname },
    { option: 'nick', key: VCARD.nickname },
    { option: 'email', key: VCARD.hasEmail, transform: (v) => v.startsWith('mailto:') ? v : `mailto:${v}` },
    { option: 'phone', key: VCARD.hasTelephone, transform: (v) => v.startsWith('tel:') ? v : `tel:${v.replace(/\s/g, '')}` },
    { option: 'url', key: VCARD.hasURL },
    { option: 'photo', key: VCARD.hasPhoto },
    { option: 'notes', key: VCARD.hasNote },
    { option: 'org', key: VCARD.hasOrganizationName },
    { option: 'organization', key: VCARD.hasOrganizationName },
    { option: 'role', key: VCARD.hasRole },
    { option: 'webid', key: SOLID.webid },
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
    store.setCell(STORE_TABLES.CONTACTS, contactId, key, value as string);
  }

  const updated = getContact(store, contactId);
  addOutput(
    <Text color="green">Updated contact: {getContactName(updated ?? {})}</Text>,
    'success'
  );
};

/**
 * contact delete <id> - Delete a contact
 */
const contactDeleteExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <Text color="red">Usage: contact delete &lt;id or name&gt;</Text>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <Text color="red">Contact not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const name = getContactName(contacts[contactId] as Record<string, unknown>);

  // Remove from store
  store.delRow(STORE_TABLES.CONTACTS, contactId);

  addOutput(
    <Text color="green">Deleted contact: {name}</Text>,
    'success'
  );
};

/**
 * contact search <query> - Search contacts by name/email
 */
const contactSearchExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const query = args.join(' ').toLowerCase();

  if (!query) {
    addOutput(
      <Text color="red">Usage: contact search &lt;query&gt;</Text>,
      'error'
    );
    return;
  }

  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const results: Array<{ id: string; record: Record<string, unknown> }> = [];

  for (const [id, record] of Object.entries(contacts)) {
    const r = record as Record<string, unknown>;
    const name = (r[VCARD.fn] as string || '').toLowerCase();
    const email = (r[VCARD.hasEmail] as string || '').toLowerCase();
    const nickname = (r[VCARD.nickname] as string || '').toLowerCase();
    const org = (r[VCARD.hasOrganizationName] as string || '').toLowerCase();
    const notes = (r[VCARD.hasNote] as string || '').toLowerCase();

    if (
      name.includes(query) ||
      email.includes(query) ||
      nickname.includes(query) ||
      org.includes(query) ||
      notes.includes(query)
    ) {
      results.push({ id, record: r });
    }
  }

  if (results.length === 0) {
    addOutput(
      <Text dimColor>No contacts matching "{query}"</Text>
    );
    return;
  }

  addOutput(
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan">Found {results.length} contact{results.length !== 1 ? 's' : ''}:</Text>
      </Box>
      {results.map(({ id, record }) => {
        const name = getContactName(record);
        const contactIsAgent = isAgent(record);
        const email = record[VCARD.hasEmail] as string | undefined;
        return (
          <Box key={id} marginBottom={1}>
            <Text color={contactIsAgent ? 'magenta' : undefined}>
              {contactIsAgent ? '🤖 ' : '👤 '}
              {name}
            </Text>
            {email && (
              <Text dimColor> {email.replace('mailto:', '')}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * contact link <contact> <persona> - Link contact to a persona
 */
const contactLinkExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const [contactArg, personaArg] = args;

  if (!contactArg || !personaArg) {
    addOutput(
      <Text color="red">
        Usage: contact link &lt;contact-id&gt; &lt;persona-id&gt;
      </Text>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};
  const contactId = findContactId(contacts, contactArg);

  if (!contactId) {
    addOutput(
      <Text color="red">Contact not found: {contactArg}</Text>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable(STORE_TABLES.PERSONAS) || {};
  const personaId = findPersonaId(personas, personaArg);

  if (!personaId) {
    addOutput(
      <Text color="red">Persona not found: {personaArg}</Text>,
      'error'
    );
    return;
  }

  // Link contact to persona using vcard:hasRelated
  const existing = store.getCell(STORE_TABLES.CONTACTS, contactId, VCARD.hasRelated);
  let related: unknown[];

  if (existing) {
    if (Array.isArray(existing)) {
      related = [...existing];
    } else {
      related = [existing];
    }
    // Check if already linked
    const alreadyLinked = related.some((r) => {
      if (typeof r === 'object' && r !== null && '@id' in r) {
        return (r as { '@id': string })['@id'] === personaId;
      }
      return false;
    });
    if (alreadyLinked) {
      addOutput(
        <Text color="yellow">Contact is already linked to this persona</Text>
      );
      return;
    }
    related.push({ '@id': personaId });
  } else {
    related = [{ '@id': personaId }];
  }

  // Store as JSON string since TinyBase doesn't support nested objects directly
  store.setCell(STORE_TABLES.CONTACTS, contactId, VCARD.hasRelated, JSON.stringify(related));

  const contactName = getContactName(contacts[contactId] as Record<string, unknown>);
  const personaName = (personas[personaId] as Record<string, unknown>)['http://xmlns.com/foaf/0.1/name'] as string || 'persona';

  addOutput(
    <Text color="green">
      Linked {contactName} to persona "{personaName}"
    </Text>,
    'success'
  );
};

/**
 * Find contact ID by exact match or partial match
 */
function findContactId(
  contacts: Record<string, Record<string, unknown>>,
  searchId: string
): string | null {
  // Exact match first
  if (contacts[searchId]) {
    return searchId;
  }

  // Try matching by the short ID (UUID part)
  for (const id of Object.keys(contacts)) {
    const shortId = id.split('#').pop() || '';
    if (shortId === searchId || shortId.startsWith(searchId)) {
      return id;
    }
  }

  // Try matching by name (case insensitive)
  const searchLower = searchId.toLowerCase();
  for (const [id, record] of Object.entries(contacts)) {
    const name = getContactName(record).toLowerCase();
    if (name === searchLower || name.includes(searchLower)) {
      return id;
    }
  }

  return null;
}

/**
 * Find persona ID by exact match or partial match (reused from persona command)
 */
function findPersonaId(
  personas: Record<string, Record<string, unknown>>,
  searchId: string
): string | null {
  if (personas[searchId]) {
    return searchId;
  }

  for (const id of Object.keys(personas)) {
    const shortId = id.split('/').pop()?.replace('#me', '') || '';
    if (shortId === searchId || shortId.startsWith(searchId)) {
      return id;
    }
  }

  const searchLower = searchId.toLowerCase();
  for (const [id, record] of Object.entries(personas)) {
    const name = ((record['http://xmlns.com/foaf/0.1/name'] as string) || '').toLowerCase();
    if (name === searchLower || name.includes(searchLower)) {
      return id;
    }
  }

  return null;
}
