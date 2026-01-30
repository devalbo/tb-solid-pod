import React, { CSSProperties } from 'react';
import { useTable, useValue } from 'tinybase/ui-react';
import { Store } from 'tinybase';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';

const TABLE_NAME = 'personas';
const DEFAULT_PERSONA_KEY = 'defaultPersonaId';

interface PersonaListProps {
  store: Store;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onCreate: () => void;
  /** Open create form with random demo values pre-filled. */
  onCreateRandom?: () => void;
  selectedId?: string;
}

const PersonaList: React.FC<PersonaListProps> = ({
  store,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  onCreate,
  onCreateRandom,
  selectedId,
}) => {
  const personas = useTable(TABLE_NAME, store) as Record<string, Record<string, unknown>>;
  const defaultId = useValue(DEFAULT_PERSONA_KEY, store) as string | undefined;
  const personaIds = Object.keys(personas);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Personas</h3>
        <div style={styles.headerActions}>
          {onCreateRandom && (
            <button style={styles.randomBtn} onClick={onCreateRandom} title="Open form with random demo values">
              Create random
            </button>
          )}
          <button style={styles.createBtn} onClick={onCreate}>
            + New Persona
          </button>
        </div>
      </div>

      {personaIds.length === 0 ? (
        <div style={styles.empty}>
          <p>No personas yet.</p>
          <p style={styles.emptyHint}>
            Create a persona to establish your identity.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {personaIds.map((id) => {
            const record = personas[id];
            const name = (record[FOAF.name] as string) || '(unnamed)';
            const nickname = record[FOAF.nick] as string | undefined;
            const email = record[VCARD.hasEmail] as string | undefined;
            const isDefault = id === defaultId;
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
                    {isDefault && <span style={styles.defaultBadge}>Default</span>}
                    <span style={styles.name}>{name}</span>
                    {nickname && <span style={styles.nickname}>@{nickname}</span>}
                  </div>
                  {email && (
                    <div style={styles.email}>
                      {email.replace('mailto:', '')}
                    </div>
                  )}
                </div>
                <div style={styles.actions}>
                  {!isDefault && (
                    <button
                      style={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefault(id);
                      }}
                      title="Set as default"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    style={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(id);
                    }}
                    title="Edit persona"
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete persona "${name}"?`)) {
                        onDelete(id);
                      }
                    }}
                    title="Delete persona"
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
  defaultBadge: {
    background: '#f9ca24',
    color: '#333',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  name: {
    fontWeight: 600,
    fontSize: 14,
  },
  nickname: {
    color: '#888',
    fontSize: 13,
  },
  email: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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

export default PersonaList;
