import React, { useState, CSSProperties } from 'react';
import { useTable } from 'tinybase/ui-react';
import { Store } from 'tinybase';
import { VCARD } from '@inrupt/vocab-common-rdf';

const TABLE_NAME = 'contacts';

interface ContactListProps {
  store: Store;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  selectedId?: string;
}

const isAgent = (record: Record<string, unknown>): boolean => {
  const types = record['@type'];
  if (Array.isArray(types)) {
    return types.includes('https://schema.org/SoftwareApplication');
  }
  return types === 'https://schema.org/SoftwareApplication';
};

const ContactList: React.FC<ContactListProps> = ({
  store,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  selectedId,
}) => {
  const contacts = useTable(TABLE_NAME, store) as Record<string, Record<string, unknown>>;
  const contactIds = Object.keys(contacts);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'agents'>('all');

  // Filter and search contacts
  const filteredContacts = contactIds.filter((id) => {
    const record = contacts[id];
    const contactIsAgent = isAgent(record);

    // Apply type filter
    if (filter === 'people' && contactIsAgent) return false;
    if (filter === 'agents' && !contactIsAgent) return false;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = ((record[VCARD.fn] as string) || '').toLowerCase();
      const email = ((record[VCARD.hasEmail] as string) || '').toLowerCase();
      const nickname = ((record[VCARD.nickname] as string) || '').toLowerCase();
      const org = ((record[VCARD.hasOrganizationName] as string) || '').toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        nickname.includes(query) ||
        org.includes(query)
      );
    }

    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Contacts</h3>
        <button style={styles.createBtn} onClick={onCreate}>
          + Add Contact
        </button>
      </div>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterTabs}>
          <button
            style={{ ...styles.filterTab, ...(filter === 'all' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            style={{ ...styles.filterTab, ...(filter === 'people' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('people')}
          >
            People
          </button>
          <button
            style={{ ...styles.filterTab, ...(filter === 'agents' ? styles.filterTabActive : {}) }}
            onClick={() => setFilter('agents')}
          >
            Agents
          </button>
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div style={styles.empty}>
          {contactIds.length === 0 ? (
            <>
              <p>No contacts yet.</p>
              <p style={styles.emptyHint}>Add contacts to build your address book.</p>
            </>
          ) : (
            <p>No contacts match your search.</p>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredContacts.map((id) => {
            const record = contacts[id];
            const name = (record[VCARD.fn] as string) || '(unnamed)';
            const nickname = record[VCARD.nickname] as string | undefined;
            const email = record[VCARD.hasEmail] as string | undefined;
            const org = record[VCARD.hasOrganizationName] as string | undefined;
            const contactIsAgent = isAgent(record);
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
                    <span style={styles.avatar}>
                      {contactIsAgent ? '🤖' : '👤'}
                    </span>
                    <span style={styles.name}>{name}</span>
                    {nickname && <span style={styles.nickname}>@{nickname}</span>}
                  </div>
                  <div style={styles.itemMeta}>
                    {org && <span style={styles.org}>{org}</span>}
                    {email && (
                      <span style={styles.email}>
                        {email.replace('mailto:', '')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(id);
                    }}
                    title="Edit contact"
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete contact "${name}"?`)) {
                        onDelete(id);
                      }
                    }}
                    title="Delete contact"
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
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 150,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
  },
  filterTabs: {
    display: 'flex',
    gap: 4,
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
  nickname: {
    color: '#888',
    fontSize: 13,
  },
  itemMeta: {
    marginTop: 4,
    marginLeft: 26,
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: '#666',
  },
  org: {
    color: '#666',
  },
  email: {
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

export default ContactList;
