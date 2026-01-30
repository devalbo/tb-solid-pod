import React, { useState, CSSProperties } from 'react';
import { useTable } from 'tinybase/ui-react';
import { Store } from 'tinybase';
import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';
import { ORG, type GroupType } from '../schemas/group';

const TABLE_NAME = 'groups';

interface GroupListProps {
  store: Store;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onManageMembers: (id: string) => void;
  onCreate: () => void;
  /** Open create form with random demo values pre-filled. */
  onCreateRandom?: () => void;
  selectedId?: string;
}

const getGroupType = (record: Record<string, unknown>): GroupType => {
  const types = record['@type'];
  const typeArray = Array.isArray(types) ? types : [types];
  if (typeArray.includes(ORG.Organization)) return 'organization';
  if (typeArray.includes(ORG.OrganizationalUnit)) return 'team';
  return 'group';
};

const getTypeLabel = (type: GroupType): string => {
  switch (type) {
    case 'organization': return 'Organization';
    case 'team': return 'Team';
    case 'group': return 'Group';
  }
};

const getTypeEmoji = (type: GroupType): string => {
  switch (type) {
    case 'organization': return '🏢';
    case 'team': return '👥';
    case 'group': return '👋';
  }
};

const getMemberCount = (record: Record<string, unknown>): number => {
  const members = record[VCARD.hasMember];
  if (!members) return 0;

  if (typeof members === 'string') {
    try {
      const parsed = JSON.parse(members);
      return Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      return 0;
    }
  }

  if (Array.isArray(members)) return members.length;
  return 1;
};

const GroupList: React.FC<GroupListProps> = ({
  store,
  onSelect,
  onEdit,
  onDelete,
  onManageMembers,
  onCreate,
  onCreateRandom,
  selectedId,
}) => {
  const groups = useTable(TABLE_NAME, store) as Record<string, Record<string, unknown>>;
  const groupIds = Object.keys(groups);
  const [filter, setFilter] = useState<'all' | GroupType>('all');

  // Filter groups
  const filteredGroups = groupIds.filter((id) => {
    if (filter === 'all') return true;
    const record = groups[id];
    return getGroupType(record) === filter;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Groups</h3>
        <div style={styles.headerActions}>
          {onCreateRandom && (
            <button style={styles.randomBtn} onClick={onCreateRandom} title="Open form with random demo values">
              Create random
            </button>
          )}
          <button style={styles.createBtn} onClick={onCreate}>
            + New Group
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterTabs}>
          <button
            style={{ ...styles.filterTab, ...(filter === 'all' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            style={{ ...styles.filterTab, ...(filter === 'organization' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('organization')}
          >
            Organizations
          </button>
          <button
            style={{ ...styles.filterTab, ...(filter === 'team' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('team')}
          >
            Teams
          </button>
          <button
            style={{ ...styles.filterTab, ...(filter === 'group' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('group')}
          >
            Groups
          </button>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div style={styles.empty}>
          {groupIds.length === 0 ? (
            <>
              <p>No groups yet.</p>
              <p style={styles.emptyHint}>Create groups to organize your contacts.</p>
            </>
          ) : (
            <p>No groups match your filter.</p>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredGroups.map((id) => {
            const record = groups[id];
            const name = (record[VCARD.fn] as string) || '(unnamed)';
            const description = record[DCTERMS.description] as string | undefined;
            const groupType = getGroupType(record);
            const memberCount = getMemberCount(record);
            const isSelected = id === selectedId;

            return (
              <div
                key={id}
                style={{
                  ...styles.item,
                  ...(isSelected ? styles.itemSelected : {}),
                }}
                onClick={() => onSelect(id)}
              >
                <div style={styles.itemMain}>
                  <div style={styles.itemHeader}>
                    <span style={styles.avatar}>{getTypeEmoji(groupType)}</span>
                    <span style={styles.name}>{name}</span>
                    <span style={styles.typeBadge}>{getTypeLabel(groupType)}</span>
                  </div>
                  <div style={styles.itemMeta}>
                    {description && (
                      <span style={styles.description}>
                        {description.length > 50 ? description.slice(0, 50) + '...' : description}
                      </span>
                    )}
                    <span style={styles.memberCount}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageMembers(id);
                    }}
                    title="Manage members"
                  >
                    Members
                  </button>
                  <button
                    style={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(id);
                    }}
                    title="Edit group"
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete group "${name}"?`)) {
                        onDelete(id);
                      }
                    }}
                    title="Delete group"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#fafafa',
    borderBottom: '1px solid #eee',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  randomBtn: {
    padding: '8px 14px',
    background: '#fff',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 13,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  createBtn: {
    padding: '8px 16px',
    background: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 13,
  },
  toolbar: {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
  },
  filterTabs: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  filterTabActive: {
    background: '#0070f3',
    color: '#fff',
    borderColor: '#0070f3',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#666',
  },
  emptyHint: {
    fontSize: 14,
    color: '#888',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  itemSelected: {
    background: '#f0f7ff',
  },
  itemMain: {
    flex: 1,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    fontSize: 18,
  },
  name: {
    fontWeight: 600,
    fontSize: 14,
  },
  typeBadge: {
    padding: '2px 6px',
    background: '#e8e8e8',
    borderRadius: 4,
    fontSize: 11,
    color: '#666',
  },
  itemMeta: {
    marginTop: 4,
    marginLeft: 26,
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: '#666',
  },
  description: {
    color: '#666',
  },
  memberCount: {
    color: '#888',
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
  actionBtn: {
    padding: '4px 10px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  deleteBtn: {
    color: '#e74c3c',
    borderColor: '#e74c3c',
  },
};

export default GroupList;
