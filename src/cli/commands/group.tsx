import React from 'react';
import type { Command } from '../types';
import { parseCliArgs, getOptionString } from '../parse-args';
import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';
import { createGroup, ORG, type GroupInput, type GroupType } from '../../schemas/group';

const TABLE_NAME = 'groups';

/**
 * Get the display name from a group record
 */
const getGroupName = (record: Record<string, unknown>): string => {
  return (record[VCARD.fn] as string) || '(unnamed)';
};

/**
 * Get the group type from the record
 */
const getGroupType = (record: Record<string, unknown>): GroupType => {
  const types = record['@type'];
  const typeArray = Array.isArray(types) ? types : [types];
  if (typeArray.includes(ORG.Organization)) return 'organization';
  if (typeArray.includes(ORG.OrganizationalUnit)) return 'team';
  return 'group';
};

/**
 * Get type display label
 */
const getTypeLabel = (type: GroupType): string => {
  switch (type) {
    case 'organization': return 'Organization';
    case 'team': return 'Team';
    case 'group': return 'Group';
  }
};

/**
 * Get type emoji
 */
const getTypeEmoji = (type: GroupType): string => {
  switch (type) {
    case 'organization': return '🏢';
    case 'team': return '👥';
    case 'group': return '👋';
  }
};

/**
 * group - Main group command with subcommands
 */
export const groupCommand: Command = {
  name: 'group',
  description: 'Manage groups, teams, and organizations',
  usage: 'group <subcommand> [args]',
  execute: (args, context) => {
    const { addOutput } = context;
    const subcommand = args[0];

    if (!subcommand) {
      addOutput(
        <div>
          <div style={{ marginBottom: 8 }}>Usage: group &lt;subcommand&gt;</div>
          <div style={{ color: '#888' }}>
            <div>Subcommands:</div>
            <div style={{ marginLeft: 16 }}>list                      - List all groups</div>
            <div style={{ marginLeft: 16 }}>create &lt;name&gt;            - Create a new group</div>
            <div style={{ marginLeft: 16 }}>show &lt;id&gt;                - Show group details</div>
            <div style={{ marginLeft: 16 }}>edit &lt;id&gt; [options]      - Edit a group</div>
            <div style={{ marginLeft: 16 }}>delete &lt;id&gt;              - Delete a group</div>
            <div style={{ marginLeft: 16 }}>add-member &lt;group&gt; &lt;contact&gt; - Add member to group</div>
            <div style={{ marginLeft: 16 }}>remove-member &lt;group&gt; &lt;contact&gt; - Remove member</div>
            <div style={{ marginLeft: 16 }}>list-members &lt;group&gt;     - List group members</div>
          </div>
        </div>
      );
      return;
    }

    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
        return groupListExecute(subArgs, context);
      case 'create':
        return groupCreateExecute(subArgs, context);
      case 'show':
        return groupShowExecute(subArgs, context);
      case 'edit':
        return groupEditExecute(subArgs, context);
      case 'delete':
        return groupDeleteExecute(subArgs, context);
      case 'add-member':
        return groupAddMemberExecute(subArgs, context);
      case 'remove-member':
        return groupRemoveMemberExecute(subArgs, context);
      case 'list-members':
        return groupListMembersExecute(subArgs, context);
      default:
        addOutput(
          <span style={{ color: '#ff6b6b' }}>
            Unknown subcommand: {subcommand}. Use "group" for help.
          </span>,
          'error'
        );
    }
  },
};

/**
 * group list - List all groups
 */
const groupListExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { options } = parseCliArgs(args);

  const groups = store.getTable(TABLE_NAME) || {};
  const groupIds = Object.keys(groups);

  if (groupIds.length === 0) {
    addOutput(
      <span style={{ color: '#888' }}>
        No groups found. Use "group create &lt;name&gt;" to create one.
      </span>
    );
    return;
  }

  // Filter by type if requested
  const typeFilter = getOptionString(options, 'type') || getOptionString(options, 't');

  const filtered = groupIds.filter((id) => {
    if (!typeFilter) return true;
    const record = groups[id] as Record<string, unknown>;
    const groupType = getGroupType(record);
    return groupType === typeFilter;
  });

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>
        Groups ({filtered.length}):
      </div>
      {filtered.map((id) => {
        const record = groups[id] as Record<string, unknown>;
        const name = getGroupName(record);
        const groupType = getGroupType(record);
        const description = record[DCTERMS.description] as string | undefined;
        const members = getMemberIds(record);
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            <span style={{ color: '#fff' }}>
              {getTypeEmoji(groupType)} {name}
            </span>
            <span style={{ color: '#888', marginLeft: 8, fontSize: '0.9em' }}>
              [{getTypeLabel(groupType)}]
            </span>
            {members.length > 0 && (
              <span style={{ color: '#666', marginLeft: 8, fontSize: '0.9em' }}>
                ({members.length} member{members.length !== 1 ? 's' : ''})
              </span>
            )}
            {description && (
              <div style={{ marginLeft: 24, color: '#666', fontSize: '0.85em' }}>
                {description.length > 60 ? description.slice(0, 60) + '...' : description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * group create <name> - Create a new group
 */
const groupCreateExecute: Command['execute'] = (args, context) => {
  const { store, baseUrl, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const name = positional[0];
  if (!name) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: group create &lt;name&gt; [--type=organization|team|group] [--description=...] [--url=...]
      </span>,
      'error'
    );
    return;
  }

  // Get type (default to 'group')
  const typeStr = getOptionString(options, 'type') || getOptionString(options, 't') || 'group';
  const validTypes = ['organization', 'team', 'group'];
  if (!validTypes.includes(typeStr)) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Invalid type "{typeStr}". Must be one of: organization, team, group
      </span>,
      'error'
    );
    return;
  }

  // Build input
  const input: GroupInput = {
    name,
    type: typeStr as GroupType,
    description: getOptionString(options, 'description') || getOptionString(options, 'desc'),
    url: getOptionString(options, 'url'),
    logo: getOptionString(options, 'logo'),
    parentId: getOptionString(options, 'parent'),
  };

  // Create the group using the factory function
  const group = createGroup(input, baseUrl);
  const id = group['@id'];

  // Store the group
  store.setRow(TABLE_NAME, id, group as Record<string, unknown>);

  addOutput(
    <div>
      <div style={{ color: '#2ecc71' }}>
        Created {getTypeLabel(input.type).toLowerCase()}: {name}
      </div>
      <div style={{ color: '#888', fontSize: '0.9em' }}>ID: {id}</div>
    </div>,
    'success'
  );
};

/**
 * group show <id> - Show group details
 */
const groupShowExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: group show &lt;id or name&gt;</span>,
      'error'
    );
    return;
  }

  // Find group by ID or partial match
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const record = groups[groupId] as Record<string, unknown>;
  const groupType = getGroupType(record);
  const members = getMemberIds(record);

  addOutput(
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>
          {getTypeEmoji(groupType)} {getGroupName(record)}
        </span>
        <span style={{ color: '#888', marginLeft: 8 }}>
          [{getTypeLabel(groupType)}]
        </span>
      </div>
      <GroupDetails record={record} store={store} />
      {members.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>
            Members ({members.length}):
          </div>
          <MemberList memberIds={members} store={store} />
        </div>
      )}
      <div style={{ marginTop: 8, color: '#666', fontSize: '0.85em' }}>
        ID: {groupId}
      </div>
    </div>
  );
};

/**
 * Helper component to display group details
 */
const GroupDetails: React.FC<{ record: Record<string, unknown>; store: unknown }> = ({ record }) => {
  const fields = [
    { label: 'Description', key: DCTERMS.description },
    { label: 'URL', key: VCARD.hasURL },
    { label: 'Logo', key: VCARD.hasLogo },
  ];

  return (
    <div style={{ fontSize: '0.9em' }}>
      {fields.map(({ label, key }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
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
 * Helper component to display member list
 */
const MemberList: React.FC<{ memberIds: string[]; store: unknown }> = ({ memberIds, store }) => {
  const contacts = (store as { getTable: (name: string) => Record<string, Record<string, unknown>> | undefined }).getTable('contacts') || {};

  return (
    <div style={{ marginLeft: 16, fontSize: '0.9em' }}>
      {memberIds.map((memberId) => {
        const contact = contacts[memberId] as Record<string, unknown> | undefined;
        const name = contact ? (contact[VCARD.fn] as string) || memberId : memberId;
        return (
          <div key={memberId} style={{ color: '#f5f5f5' }}>
            • {name}
          </div>
        );
      })}
    </div>
  );
};

/**
 * group edit <id> - Edit a group
 */
const groupEditExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);

  const idArg = positional[0];
  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: group edit &lt;id&gt; [--name=...] [--description=...] [--url=...]
      </span>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {idArg}</span>,
      'error'
    );
    return;
  }

  // Update fields based on options
  const updates: Record<string, unknown> = {};

  const optionMappings: Array<{ option: string; key: string }> = [
    { option: 'name', key: VCARD.fn },
    { option: 'description', key: DCTERMS.description },
    { option: 'desc', key: DCTERMS.description },
    { option: 'url', key: VCARD.hasURL },
    { option: 'logo', key: VCARD.hasLogo },
  ];

  for (const { option, key } of optionMappings) {
    const value = getOptionString(options, option);
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    addOutput(
      <span style={{ color: '#f9ca24' }}>
        No changes specified. Use options like --name="New Name" --description="..."
      </span>
    );
    return;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    store.setCell(TABLE_NAME, groupId, key, value as string);
  }

  addOutput(
    <div style={{ color: '#2ecc71' }}>
      Updated group: {getGroupName(store.getRow(TABLE_NAME, groupId) as Record<string, unknown>)}
    </div>,
    'success'
  );
};

/**
 * group delete <id> - Delete a group
 */
const groupDeleteExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: group delete &lt;id or name&gt;</span>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const name = getGroupName(groups[groupId] as Record<string, unknown>);

  // Remove from store
  store.delRow(TABLE_NAME, groupId);

  addOutput(
    <span style={{ color: '#2ecc71' }}>Deleted group: {name}</span>,
    'success'
  );
};

/**
 * group add-member <group> <contact> - Add a member to a group
 */
const groupAddMemberExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);
  const [groupArg, contactArg] = positional;

  if (!groupArg || !contactArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: group add-member &lt;group&gt; &lt;contact&gt; [--role=...]
      </span>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, groupArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {groupArg}</span>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable('contacts') || {};
  const contactId = findContactId(contacts, contactArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {contactArg}</span>,
      'error'
    );
    return;
  }

  // Get current members
  const record = groups[groupId] as Record<string, unknown>;
  const currentMembers = getMemberIds(record);

  // Check if already a member
  if (currentMembers.includes(contactId)) {
    addOutput(
      <span style={{ color: '#f9ca24' }}>Contact is already a member of this group</span>
    );
    return;
  }

  // Add member
  const newMembers = [...currentMembers, contactId];
  const memberRefs = newMembers.map(id => ({ '@id': id }));
  store.setCell(TABLE_NAME, groupId, VCARD.hasMember, JSON.stringify(memberRefs));

  const groupName = getGroupName(record);
  const contactName = (contacts[contactId] as Record<string, unknown>)?.[VCARD.fn] as string || 'contact';

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Added {contactName} to {groupName}
    </span>,
    'success'
  );
};

/**
 * group remove-member <group> <contact> - Remove a member from a group
 */
const groupRemoveMemberExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const [groupArg, contactArg] = args;

  if (!groupArg || !contactArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: group remove-member &lt;group&gt; &lt;contact&gt;
      </span>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, groupArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {groupArg}</span>,
      'error'
    );
    return;
  }

  // Find contact
  const contacts = store.getTable('contacts') || {};
  const contactId = findContactId(contacts, contactArg);

  if (!contactId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Contact not found: {contactArg}</span>,
      'error'
    );
    return;
  }

  // Get current members
  const record = groups[groupId] as Record<string, unknown>;
  const currentMembers = getMemberIds(record);

  // Check if a member
  if (!currentMembers.includes(contactId)) {
    addOutput(
      <span style={{ color: '#f9ca24' }}>Contact is not a member of this group</span>
    );
    return;
  }

  // Remove member
  const newMembers = currentMembers.filter(id => id !== contactId);
  if (newMembers.length === 0) {
    store.delCell(TABLE_NAME, groupId, VCARD.hasMember);
  } else {
    const memberRefs = newMembers.map(id => ({ '@id': id }));
    store.setCell(TABLE_NAME, groupId, VCARD.hasMember, JSON.stringify(memberRefs));
  }

  const groupName = getGroupName(record);
  const contactName = (contacts[contactId] as Record<string, unknown>)?.[VCARD.fn] as string || 'contact';

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Removed {contactName} from {groupName}
    </span>,
    'success'
  );
};

/**
 * group list-members <group> - List all members of a group
 */
const groupListMembersExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const idArg = args[0];

  if (!idArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Usage: group list-members &lt;group&gt;</span>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(TABLE_NAME) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>Group not found: {idArg}</span>,
      'error'
    );
    return;
  }

  const record = groups[groupId] as Record<string, unknown>;
  const groupName = getGroupName(record);
  const memberIds = getMemberIds(record);

  if (memberIds.length === 0) {
    addOutput(
      <span style={{ color: '#888' }}>
        {groupName} has no members. Use "group add-member {idArg} &lt;contact&gt;" to add one.
      </span>
    );
    return;
  }

  const contacts = store.getTable('contacts') || {};

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>
        Members of {groupName} ({memberIds.length}):
      </div>
      {memberIds.map((memberId) => {
        const contact = contacts[memberId] as Record<string, unknown> | undefined;
        const name = contact ? (contact[VCARD.fn] as string) || memberId : memberId;
        const email = contact?.[VCARD.hasEmail] as string | undefined;
        return (
          <div key={memberId} style={{ marginBottom: 2 }}>
            <span style={{ color: '#fff' }}>👤 {name}</span>
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
 * Get member IDs from a group record
 */
function getMemberIds(record: Record<string, unknown>): string[] {
  const members = record[VCARD.hasMember];
  if (!members) return [];

  // Handle JSON string (from TinyBase storage)
  if (typeof members === 'string') {
    try {
      const parsed = JSON.parse(members);
      if (Array.isArray(parsed)) {
        return parsed.map(m => m['@id'] || m).filter(Boolean);
      }
      return [parsed['@id'] || parsed].filter(Boolean);
    } catch {
      return [];
    }
  }

  // Handle array of NodeRefs
  if (Array.isArray(members)) {
    return members.map(m => {
      if (typeof m === 'object' && m !== null && '@id' in m) {
        return (m as { '@id': string })['@id'];
      }
      return m as string;
    }).filter(Boolean);
  }

  // Handle single NodeRef
  if (typeof members === 'object' && members !== null && '@id' in members) {
    return [(members as { '@id': string })['@id']];
  }

  return [];
}

/**
 * Find group ID by exact match or partial match
 */
function findGroupId(
  groups: Record<string, Record<string, unknown>>,
  searchId: string
): string | null {
  // Exact match first
  if (groups[searchId]) {
    return searchId;
  }

  // Try matching by the slug part
  for (const id of Object.keys(groups)) {
    const slug = id.split('/groups/').pop()?.split('#')[0] || '';
    if (slug === searchId || slug.startsWith(searchId)) {
      return id;
    }
  }

  // Try matching by name (case insensitive)
  const searchLower = searchId.toLowerCase();
  for (const [id, record] of Object.entries(groups)) {
    const name = getGroupName(record).toLowerCase();
    if (name === searchLower || name.includes(searchLower)) {
      return id;
    }
  }

  return null;
}

/**
 * Find contact ID by exact match or partial match
 */
function findContactId(
  contacts: Record<string, Record<string, unknown>>,
  searchId: string
): string | null {
  if (contacts[searchId]) {
    return searchId;
  }

  for (const id of Object.keys(contacts)) {
    const shortId = id.split('#').pop() || '';
    if (shortId === searchId || shortId.startsWith(searchId)) {
      return id;
    }
  }

  const searchLower = searchId.toLowerCase();
  for (const [id, record] of Object.entries(contacts)) {
    const name = ((record[VCARD.fn] as string) || '').toLowerCase();
    if (name === searchLower || name.includes(searchLower)) {
      return id;
    }
  }

  return null;
}
