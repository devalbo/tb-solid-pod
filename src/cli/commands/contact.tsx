import type { Command } from '../types';
import { parseCliArgs, getOptionString } from '../parse-args';
import { VCARD } from '@inrupt/vocab-common-rdf';
import { SOLID } from '@inrupt/vocab-solid-common';
import { createContact, type ContactInput } from '../../schemas/contact';

const TABLE_NAME = 'contacts';

/**
 * Get the display name from a contact record
 */
const getContactName = (record: Record<string, unknown>): string => {
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
        <div>
          <div style={{ marginBottom: 8 }}>Usage: contact &lt;subcommand&gt;</div>
          <div style={{ color: '#888' }}>
            <div>Subcommands:</div>
            <div style={{ marginLeft: 16 }}>list                  - List all contacts</div>
            <div style={{ marginLeft: 16 }}>add &lt;name&gt;           - Add a new contact</div>
            <div style={{ marginLeft: 16 }}>show &lt;id&gt;            - Show contact details</div>
            <div style={{ marginLeft: 16 }}>edit &lt;id&gt; [options]  - Edit a contact</div>
            <div style={{ marginLeft: 16 }}>delete &lt;id&gt;          - Delete a contact</div>
            <div style={{ marginLeft: 16 }}>search &lt;query&gt;       - Search contacts</div>
            <div style={{ marginLeft: 16 }}>link &lt;contact&gt; &lt;persona&gt; - Link contact to persona</div>
          </div>
        </div>
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
          <span style={{ color: '#ff6b6b' }}>
            Unknown subcommand: {subcommand}. Use "contact" for help.
          </span>,
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

  const contacts = store.getTable(TABLE_NAME) || {};
  const contactIds = Object.keys(contacts);

  if (contactIds.length === 0) {
    addOutput(
      <span style={{ color: '#888' }}>
        No contacts found. Use "contact add &lt;name&gt;" to add one.
      </span>
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

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>
        Contacts ({filtered.length}):
      </div>
      {filtered.map((id) => {
        const record = contacts[id] as Record<string, unknown>;
        const name = getContactName(record);
        const contactIsAgent = isAgent(record);
        const email = record[VCARD.hasEmail] as string | undefined;
        const org = record[VCARD.hasOrganizationName] as string | undefined;
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            <span style={{ color: contactIsAgent ? '#9b59b6' : '#fff' }}>
              {contactIsAgent ? '🤖 ' : '👤 '}
              {name}
            </span>
            {org && <span style={{ color: '#888', marginLeft: 8 }}>({org})</span>}
            {email && (
              <span style={{ color: '#666', marginLeft: 8, fontSize: '0.9em' }}>
                {email.replace('mailto:', '')}
              </span>
            )}
          </div>
        );
      })}
    </div>
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
      <span style={{ color: '#ff6b6b' }}>
        Usage: contact add &lt;name&gt; [--email=...] [--phone=...] [--org=...] [--agent]
      </span>,
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

  // Store the contact
  store.setRow(TABLE_NAME, id, contact as import('tinybase').Row);

  addOutput(
    <div>
      <div style={{ color: '#2ecc71' }}>Added contact: {name}</div>
      <div style={{ color: '#888', fontSize: '0.9em' }}>ID: {id}</div>
    </div>,
    'success'
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
      <span style={{ color: '#ff6b6b' }}>Usage: contact show &lt;id or name&gt;</span>,
      'error'
    );
    return;
  }

  // Find contact by ID or partial match
  const contacts = store.getTable(TABLE_NAME) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const record = contacts[contactId] as Record<string, unknown>;
  const contactIsAgent = isAgent(record);

  addOutput(
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>
          {contactIsAgent ? '🤖 ' : '👤 '}
          {getContactName(record)}
        </span>
        {contactIsAgent && (
          <span style={{ color: '#9b59b6', marginLeft: 8, fontSize: '0.85em' }}>
            (Agent)
          </span>
        )}
      </div>
      <ContactDetails record={record} />
      <div style={{ marginTop: 8, color: '#666', fontSize: '0.85em' }}>
        ID: {contactId}
      </div>
    </div>
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
    <div style={{ fontSize: '0.9em' }}>
      {fields.map(({ label, key }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = typeof value === 'string'
          ? value.replace(/^mailto:/, '').replace(/^tel:/, '')
          : JSON.stringify(value);
        return (
          <div key={key} style={{ marginBottom: 2 }}>
            <span style={{ color: '#888' }}>{label}:</span>{' '}
            <span style={{ color: '#f5f5f5' }}>{displayValue}</span>
          </div>
        );
      })}
    </div>
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
      <span style={{ color: '#ff6b6b' }}>
        Usage: contact edit &lt;id&gt; [--name=...] [--email=...] [--phone=...] [--org=...]
      </span>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(TABLE_NAME) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {idArg}</span>,
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
      <span style={{ color: '#f9ca24' }}>
        No changes specified. Use options like --name="New Name" --email="new@email.com"
      </span>
    );
    return;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    store.setCell(TABLE_NAME, contactId, key, value as string);
  }

  addOutput(
    <div style={{ color: '#2ecc71' }}>
      Updated contact: {getContactName(store.getRow(TABLE_NAME, contactId) as Record<string, unknown>)}
    </div>,
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
      <span style={{ color: '#ff6b6b' }}>Usage: contact delete &lt;id or name&gt;</span>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(TABLE_NAME) || {};
  const contactId = findContactId(contacts, idArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const name = getContactName(contacts[contactId] as Record<string, unknown>);

  // Remove from store
  store.delRow(TABLE_NAME, contactId);

  addOutput(
    <span style={{ color: '#2ecc71' }}>Deleted contact: {name}</span>,
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
      <span style={{ color: '#ff6b6b' }}>Usage: contact search &lt;query&gt;</span>,
      'error'
    );
    return;
  }

  const contacts = store.getTable(TABLE_NAME) || {};
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
      <span style={{ color: '#888' }}>No contacts matching "{query}"</span>
    );
    return;
  }

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>
        Found {results.length} contact{results.length !== 1 ? 's' : ''}:
      </div>
      {results.map(({ id, record }) => {
        const name = getContactName(record);
        const contactIsAgent = isAgent(record);
        const email = record[VCARD.hasEmail] as string | undefined;
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            <span style={{ color: contactIsAgent ? '#9b59b6' : '#fff' }}>
              {contactIsAgent ? '🤖 ' : '👤 '}
              {name}
            </span>
            {email && (
              <span style={{ color: '#666', marginLeft: 8, fontSize: '0.9em' }}>
                {email.replace('mailto:', '')}
              </span>
            )}
          </div>
        );
      })}
    </div>
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
      <span style={{ color: '#ff6b6b' }}>
        Usage: contact link &lt;contact-id&gt; &lt;persona-id&gt;
      </span>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable(TABLE_NAME) || {};
  const contactId = findContactId(contacts, contactArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {contactArg}</span>,
      'error'
    );
    return;
  }

  // Find persona
  const personas = store.getTable('personas') || {};
  const personaId = findPersonaId(personas, personaArg);

  if (!personaId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Persona not found: {personaArg}</span>,
      'error'
    );
    return;
  }

  // Link contact to persona using vcard:hasRelated
  const existing = store.getCell(TABLE_NAME, contactId, VCARD.hasRelated);
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
        <span style={{ color: '#f9ca24' }}>Contact is already linked to this persona</span>
      );
      return;
    }
    related.push({ '@id': personaId });
  } else {
    related = [{ '@id': personaId }];
  }

  // Store as JSON string since TinyBase doesn't support nested objects directly
  store.setCell(TABLE_NAME, contactId, VCARD.hasRelated, JSON.stringify(related));

  const contactName = getContactName(contacts[contactId] as Record<string, unknown>);
  const personaName = (personas[personaId] as Record<string, unknown>)['http://xmlns.com/foaf/0.1/name'] as string || 'persona';

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Linked {contactName} to persona "{personaName}"
    </span>,
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
