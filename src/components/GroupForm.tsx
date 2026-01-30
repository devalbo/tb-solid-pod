import React, { useState, useEffect, CSSProperties } from 'react';
import { Store } from 'tinybase';
import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';
import {
  createGroup,
  GroupInputSchema,
  safeParseGroup,
  ORG,
  type GroupInput,
  type GroupType,
} from '../schemas/group';

const TABLE_NAME = 'groups';

interface GroupFormProps {
  store: Store;
  baseUrl: string;
  groupId?: string; // If provided, we're editing; otherwise creating
  /** Pre-fill form when creating (e.g. "Add random" demo). */
  initialValues?: Partial<FormData>;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  type: GroupType;
  description: string;
  url: string;
  logo: string;
}

const emptyForm: FormData = {
  name: '',
  type: 'group',
  description: '',
  url: '',
  logo: '',
};

const getGroupType = (record: Record<string, unknown>): GroupType => {
  const types = record['@type'];
  const typeArray = Array.isArray(types) ? types : [types];
  if (typeArray.includes(ORG.Organization)) return 'organization';
  if (typeArray.includes(ORG.OrganizationalUnit)) return 'team';
  return 'group';
};

const GroupForm: React.FC<GroupFormProps> = ({
  store,
  baseUrl,
  groupId,
  initialValues,
  onSave,
  onCancel,
}) => {
  const isEditing = !!groupId;
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const appliedInitialRef = React.useRef(false);

  // Load existing group data when editing
  useEffect(() => {
    if (groupId) {
      appliedInitialRef.current = false;
      const record = store.getRow(TABLE_NAME, groupId) as Record<string, unknown>;
      if (record) {
        setForm({
          name: (record[VCARD.fn] as string) || '',
          type: getGroupType(record),
          description: (record[DCTERMS.description] as string) || '',
          url: (record[VCARD.hasURL] as string) || '',
          logo: (record[VCARD.hasLogo] as string) || '',
        });
      }
    }
  }, [groupId, store]);

  // Pre-fill form when creating with initialValues (e.g. "Add random" demo)
  useEffect(() => {
    if (!groupId && initialValues && !appliedInitialRef.current) {
      setForm((prev) => ({ ...emptyForm, ...prev, ...initialValues }));
      appliedInitialRef.current = true;
    }
    if (groupId) appliedInitialRef.current = false;
  }, [groupId, initialValues]);

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Build input object for validation
    const input: GroupInput = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      url: form.url.trim() || undefined,
      logo: form.logo.trim() || undefined,
    };

    // Validate input using Zod schema
    const inputResult = GroupInputSchema.safeParse(input);
    if (!inputResult.success) {
      const firstError = inputResult.error.issues[0];
      setError(firstError.message);
      return;
    }

    if (isEditing && groupId) {
      // Update existing group - build the full object and validate
      const existingRecord = store.getRow(TABLE_NAME, groupId) as Record<string, unknown>;

      const updates: Record<string, unknown> = {
        ...existingRecord,
        [VCARD.fn]: form.name.trim(),
      };

      // Optional fields - set or remove
      if (form.description.trim()) {
        updates[DCTERMS.description] = form.description.trim();
      } else {
        delete updates[DCTERMS.description];
      }

      if (form.url.trim()) {
        updates[VCARD.hasURL] = form.url.trim();
      } else {
        delete updates[VCARD.hasURL];
      }

      if (form.logo.trim()) {
        updates[VCARD.hasLogo] = form.logo.trim();
      } else {
        delete updates[VCARD.hasLogo];
      }

      // Note: We don't change the type when editing as it affects the @type field
      // which determines the RDF classes

      // Validate the final group object
      const groupResult = safeParseGroup(updates);
      if (!groupResult.success) {
        const firstError = groupResult.error.issues[0];
        setError(`Validation error: ${firstError.message}`);
        return;
      }

      // Store the validated group
      store.setRow(TABLE_NAME, groupId, updates as import('tinybase').Row);
    } else {
      // Create new group using factory function
      const group = createGroup(inputResult.data, baseUrl);

      // Double-check validation
      const groupResult = safeParseGroup(group);
      if (!groupResult.success) {
        const firstError = groupResult.error.issues[0];
        setError(`Validation error: ${firstError.message}`);
        return;
      }

      const rawId = group['@id'];
      const id = typeof rawId === 'string' ? rawId : String((rawId as { '@id'?: string })?.['@id'] ?? '');

      // Store the group
      store.setRow(TABLE_NAME, id, group as import('tinybase').Row);
    }

    onSave();
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{isEditing ? 'Edit Group' : 'Create Group'}</h3>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.section}>
            <label style={styles.label}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Acme Corporation"
              style={styles.input}
              autoFocus
            />
          </div>

          {!isEditing && (
            <div style={styles.section}>
              <label style={styles.label}>Type</label>
              <select
                value={form.type}
                onChange={handleChange('type')}
                style={styles.select}
              >
                <option value="group">Group (informal)</option>
                <option value="team">Team (within organization)</option>
                <option value="organization">Organization (formal)</option>
              </select>
              <div style={styles.hint}>
                {form.type === 'organization' && 'A formal organization like a company or non-profit'}
                {form.type === 'team' && 'A team or department within an organization'}
                {form.type === 'group' && 'An informal group of people'}
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.label}>Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Describe this group..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Website URL</label>
            <input
              type="url"
              value={form.url}
              onChange={handleChange('url')}
              placeholder="https://example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Logo URL</label>
            <input
              type="url"
              value={form.logo}
              onChange={handleChange('logo')}
              placeholder="https://example.com/logo.png"
              style={styles.input}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              {isEditing ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 60,
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: 10,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  title: {
    margin: '0 0 20px',
    fontSize: 18,
    fontWeight: 600,
  },
  error: {
    padding: '10px 12px',
    background: '#ffe6e6',
    color: '#c00',
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
    background: '#fff',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  submitBtn: {
    padding: '10px 18px',
    borderRadius: 6,
    border: 'none',
    background: '#0070f3',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
};

export default GroupForm;
