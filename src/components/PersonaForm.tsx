import React, { useState, useEffect, CSSProperties } from 'react';
import { Store } from 'tinybase';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';
import { createPersona, type PersonaInput } from '../schemas/persona';

const TABLE_NAME = 'personas';
const DEFAULT_PERSONA_KEY = 'defaultPersonaId';

interface PersonaFormProps {
  store: Store;
  baseUrl: string;
  personaId?: string; // If provided, we're editing; otherwise creating
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  nickname: string;
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  bio: string;
  homepage: string;
  image: string;
}

const emptyForm: FormData = {
  name: '',
  nickname: '',
  givenName: '',
  familyName: '',
  email: '',
  phone: '',
  bio: '',
  homepage: '',
  image: '',
};

const PersonaForm: React.FC<PersonaFormProps> = ({
  store,
  baseUrl,
  personaId,
  onSave,
  onCancel,
}) => {
  const isEditing = !!personaId;
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Load existing persona data when editing
  useEffect(() => {
    if (personaId) {
      const record = store.getRow(TABLE_NAME, personaId) as Record<string, unknown>;
      if (record) {
        const email = record[VCARD.hasEmail] as string | undefined;
        const phone = record[VCARD.hasTelephone] as string | undefined;

        setForm({
          name: (record[FOAF.name] as string) || '',
          nickname: (record[FOAF.nick] as string) || '',
          givenName: (record[FOAF.givenName] as string) || '',
          familyName: (record[FOAF.familyName] as string) || '',
          email: email?.replace('mailto:', '') || '',
          phone: phone?.replace('tel:', '') || '',
          bio: (record[VCARD.note] as string) || '',
          homepage: (record[FOAF.homepage] as string) || '',
          image: (record[FOAF.img] as string) || '',
        });
      }
    }
  }, [personaId, store]);

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
    const urlFields = ['homepage', 'image'] as const;
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

    if (isEditing && personaId) {
      // Update existing persona
      const updates: Record<string, unknown> = {
        [FOAF.name]: form.name,
      };

      // Optional fields - set or clear
      updates[FOAF.nick] = form.nickname || null;
      updates[FOAF.givenName] = form.givenName || null;
      updates[FOAF.familyName] = form.familyName || null;
      updates[VCARD.hasEmail] = form.email ? `mailto:${form.email}` : null;
      updates[VCARD.hasTelephone] = form.phone ? `tel:${form.phone.replace(/\s/g, '')}` : null;
      updates[VCARD.note] = form.bio || null;
      updates[FOAF.homepage] = form.homepage || null;
      updates[FOAF.img] = form.image || null;

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          store.delCell(TABLE_NAME, personaId, key);
        } else {
          store.setCell(TABLE_NAME, personaId, key, value as string);
        }
      }
    } else {
      // Create new persona
      const input: PersonaInput = {
        name: form.name,
        nickname: form.nickname || undefined,
        givenName: form.givenName || undefined,
        familyName: form.familyName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        homepage: form.homepage || undefined,
        image: form.image || undefined,
      };

      const persona = createPersona(input, baseUrl);
      const id = persona['@id'];

      // Store the persona
      store.setRow(TABLE_NAME, id, persona as Record<string, unknown>);

      // If this is the first persona, make it default
      const personas = store.getTable(TABLE_NAME) || {};
      if (Object.keys(personas).length === 1) {
        store.setValue(DEFAULT_PERSONA_KEY, id);
      }
    }

    onSave();
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{isEditing ? 'Edit Persona' : 'Create Persona'}</h3>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.section}>
            <label style={styles.label}>Display Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. John Doe"
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Given Name</label>
              <input
                type="text"
                value={form.givenName}
                onChange={handleChange('givenName')}
                placeholder="First name"
                style={styles.input}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Family Name</label>
              <input
                type="text"
                value={form.familyName}
                onChange={handleChange('familyName')}
                placeholder="Last name"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Nickname</label>
            <input
              type="text"
              value={form.nickname}
              onChange={handleChange('nickname')}
              placeholder="e.g. johnd"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="john@example.com"
                style={styles.input}
              />
            </div>
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
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Bio</label>
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              placeholder="A short description about yourself..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Homepage URL</label>
            <input
              type="url"
              value={form.homepage}
              onChange={handleChange('homepage')}
              placeholder="https://example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Profile Image URL</label>
            <input
              type="url"
              value={form.image}
              onChange={handleChange('image')}
              placeholder="https://example.com/avatar.jpg"
              style={styles.input}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              {isEditing ? 'Save Changes' : 'Create Persona'}
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

export default PersonaForm;
