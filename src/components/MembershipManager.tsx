import React, { CSSProperties } from 'react';
import { useTable } from 'tinybase/ui-react';
import { Store } from 'tinybase';
import { FOAF, VCARD } from '@inrupt/vocab-common-rdf';

const GROUPS_TABLE = 'groups';
const CONTACTS_TABLE = 'contacts';
const PERSONAS_TABLE = 'personas';

interface MembershipManagerProps {
  store: Store;
  groupId: string;
  onClose: () => void;
}

const getMemberIds = (record: Record<string, unknown>): string[] => {
  const members = record[VCARD.hasMember];
  if (!members) return [];

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

  if (Array.isArray(members)) {
    return members.map(m => {
      if (typeof m === 'object' && m !== null && '@id' in m) {
        return (m as { '@id': string })['@id'];
      }
      return m as string;
    }).filter(Boolean);
  }

  if (typeof members === 'object' && members !== null && '@id' in members) {
    return [(members as { '@id': string })['@id']];
  }

  return [];
};

/** Resolve display name and optional email for a member ID (contact or persona). */
function getMemberDisplay(
  memberId: string,
  contacts: Record<string, Record<string, unknown>>,
  personas: Record<string, Record<string, unknown>>
): { name: string; email?: string; isPersona: boolean } {
  const contact = contacts[memberId];
  if (contact) {
    return {
      name: (contact[VCARD.fn] as string) || '(unnamed)',
      email: contact[VCARD.hasEmail] as string | undefined,
      isPersona: false,
    };
  }
  const persona = personas[memberId];
  if (persona) {
    return {
      name: (persona[FOAF.name] as string) || '(unnamed)',
      email: persona[VCARD.hasEmail] as string | undefined,
      isPersona: true,
    };
  }
  return { name: memberId, isPersona: false };
}

const MembershipManager: React.FC<MembershipManagerProps> = ({
  store,
  groupId,
  onClose,
}) => {
  const groups = useTable(GROUPS_TABLE, store) as Record<string, Record<string, unknown>>;
  const contacts = useTable(CONTACTS_TABLE, store) as Record<string, Record<string, unknown>>;
  const personas = useTable(PERSONAS_TABLE, store) as Record<string, Record<string, unknown>>;

  const group = groups[groupId];
  const groupName = group ? (group[VCARD.fn] as string) || '(unnamed)' : '';
  const memberIds = group ? getMemberIds(group) : [];

  const contactIds = Object.keys(contacts);
  const personaIds = Object.keys(personas);
  const nonMemberContacts = contactIds.filter(id => !memberIds.includes(id));
  const nonMemberPersonas = personaIds.filter(id => !memberIds.includes(id));

  const addMember = (memberId: string) => {
    const newMembers = [...memberIds, memberId];
    const memberRefs = newMembers.map(id => ({ '@id': id }));
    store.setCell(GROUPS_TABLE, groupId, VCARD.hasMember, JSON.stringify(memberRefs));
  };

  const removeMember = (memberId: string) => {
    const newMembers = memberIds.filter(id => id !== memberId);
    if (newMembers.length === 0) {
      store.delCell(GROUPS_TABLE, groupId, VCARD.hasMember);
    } else {
      const memberRefs = newMembers.map(id => ({ '@id': id }));
      store.setCell(GROUPS_TABLE, groupId, VCARD.hasMember, JSON.stringify(memberRefs));
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Manage Members: {groupName}</h3>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>
            Current Members ({memberIds.length})
          </h4>
          {memberIds.length === 0 ? (
            <div style={styles.empty}>No members yet</div>
          ) : (
            <div style={styles.list}>
              {memberIds.map((memberId) => {
                const { name, email, isPersona } = getMemberDisplay(memberId, contacts, personas);
                return (
                  <div key={memberId} style={styles.memberItem}>
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>
                        {isPersona ? '🪪' : '👤'} {name}
                        {isPersona && <span style={styles.personaBadge}> you</span>}
                      </span>
                      {email && (
                        <span style={styles.memberEmail}>
                          {String(email).replace('mailto:', '')}
                        </span>
                      )}
                    </div>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeMember(memberId)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>
            Your Personas ({nonMemberPersonas.length})
          </h4>
          {nonMemberPersonas.length === 0 ? (
            <div style={styles.empty}>
              {personaIds.length === 0
                ? 'No personas. Create personas in the Personas tab.'
                : 'All your personas are already members.'}
            </div>
          ) : (
            <div style={styles.list}>
              {nonMemberPersonas.map((personaId) => {
                const persona = personas[personaId];
                const name = persona ? (persona[FOAF.name] as string) || '(unnamed)' : personaId;
                const email = persona?.[VCARD.hasEmail] as string | undefined;
                return (
                  <div key={personaId} style={styles.memberItem}>
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>🪪 {name}</span>
                      {email && (
                        <span style={styles.memberEmail}>
                          {String(email).replace('mailto:', '')}
                        </span>
                      )}
                    </div>
                    <button
                      style={styles.addBtn}
                      onClick={() => addMember(personaId)}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>
            Contacts ({nonMemberContacts.length})
          </h4>
          {nonMemberContacts.length === 0 ? (
            <div style={styles.empty}>
              {contactIds.length === 0
                ? 'No contacts. Add contacts in the Contacts tab.'
                : 'All contacts are already members.'}
            </div>
          ) : (
            <div style={styles.list}>
              {nonMemberContacts.map((contactId) => {
                const contact = contacts[contactId];
                const name = contact
                  ? (contact[VCARD.fn] as string) || '(unnamed)'
                  : contactId;
                const email = contact?.[VCARD.hasEmail] as string | undefined;

                return (
                  <div key={contactId} style={styles.memberItem}>
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>👤 {name}</span>
                      {email && (
                        <span style={styles.memberEmail}>
                          {String(email).replace('mailto:', '')}
                        </span>
                      )}
                    </div>
                    <button
                      style={styles.addBtn}
                      onClick={() => addMember(contactId)}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button style={styles.closeBtn} onClick={onClose}>
            Done
          </button>
        </div>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  empty: {
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: 6,
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 200,
    overflow: 'auto',
  },
  memberItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: 6,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: 500,
  },
  personaBadge: {
    marginLeft: 6,
    fontSize: 11,
    color: '#666',
    fontWeight: 400,
  },
  memberEmail: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  addBtn: {
    padding: '4px 12px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  },
  removeBtn: {
    padding: '4px 12px',
    background: '#fff',
    color: '#e74c3c',
    border: '1px solid #e74c3c',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  closeBtn: {
    padding: '10px 24px',
    borderRadius: 6,
    border: 'none',
    background: '#0070f3',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
};

export default MembershipManager;
