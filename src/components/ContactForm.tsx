import React, { useState, useEffect, CSSProperties } from 'react';
import { Store } from 'tinybase';
import { VCARD } from '@inrupt/vocab-common-rdf';
import { SOLID } from '@inrupt/vocab-solid-common';
import { createContact, type ContactInput } from '../schemas/contact';

const TABLE_NAME = 'contacts';

interface ContactFormProps {
  store: Store;
  baseUrl: string;
  contactId?: string; // If provided, we're editing; otherwise creating
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  nickname: string;
  email: string;
  phone: string;
  url: string;
  photo: string;
  notes: string;
  organization: string;
  role: string;
  webId: string;
  isAgent: boolean;
  agentCategory: string;
}

const emptyForm: FormData = {
  name: '',
  nickname: '',
  email: '',
  phone: '',
  url: '',
  photo: '',
  notes: '',
  organization: '',
  role: '',
  webId: '',
  isAgent: false,
  agentCategory: '',
};

const ContactForm: React.FC<ContactFormProps> = ({
  store,
  baseUrl,
  contactId,
  onSave,
  onCancel,
}) => {
  const isEditing = !!contactId;
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Load existing contact data when editing
  useEffect(() => {
    if (contactId) {
      const record = store.getRow(TABLE_NAME, contactId) as Record<string, unknown>;
      if (record) {
        const email = record[VCARD.hasEmail] as string | undefined;
        const phone = record[VCARD.hasTelephone] as string | undefined;
        const types = record['@type'];
        const isAgentType = Array.isArray(types)
          ? types.includes('https://schema.org/SoftwareApplication')
          : types === 'https://schema.org/SoftwareApplication';

        setForm({
          name: (record[VCARD.fn] as string) || '',
          nickname: (record[VCARD.nickname] as string) || '',
          email: email?.replace('mailto:', '') || '',
          phone: phone?.replace('tel:', '') || '',
          url: (record[VCARD.hasURL] as string) || '',
          photo: (record[VCARD.hasPhoto] as string) || '',
          notes: (record[VCARD.hasNote] as string) || '',
          organization: (record[VCARD.hasOrganizationName] as string) || '',
          role: (record[VCARD.hasRole] as string) || '',
          webId: (record[SOLID.webid] as string) || '',
          isAgent: isAgentType,
          agentCategory: (record['https://schema.org/applicationCategory'] as string) || '',
        });
      }
    }
  }, [contactId, store]);

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate email if provided
    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Invalid email address');
      return;
    }

    // Validate URL fields if provided
    const urlFields = ['url', 'photo', 'webId'] as const;
    for (const field of urlFields) {
      if (form[field]) {
        try {
          new URL(form[field]);
        } catch {
          setError(`Invalid ${field} URL`);
          return;
        }
      }
    }

    if (isEditing && contactId) {
      // Update existing contact
      const updates: Record<string, unknown> = {
        [VCARD.fn]: form.name,
      };

      // Optional fields - set or clear
      updates[VCARD.nickname] = form.nickname || null;
      updates[VCARD.hasEmail] = form.email ? `mailto:${form.email}` : null;
      updates[VCARD.hasTelephone] = form.phone ? `tel:${form.phone.replace(/\s/g, '')}` : null;
      updates[VCARD.hasURL] = form.url || null;
      updates[VCARD.hasPhoto] = form.photo || null;
      updates[VCARD.hasNote] = form.notes || null;
      updates[VCARD.hasOrganizationName] = form.organization || null;
      updates[VCARD.hasRole] = form.role || null;
      updates[SOLID.webid] = form.webId || null;

      // Handle type change for agent
      const currentTypes = store.getCell(TABLE_NAME, contactId, '@type');
      let newTypes: string | string[];
      if (form.isAgent) {
        if (Array.isArray(currentTypes)) {
          if (!currentTypes.includes('https://schema.org/SoftwareApplication')) {
            newTypes = [...currentTypes, 'https://schema.org/SoftwareApplication'];
          } else {
            newTypes = currentTypes;
          }
        } else {
          newTypes = [currentTypes as string, 'https://schema.org/SoftwareApplication'];
        }
        updates['https://schema.org/applicationCategory'] = form.agentCategory || null;
      } else {
        if (Array.isArray(currentTypes)) {
          newTypes = currentTypes.filter(t => t !== 'https://schema.org/SoftwareApplication');
          if (newTypes.length === 1) newTypes = newTypes[0];
        } else {
          newTypes = currentTypes as string;
        }
        updates['https://schema.org/applicationCategory'] = null;
      }
      updates['@type'] = newTypes;

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          store.delCell(TABLE_NAME, contactId, key);
        } else {
          store.setCell(TABLE_NAME, contactId, key, value as string);
        }
      }
    } else {
      // Create new contact
      const input: ContactInput = {
        name: form.name,
        nickname: form.nickname || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        url: form.url || undefined,
        photo: form.photo || undefined,
        notes: form.notes || undefined,
        organization: form.organization || undefined,
        role: form.role || undefined,
        webId: form.webId || undefined,
        isAgent: form.isAgent,
        agentCategory: form.agentCategory || undefined,
      };

      const contact = createContact(input, baseUrl);
      const id = contact['@id'];

      // Store the contact
      store.setRow(TABLE_NAME, id, contact as Record<string, unknown>);
    }

    onSave();
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{isEditing ? 'Edit Contact' : 'Add Contact'}</h3>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.section}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Jane Smith"
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Nickname</label>
              <input
                type="text"
                value={form.nickname}
                onChange={handleChange('nickname')}
                placeholder="e.g. janes"
                style={styles.input}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="jane@example.com"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+1 555 123 4567"
                style={styles.input}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>URL</label>
              <input
                type="url"
                value={form.url}
                onChange={handleChange('url')}
                placeholder="https://example.com"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Organization</label>
              <input
                type="text"
                value={form.organization}
                onChange={handleChange('organization')}
                placeholder="Company name"
                style={styles.input}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Role/Title</label>
              <input
                type="text"
                value={form.role}
                onChange={handleChange('role')}
                placeholder="e.g. Developer"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Additional notes about this contact..."
              style={styles.textarea}
              rows={2}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>WebID (Solid identity URL)</label>
            <input
              type="url"
              value={form.webId}
              onChange={handleChange('webId')}
              placeholder="https://example.solidpod.com/profile#me"
              style={styles.input}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Photo URL</label>
            <input
              type="url"
              value={form.photo}
              onChange={handleChange('photo')}
              placeholder="https://example.com/photo.jpg"
              style={styles.input}
            />
          </div>

          <div style={styles.checkboxSection}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isAgent}
                onChange={handleChange('isAgent')}
                style={styles.checkbox}
              />
              This is an agent/bot (software application)
            </label>
          </div>

          {form.isAgent && (
            <div style={styles.section}>
              <label style={styles.label}>Agent Category</label>
              <input
                type="text"
                value={form.agentCategory}
                onChange={handleChange('agentCategory')}
                placeholder="e.g. AI Assistant, Bot, Service"
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              {isEditing ? 'Save Changes' : 'Add Contact'}
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
    maxWidth: 520,
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
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  col: {
    flex: 1,
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
  checkboxSection: {
    marginBottom: 16,
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: 6,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
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

export default ContactForm;
