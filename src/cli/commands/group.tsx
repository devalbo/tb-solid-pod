import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../types';
import { parseCliArgs, getOptionString } from '../parse-args';
import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';
import { createGroup, ORG, type Group, type GroupInput, type GroupType } from '../../schemas/group';
import { getGroup, setGroup } from '../../utils/storeAccessors';
import { STORE_TABLES } from '../../storeLayout';

/** Get display name from a group (validated row or record). */
const getGroupName = (record: Group | Record<string, unknown>): string => {
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
        <Box flexDirection="column">
          <Text>Usage: group &lt;subcommand&gt;</Text>
          <Text dimColor>Subcommands: list, create, show, edit, delete, add-member, remove-member, list-members</Text>
        </Box>
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
          <Text color="red">Unknown subcommand: {subcommand}. Use "group" for help.</Text>,
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

  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupIds = Object.keys(groups);

  if (groupIds.length === 0) {
    addOutput(
      <Text dimColor>No groups found. Use "group create &lt;name&gt;" to create one.</Text>
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
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan">Groups ({filtered.length}):</Text>
      </Box>
      {filtered.map((id) => {
        const record = groups[id] as Record<string, unknown>;
        const name = getGroupName(record);
        const groupType = getGroupType(record);
        const description = record[DCTERMS.description] as string | undefined;
        const members = getMemberIds(record);
        return (
          <Box key={id} flexDirection="column" marginBottom={1}>
            <Box>
              <Text>{getTypeEmoji(groupType)} {name}</Text>
              <Text dimColor> [{getTypeLabel(groupType)}]</Text>
              {members.length > 0 && (
                <Text dimColor> ({members.length} member{members.length !== 1 ? 's' : ''})</Text>
              )}
            </Box>
            {description && (
              <Box marginLeft={2}>
                <Text dimColor>{description.length > 60 ? description.slice(0, 60) + '...' : description}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
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
      <Text color="red">
        Usage: group create &lt;name&gt; [--type=organization|team|group] [--description=...] [--url=...]
      </Text>,
      'error'
    );
    return;
  }

  // Get type (default to 'group')
  const typeStr = getOptionString(options, 'type') || getOptionString(options, 't') || 'group';
  const validTypes = ['organization', 'team', 'group'];
  if (!validTypes.includes(typeStr)) {
    addOutput(
      <Text color="red">Invalid type "{typeStr}". Must be one of: organization, team, group</Text>,
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
  const id = typeof group['@id'] === 'string' ? group['@id'] : String((group['@id'] as { '@id'?: string })?.['@id'] ?? '');

  // Store the group
  setGroup(store, group);

  addOutput(
    <Box flexDirection="column">
      <Text color="green">Created {getTypeLabel(input.type).toLowerCase()}: {name}</Text>
      <Text dimColor>ID: {id}</Text>
    </Box>,
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
      <Text color="red">Usage: group show &lt;id or name&gt;</Text>,
      'error'
    );
    return;
  }

  // Find group by ID or partial match
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const record = groups[groupId] as Record<string, unknown>;
  const groupType = getGroupType(record);
  const members = getMemberIds(record);

  addOutput(
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          {getTypeEmoji(groupType)} {getGroupName(record)}
        </Text>
        <Text dimColor> [{getTypeLabel(groupType)}]</Text>
      </Box>
      <GroupDetails record={record} store={store} />
      {members.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text dimColor>Members ({members.length}):</Text>
          </Box>
          <MemberList memberIds={members} store={store} />
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>ID: {groupId}</Text>
      </Box>
    </Box>
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
    <Box flexDirection="column">
      {fields.map(({ label, key }) => {
        const value = record[key];
        if (!value) return null;
        const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
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
 * Helper component to display member list
 */
const MemberList: React.FC<{ memberIds: string[]; store: unknown }> = ({ memberIds, store }) => {
  const contacts = (store as { getTable: (name: string) => Record<string, Record<string, unknown>> | undefined }).getTable(STORE_TABLES.CONTACTS) || {};

  return (
    <Box flexDirection="column" marginLeft={2}>
      {memberIds.map((memberId) => {
        const contact = contacts[memberId] as Record<string, unknown> | undefined;
        const name = contact ? (contact[VCARD.fn] as string) || memberId : memberId;
        return (
          <Text key={memberId}>• {name}</Text>
        );
      })}
    </Box>
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
      <Text color="red">
        Usage: group edit &lt;id&gt; [--name=...] [--description=...] [--url=...]
      </Text>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {idArg}</Text>,
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
      <Text color="yellow">
        No changes specified. Use options like --name="New Name" --description="..."
      </Text>
    );
    return;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    store.setCell(STORE_TABLES.GROUPS, groupId, key, value as string);
  }

  addOutput(
    <Text color="green">Updated group: {getGroupName(getGroup(store, groupId) ?? {})}</Text>,
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
      <Text color="red">Usage: group delete &lt;id or name&gt;</Text>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const name = getGroupName(groups[groupId] as Record<string, unknown>);

  // Remove from store
  store.delRow(STORE_TABLES.GROUPS, groupId);

  addOutput(
    <Text color="green">Deleted group: {name}</Text>,
    'success'
  );
};

/**
 * group add-member <group> <contact> - Add a member to a group
 */
const groupAddMemberExecute: Command['execute'] = (args, context) => {
  const { store, addOutput } = context;
  const { positional } = parseCliArgs(args);
  const [groupArg, contactArg] = positional;

  if (!groupArg || !contactArg) {
    addOutput(
      <Text color="red">
        Usage: group add-member &lt;group&gt; &lt;contact&gt; [--role=...]
      </Text>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, groupArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {groupArg}</Text>,
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

  // Get current members
  const record = groups[groupId] as Record<string, unknown>;
  const currentMembers = getMemberIds(record);

  // Check if already a member
  if (currentMembers.includes(contactId)) {
    addOutput(
      <Text color="yellow">Contact is already a member of this group</Text>
    );
    return;
  }

  // Add member
  const newMembers = [...currentMembers, contactId];
  const memberRefs = newMembers.map(id => ({ '@id': id }));
  store.setCell(STORE_TABLES.GROUPS, groupId, VCARD.hasMember, JSON.stringify(memberRefs));

  const groupName = getGroupName(record);
  const contactName = (contacts[contactId] as Record<string, unknown>)?.[VCARD.fn] as string || 'contact';

  addOutput(
    <Text color="green">Added {contactName} to {groupName}</Text>,
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
      <Text color="red">
        Usage: group remove-member &lt;group&gt; &lt;contact&gt;
      </Text>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, groupArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {groupArg}</Text>,
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

  // Get current members
  const record = groups[groupId] as Record<string, unknown>;
  const currentMembers = getMemberIds(record);

  // Check if a member
  if (!currentMembers.includes(contactId)) {
    addOutput(
      <Text color="yellow">Contact is not a member of this group</Text>
    );
    return;
  }

  // Remove member
  const newMembers = currentMembers.filter(id => id !== contactId);
  if (newMembers.length === 0) {
    store.delCell(STORE_TABLES.GROUPS, groupId, VCARD.hasMember);
  } else {
    const memberRefs = newMembers.map(id => ({ '@id': id }));
    store.setCell(STORE_TABLES.GROUPS, groupId, VCARD.hasMember, JSON.stringify(memberRefs));
  }

  const groupName = getGroupName(record);
  const contactName = (contacts[contactId] as Record<string, unknown>)?.[VCARD.fn] as string || 'contact';

  addOutput(
    <Text color="green">Removed {contactName} from {groupName}</Text>,
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
      <Text color="red">Usage: group list-members &lt;group&gt;</Text>,
      'error'
    );
    return;
  }

  // Find group
  const groups = store.getTable(STORE_TABLES.GROUPS) || {};
  const groupId = findGroupId(groups, idArg);

  if (!groupId) {
    addOutput(
      <Text color="red">Group not found: {idArg}</Text>,
      'error'
    );
    return;
  }

  const record = groups[groupId] as Record<string, unknown>;
  const groupName = getGroupName(record);
  const memberIds = getMemberIds(record);

  if (memberIds.length === 0) {
    addOutput(
      <Text dimColor>
        {groupName} has no members. Use "group add-member {idArg} &lt;contact&gt;" to add one.
      </Text>
    );
    return;
  }

  const contacts = store.getTable(STORE_TABLES.CONTACTS) || {};

  addOutput(
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan">Members of {groupName} ({memberIds.length}):</Text>
      </Box>
      {memberIds.map((memberId) => {
        const contact = contacts[memberId] as Record<string, unknown> | undefined;
        const name = contact ? (contact[VCARD.fn] as string) || memberId : memberId;
        const email = contact?.[VCARD.hasEmail] as string | undefined;
        return (
          <Box key={memberId} marginBottom={1}>
            <Text>👤 {name}</Text>
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
