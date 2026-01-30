import React, { useState, useEffect, CSSProperties } from 'react';
import { Store } from 'tinybase';
import { FOAF, VCARD, LDP } from '@inrupt/vocab-common-rdf';
import { SOLID, WS } from '@inrupt/vocab-solid-common';
import {
  createPersona,
  PersonaInputSchema,
  safeParsePersona,
  type PersonaInput,
} from '../schemas/persona';

function getIdFromRef(value: unknown): string {
  if (value && typeof value === 'object' && '@id' in value) {
    return (value as { '@id': string })['@id'];
  }
  return '';
}

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
  oidcIssuer: string;
  inbox: string;
  preferencesFile: string;
  publicTypeIndex: string;
  privateTypeIndex: string;
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
  oidcIssuer: '',
  inbox: '',
  preferencesFile: '',
  publicTypeIndex: '',
  privateTypeIndex: '',
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
  const [webIdOpen, setWebIdOpen] = useState(false);

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
          oidcIssuer: getIdFromRef(record[SOLID.oidcIssuer]) || '',
          inbox: getIdFromRef(record[LDP.inbox]) || '',
          preferencesFile: getIdFromRef(record[WS.preferencesFile]) || '',
          publicTypeIndex: getIdFromRef(record[SOLID.publicTypeIndex]) || '',
          privateTypeIndex: getIdFromRef(record[SOLID.privateTypeIndex]) || '',
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

    // Build input object for validation
    const input: PersonaInput = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
      givenName: form.givenName.trim() || undefined,
      familyName: form.familyName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      bio: form.bio.trim() || undefined,
      homepage: form.homepage.trim() || undefined,
      image: form.image.trim() || undefined,
      oidcIssuer: form.oidcIssuer.trim() || undefined,
      inbox: form.inbox.trim() || undefined,
      preferencesFile: form.preferencesFile.trim() || undefined,
      publicTypeIndex: form.publicTypeIndex.trim() || undefined,
      privateTypeIndex: form.privateTypeIndex.trim() || undefined,
    };

    // Validate input using Zod schema
    const inputResult = PersonaInputSchema.safeParse(input);
    if (!inputResult.success) {
      const firstError = inputResult.error.issues[0];
      setError(firstError.message);
      return;
    }

    if (isEditing && personaId) {
      // Update existing persona - build the full object and validate
      const existingRecord = store.getRow(TABLE_NAME, personaId) as Record<string, unknown>;

      const updates: Record<string, unknown> = {
        ...existingRecord,
        [FOAF.name]: form.name.trim(),
      };

      // Optional fields - set or remove
      if (form.nickname.trim()) {
        updates[FOAF.nick] = form.nickname.trim();
      } else {
        delete updates[FOAF.nick];
      }

      if (form.givenName.trim()) {
        updates[FOAF.givenName] = form.givenName.trim();
      } else {
        delete updates[FOAF.givenName];
      }

      if (form.familyName.trim()) {
        updates[FOAF.familyName] = form.familyName.trim();
      } else {
        delete updates[FOAF.familyName];
      }

      if (form.email.trim()) {
        updates[VCARD.hasEmail] = `mailto:${form.email.trim()}`;
      } else {
        delete updates[VCARD.hasEmail];
      }

      if (form.phone.trim()) {
        updates[VCARD.hasTelephone] = `tel:${form.phone.trim().replace(/\s/g, '')}`;
      } else {
        delete updates[VCARD.hasTelephone];
      }

      if (form.bio.trim()) {
        updates[VCARD.note] = form.bio.trim();
      } else {
        delete updates[VCARD.note];
      }

      if (form.homepage.trim()) {
        updates[FOAF.homepage] = form.homepage.trim();
      } else {
        delete updates[FOAF.homepage];
      }

      if (form.image.trim()) {
        updates[FOAF.img] = form.image.trim();
      } else {
        delete updates[FOAF.img];
      }

      if (form.oidcIssuer.trim()) {
        updates[SOLID.oidcIssuer] = { '@id': form.oidcIssuer.trim() };
      } else {
        delete updates[SOLID.oidcIssuer];
      }
      if (form.inbox.trim()) {
        updates[LDP.inbox] = { '@id': form.inbox.trim() };
      } else {
        delete updates[LDP.inbox];
      }
      if (form.preferencesFile.trim()) {
        updates[WS.preferencesFile] = { '@id': form.preferencesFile.trim() };
      } else {
        delete updates[WS.preferencesFile];
      }
      if (form.publicTypeIndex.trim()) {
        updates[SOLID.publicTypeIndex] = { '@id': form.publicTypeIndex.trim() };
      } else {
        delete updates[SOLID.publicTypeIndex];
      }
      if (form.privateTypeIndex.trim()) {
        updates[SOLID.privateTypeIndex] = { '@id': form.privateTypeIndex.trim() };
      } else {
        delete updates[SOLID.privateTypeIndex];
      }

      // Validate the final persona object
      const personaResult = safeParsePersona(updates);
      if (!personaResult.success) {
        const firstError = personaResult.error.issues[0];
        setError(`Validation error: ${firstError.message}`);
        return;
      }

      // Store the validated persona
      store.setRow(TABLE_NAME, personaId, updates);
    } else {
      // Create new persona using factory function (already generates valid structure)
      const persona = createPersona(inputResult.data, baseUrl);

      // Double-check validation
      const personaResult = safeParsePersona(persona);
      if (!personaResult.success) {
        const firstError = personaResult.error.issues[0];
        setError(`Validation error: ${firstError.message}`);
        return;
      }

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

          <div style={styles.section}>
            <button
              type="button"
              onClick={() => setWebIdOpen((o) => !o)}
              style={{
                ...styles.label,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {webIdOpen ? '▼' : '▶'} WebID / Solid profile (inbox, type index, preferences)
            </button>
            {webIdOpen && (
              <div style={{ marginTop: 12, paddingLeft: 8, borderLeft: '2px solid #e0e0e0' }}>
                <div style={styles.section}>
                  <label style={styles.label}>OIDC Issuer URL</label>
                  <input
                    type="url"
                    value={form.oidcIssuer}
                    onChange={handleChange('oidcIssuer')}
                    placeholder="https://idp.example.com/"
                    style={styles.input}
                  />
                </div>
                <div style={styles.section}>
                  <label style={styles.label}>Inbox (LDP)</label>
                  <input
                    type="url"
                    value={form.inbox}
                    onChange={handleChange('inbox')}
                    placeholder="https://pod.example/inbox/"
                    style={styles.input}
                  />
                </div>
                <div style={styles.section}>
                  <label style={styles.label}>Preferences File</label>
                  <input
                    type="url"
                    value={form.preferencesFile}
                    onChange={handleChange('preferencesFile')}
                    placeholder="https://pod.example/settings/prefs"
                    style={styles.input}
                  />
                </div>
                <div style={styles.section}>
                  <label style={styles.label}>Public Type Index</label>
                  <input
                    type="url"
                    value={form.publicTypeIndex}
                    onChange={handleChange('publicTypeIndex')}
                    placeholder="https://pod.example/settings/publicTypeIndex"
                    style={styles.input}
                  />
                </div>
                <div style={styles.section}>
                  <label style={styles.label}>Private Type Index</label>
                  <input
                    type="url"
                    value={form.privateTypeIndex}
                    onChange={handleChange('privateTypeIndex')}
                    placeholder="https://pod.example/settings/privateTypeIndex"
                    style={styles.input}
                  />
                </div>
              </div>
            )}
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
