import React, { useState, useEffect, CSSProperties } from 'react';
import { Store } from 'tinybase';
import { useRow, useTable } from 'tinybase/ui-react';
import { DCTERMS } from '@inrupt/vocab-common-rdf';
import { SCHEMA } from '../schemas/file';

const RESOURCES_TABLE = 'resources';
const PERSONAS_TABLE = 'personas';

interface FileMetadataPanelProps {
  store: Store;
  url: string;
}

interface ResourceRow {
  type?: string;
  body?: string | null;
  contentType?: string;
  parentId?: string;
  updated?: string;
  [key: string]: unknown;
}

/**
 * Format file size in human-readable format
 */
const formatSize = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === null) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileMetadataPanel: React.FC<FileMetadataPanelProps> = ({ store, url }) => {
  const row = useRow(RESOURCES_TABLE, url, store) as ResourceRow | undefined;
  const personas = useTable(PERSONAS_TABLE, store) as Record<string, Record<string, unknown>>;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorId, setAuthorId] = useState('');

  // Load current metadata
  useEffect(() => {
    if (row) {
      setTitle((row[DCTERMS.title] as string) || '');
      setDescription((row[DCTERMS.description] as string) || '');
      const authorRef = row[SCHEMA.author];
      if (typeof authorRef === 'string') {
        try {
          const parsed = JSON.parse(authorRef);
          setAuthorId(parsed['@id'] || '');
        } catch {
          setAuthorId(authorRef || '');
        }
      } else if (typeof authorRef === 'object' && authorRef !== null) {
        setAuthorId((authorRef as { '@id': string })['@id'] || '');
      } else {
        setAuthorId('');
      }
    }
  }, [row]);

  if (!row) return null;

  const name = url.split('/').filter(Boolean).pop() || '';
  const contentType = row.contentType || 'unknown';
  const body = row.body as string | undefined;
  const size = body ? body.length : 0;
  const updated = row.updated;
  const created = row[DCTERMS.created] as string | undefined;
  const modified = row[DCTERMS.modified] as string | undefined;

  const isImage = contentType?.startsWith('image/');
  const width = row['https://schema.org/width'] as number | undefined;
  const height = row['https://schema.org/height'] as number | undefined;
  const location = row[SCHEMA.contentLocation] as string | undefined;

  // Get author name
  let authorName: string | undefined;
  if (authorId && personas[authorId]) {
    authorName = personas[authorId]['http://xmlns.com/foaf/0.1/name'] as string | undefined;
  }

  const handleSave = () => {
    // Update title
    if (title.trim()) {
      store.setCell(RESOURCES_TABLE, url, DCTERMS.title, title.trim());
    } else {
      store.delCell(RESOURCES_TABLE, url, DCTERMS.title);
    }

    // Update description
    if (description.trim()) {
      store.setCell(RESOURCES_TABLE, url, DCTERMS.description, description.trim());
    } else {
      store.delCell(RESOURCES_TABLE, url, DCTERMS.description);
    }

    // Update author
    if (authorId) {
      store.setCell(RESOURCES_TABLE, url, SCHEMA.author, JSON.stringify({ '@id': authorId }));
    } else {
      store.delCell(RESOURCES_TABLE, url, SCHEMA.author);
    }

    // Update modified timestamp
    store.setCell(RESOURCES_TABLE, url, DCTERMS.modified, new Date().toISOString());

    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to current values
    setTitle((row[DCTERMS.title] as string) || '');
    setDescription((row[DCTERMS.description] as string) || '');
    const authorRef = row[SCHEMA.author];
    if (typeof authorRef === 'string') {
      try {
        const parsed = JSON.parse(authorRef);
        setAuthorId(parsed['@id'] || '');
      } catch {
        setAuthorId(authorRef || '');
      }
    } else if (typeof authorRef === 'object' && authorRef !== null) {
      setAuthorId((authorRef as { '@id': string })['@id'] || '');
    } else {
      setAuthorId('');
    }
    setIsEditing(false);
  };

  const personaList = Object.entries(personas).map(([id, p]) => ({
    id,
    name: (p['http://xmlns.com/foaf/0.1/name'] as string) || '(unnamed)',
  }));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.fileName}>{name}</span>
        {!isEditing ? (
          <button style={styles.editBtn} onClick={() => setIsEditing(true)}>
            Edit Metadata
          </button>
        ) : (
          <div style={styles.editActions}>
            <button style={styles.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>
            <button style={styles.saveBtn} onClick={handleSave}>
              Save
            </button>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>File Properties</h4>
        <div style={styles.field}>
          <span style={styles.label}>Type:</span>
          <span style={styles.value}>{contentType}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Size:</span>
          <span style={styles.value}>{formatSize(size)}</span>
        </div>
        {updated && (
          <div style={styles.field}>
            <span style={styles.label}>Updated:</span>
            <span style={styles.value}>{new Date(updated).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Metadata</h4>
        {isEditing ? (
          <>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                style={styles.input}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                style={styles.textarea}
                rows={3}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Author</label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                style={styles.select}
              >
                <option value="">No author</option>
                {personaList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div style={styles.field}>
              <span style={styles.label}>Title:</span>
              <span style={styles.value}>
                {(row[DCTERMS.title] as string) || <span style={styles.notSet}>(not set)</span>}
              </span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Description:</span>
              <span style={styles.value}>
                {(row[DCTERMS.description] as string) || <span style={styles.notSet}>(not set)</span>}
              </span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Author:</span>
              <span style={styles.value}>
                {authorName || (authorId ? authorId : <span style={styles.notSet}>(not set)</span>)}
              </span>
            </div>
            {created && (
              <div style={styles.field}>
                <span style={styles.label}>Created:</span>
                <span style={styles.value}>{new Date(created).toLocaleString()}</span>
              </div>
            )}
            {modified && (
              <div style={styles.field}>
                <span style={styles.label}>Modified:</span>
                <span style={styles.value}>{new Date(modified).toLocaleString()}</span>
              </div>
            )}
          </>
        )}
      </div>

      {isImage && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Image Properties</h4>
          <div style={styles.field}>
            <span style={styles.label}>Dimensions:</span>
            <span style={styles.value}>
              {width && height ? `${width} × ${height} px` : <span style={styles.notSet}>(not set)</span>}
            </span>
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Location:</span>
            <span style={styles.value}>
              {location || <span style={styles.notSet}>(not set)</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    padding: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'monospace',
    color: '#333',
  },
  editBtn: {
    padding: '6px 12px',
    border: '1px solid #0070f3',
    background: '#fff',
    color: '#0070f3',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  editActions: {
    display: 'flex',
    gap: 8,
  },
  cancelBtn: {
    padding: '6px 12px',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#666',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  saveBtn: {
    padding: '6px 12px',
    border: 'none',
    background: '#0070f3',
    color: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid #eee',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  field: {
    display: 'flex',
    marginBottom: 8,
    fontSize: 14,
  },
  label: {
    width: 100,
    flexShrink: 0,
    color: '#666',
    fontWeight: 500,
  },
  value: {
    flex: 1,
    color: '#333',
    wordBreak: 'break-word',
  },
  notSet: {
    color: '#999',
    fontStyle: 'italic',
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 14,
    background: '#fff',
  },
};

export default FileMetadataPanel;
