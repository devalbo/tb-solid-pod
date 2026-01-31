import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { createStore, createIndexes, Store, Indexes } from 'tinybase';
import { createLocalPersister, LocalPersister } from 'tinybase/persisters/persister-browser';
import { Provider, useRow, useSliceRowIds } from 'tinybase/ui-react';
import {
  copyStoreToClipboard,
  downloadStoreAsJson,
  importStoreFromJson,
  readFileAsText,
} from './utils/storeExport';
import { initializeDefaultTypeRegistrations } from './utils/typeIndex';
import { VirtualPod, type ResourceRow } from './virtualPod';
import { CliTerminal } from './cli';
import PersonaList from './components/PersonaList';
import PersonaForm from './components/PersonaForm';
import ContactList from './components/ContactList';
import ContactForm from './components/ContactForm';
import GroupList from './components/GroupList';
import GroupForm from './components/GroupForm';
import MembershipManager from './components/MembershipManager';
import FileMetadataPanel from './components/FileMetadataPanel';
import { DemoFooter } from './components/DemoFooter';

const DEFAULT_PERSONA_KEY = 'defaultPersonaId';
const AGENT_HINT_HIDDEN_KEY = 'agentHintHidden';

const STORAGE_KEY = 'tb-solid-pod';
const BASE_URL = 'https://myapp.com/pod/';
const DISPLAY_BASE_URL = 'tb://local/';
const LAYOUT_PADDING_LEFT = 24;
// Explorer sizing (kept separate from the file viewer).
const EXPLORER_WIDTH = 420;
const EXPLORER_CONTROLS_WIDTH = 140;
const EXPLORER_CONTROLS_GAP = 12;

/** Base URL for static assets (e.g. '' in dev, '/tb-solid-pod/' on GitHub Pages). */
function getAssetBase(): string {
  const m = import.meta as { env?: { BASE_URL?: string } };
  return m.env?.BASE_URL ?? '';
}

type AppView = 'files' | 'terminal' | 'personas' | 'contacts' | 'groups' | 'schemas';

const VIEW_LABELS: Record<AppView, string> = {
  files: 'File Browser',
  personas: 'Personas',
  contacts: 'Contacts',
  groups: 'Groups',
  schemas: 'Schemas',
  terminal: 'Terminal',
};

// “Data” menu = core data types you browse/manage in the UI.
// Keep “Schemas” and “Terminal” as top-level tools.
const VIEW_MENU_VIEWS: AppView[] = ['files', 'personas', 'contacts', 'groups'];

type DropdownItem = {
  id: string;
  label: string;
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
};

type Breadcrumb = {
  label: string;
  url: string;
  isCurrent: boolean;
};

function toDisplayUrl(baseUrl: string, displayBaseUrl: string, currentUrl: string): string {
  try {
    const baseStr = new URL(baseUrl).toString();
    const curStr = new URL(currentUrl).toString();
    if (!curStr.startsWith(baseStr)) return curStr;
    return displayBaseUrl + curStr.slice(baseStr.length);
  } catch {
    return currentUrl;
  }
}

function toDisplayPath(baseUrl: string, displayBaseUrl: string, currentUrl: string): string {
  const u = toDisplayUrl(baseUrl, displayBaseUrl, currentUrl);
  // For compact headers, strip scheme/host and show path-ish part.
  if (u.startsWith(displayBaseUrl)) {
    const rel = u.slice(displayBaseUrl.length);
    return '/' + rel;
  }
  return u;
}

function getBreadcrumbs(baseUrl: string, displayBaseUrl: string, currentUrl: string): Breadcrumb[] {
  try {
    // Normalize and compute a relative path from baseUrl.
    const base = new URL(baseUrl);
    const cur = new URL(currentUrl);
    const baseStr = base.toString();
    const curStr = cur.toString();

    const isUnderBase = curStr.startsWith(baseStr);
    const rel = isUnderBase ? curStr.slice(baseStr.length) : `${cur.pathname}${cur.search}${cur.hash}`.replace(/^\//, '');

    const isContainer = curStr.endsWith('/');
    const parts = rel.split('/').filter(Boolean);

    const crumbs: Breadcrumb[] = [{ label: displayBaseUrl.replace(/\/$/, ''), url: baseStr, isCurrent: parts.length === 0 }];

    let acc = baseStr;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const seg = parts[i]!;
      // Containers always end in '/', files do not. We don't know which intermediate segments are containers,
      // but for this virtual pod UI, path segments are navigable as containers.
      const nextUrl = acc + seg + (isLast ? (isContainer ? '/' : '') : '/');
      crumbs.push({ label: seg, url: nextUrl, isCurrent: isLast });
      acc = acc + seg + '/';
    }

    return crumbs;
  } catch {
    return [{ label: 'Pod', url: baseUrl, isCurrent: true }];
  }
}

function DropdownMenu(props: {
  label: string;
  items: DropdownItem[];
  buttonStyle: CSSProperties;
  menuStyle: CSSProperties;
  itemStyle: CSSProperties;
  itemActiveStyle?: CSSProperties;
  itemDisabledStyle?: CSSProperties;
  menuAlign?: 'left' | 'right';
}): React.ReactElement {
  const { label, items, buttonStyle, menuStyle, itemStyle, itemActiveStyle, itemDisabledStyle, menuAlign } = props;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={styles.menuWrap}>
      <button
        type="button"
        style={buttonStyle}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <span style={styles.menuChevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            ...menuStyle,
            ...(menuAlign === 'right' ? { left: 'auto', right: 0 } : { left: 0, right: 'auto' }),
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              style={{
                ...itemStyle,
                ...(it.active ? itemActiveStyle : null),
                ...(it.disabled ? itemDisabledStyle : null),
              }}
              onClick={() => {
                if (it.disabled) return;
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Metadata for the Schemas view: descriptions and Solid doc links
const SCHEMA_META: Array<{ file: string; name: string; description: string; fields: string[]; solidHref?: string }> = [
  { file: 'iri.json', name: 'IRI', description: 'Internationalized Resource Identifier (URI). Used for @id, URLs, and vocabulary terms.', fields: [], solidHref: 'https://solidproject.org/TR/protocol' },
  { file: 'node-ref.json', name: 'NodeRef', description: 'A reference to another JSON-LD node by its @id. Used for linking resources (e.g. author, type index).', fields: ['@id'], solidHref: 'https://www.w3.org/TR/json-ld/' },
  { file: 'typed-literal.json', name: 'TypedLiteral', description: 'RDF literal with optional @value, @type (datatype), or @language.', fields: ['@value', '@type', '@language'], solidHref: 'https://www.w3.org/TR/json-ld/' },
  { file: 'json-ld-base.json', name: 'JsonLdBase', description: 'Base schema for JSON-LD documents: optional @id and @type. All pod documents extend this.', fields: ['@id', '@type'], solidHref: 'https://www.w3.org/TR/json-ld/' },
  { file: 'persona-input.json', name: 'Persona (input)', description: 'Input for creating a persona: display name, email, nickname, bio, homepage, WebID-style links (inbox, type index, preferences).', fields: ['name', 'email', 'nickname', 'bio', 'homepage', 'publicTypeIndex', 'privateTypeIndex'], solidHref: 'https://solid.github.io/webid-profile/' },
  { file: 'persona.json', name: 'Persona', description: 'A user identity (WebID profile): foaf:Person with vCard/FOAF properties, optional OIDC issuer, type indexes, inbox.', fields: ['foaf:name', 'vcard:hasEmail', 'solid:publicTypeIndex', 'solid:privateTypeIndex', 'ldp:inbox'], solidHref: 'https://solid.github.io/webid-profile/' },
  { file: 'contact.json', name: 'Contact', description: 'A contact (person or agent) in the address book: vcard:Individual with name, email, phone, organization, foaf:knows.', fields: ['vcard:fn', 'vcard:hasEmail', 'vcard:hasTelephone', 'vcard:hasOrganizationName', 'foaf:knows'], solidHref: 'https://www.w3.org/TR/vcard-rdf/' },
  { file: 'contact-input.json', name: 'Contact (input)', description: 'Input for creating a contact: name, email, nickname, type (person or agent), optional organization and role.', fields: ['name', 'email', 'nickname', 'isAgent', 'organization', 'role'], solidHref: 'https://www.w3.org/TR/vcard-rdf/' },
  { file: 'address-book.json', name: 'AddressBook', description: 'An address book container: vcard:AddressBook with title and optional name/email index.', fields: ['dcterms:title', 'vcard:nameEmailIndex'], solidHref: 'https://www.w3.org/TR/vcard-rdf/' },
  { file: 'agent-contact.json', name: 'Agent contact', description: 'A software agent or bot contact: Contact with schema:SoftwareApplication, optional category and URL.', fields: ['schema:applicationCategory', 'schema:url'], solidHref: 'https://schema.org/SoftwareApplication' },
  { file: 'group.json', name: 'Group', description: 'A group, team, or organization: vcard/org vocabulary, optional hierarchy (unitOf, hasUnit), members and memberships.', fields: ['vcard:fn', 'org:hasMembership', 'org:unitOf', 'vcard:hasMember'], solidHref: 'http://www.w3.org/ns/org#' },
  { file: 'group-input.json', name: 'Group (input)', description: 'Input for creating a group: name, type (organization / team / group), description, URL, logo.', fields: ['name', 'groupType', 'description', 'url', 'logo'], solidHref: 'http://www.w3.org/ns/org#' },
  { file: 'membership.json', name: 'Membership', description: 'A membership with role and optional time interval: org:Membership, org:member, org:role, time:Interval.', fields: ['org:member', 'org:role', 'org:memberDuring'], solidHref: 'http://www.w3.org/ns/org#' },
  { file: 'membership-input.json', name: 'Membership (input)', description: 'Input for adding a member to a group: contact ID, optional role ID and time interval.', fields: ['contactId', 'roleId', 'start', 'end'], solidHref: 'http://www.w3.org/ns/org#' },
  { file: 'file-metadata.json', name: 'File metadata', description: 'Metadata for a non-RDF file: ldp:NonRDFSource with title, format (MIME), size, timestamps, optional author and ACL.', fields: ['dcterms:title', 'dcterms:format', 'posix:size', 'dcterms:created', 'dcterms:modified'], solidHref: 'https://www.w3.org/TR/ldp/' },
  { file: 'file-input.json', name: 'File (input)', description: 'Input for creating file metadata: name, MIME type, size, optional description and author.', fields: ['name', 'mimeType', 'size', 'description', 'authorId'], solidHref: 'https://www.w3.org/TR/ldp/' },
  { file: 'container.json', name: 'Container', description: 'An LDP Container (folder): ldp:Container or ldp:BasicContainer with title, description, ldp:contains.', fields: ['ldp:contains', 'dcterms:title', 'dcterms:description'], solidHref: 'https://www.w3.org/TR/ldp/' },
  { file: 'container-input.json', name: 'Container (input)', description: 'Input for creating a container: name, optional description.', fields: ['name', 'description'], solidHref: 'https://www.w3.org/TR/ldp/' },
  { file: 'preferences.json', name: 'Preferences', description: 'Solid preferences document: typically holds private type index and app preferences; linked from WebID via pim:preferencesFile.', fields: ['solid:privateTypeIndex'], solidHref: 'https://solid.github.io/webid-profile/#private-preferences' },
  { file: 'type-registration.json', name: 'Type registration', description: 'A type registration maps an RDF class to instance(s) or instance container: solid:TypeRegistration, solid:forClass, solid:instance / solid:instanceContainer.', fields: ['solid:forClass', 'solid:instance', 'solid:instanceContainer'], solidHref: 'https://solid.github.io/type-indexes/' },
  { file: 'type-index.json', name: 'Type index', description: 'A type index document listing type registrations: solid:TypeIndex, solid:ListedDocument or solid:UnlistedDocument.', fields: ['solid:TypeIndex'], solidHref: 'https://solid.github.io/type-indexes/' },
  { file: 'type-registration-input.json', name: 'Type registration (input)', description: 'Input for creating a type registration: forClass IRI, instance or instanceContainer URL(s), index type (public/private).', fields: ['forClass', 'instance', 'instanceContainer', 'indexType'], solidHref: 'https://solid.github.io/type-indexes/' },
  { file: 'type-index-row.json', name: 'Type index row', description: 'Internal row for the type index table: forClass, indexType, instance (string or JSON array), instanceContainer.', fields: ['forClass', 'indexType', 'instance', 'instanceContainer'], solidHref: 'https://solid.github.io/type-indexes/' },
];

const getDefaultContent = (): [Record<string, Record<string, Record<string, unknown>>>, Record<string, unknown>] => [
  { resources: { [BASE_URL]: { type: 'Container', contentType: 'text/turtle', updated: new Date().toISOString() } } },
  {}
];

// ==========================================
// RANDOM DEMO DATA (for "Add random" buttons)
// ==========================================
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPersonaFormValues(): Record<string, string> {
  const first = pick(['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Quinn', 'Avery']);
  const last = pick(['Smith', 'Chen', 'Williams', 'Brown', 'Lee', 'Jones', 'Garcia']);
  const name = `${first} ${last}`;
  const nick = pick([first.toLowerCase(), `${first}${last.slice(0, 1)}`.toLowerCase(), `${first}_${last}`.toLowerCase()]);
  return {
    name,
    nickname: nick,
    givenName: first,
    familyName: last,
    email: `${nick}@example.com`,
    phone: `+1-555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
    bio: pick(['Developer and designer.', 'Works on the Solid ecosystem.', 'Building for the decentralized web.']),
    homepage: `https://${nick}.example.com`,
    image: '',
    oidcIssuer: '',
    inbox: '',
    preferencesFile: '',
    publicTypeIndex: '',
    privateTypeIndex: '',
  };
}

function getRandomContactFormValues(): Record<string, string | boolean> {
  const first = pick(['Jamie', 'Taylor', 'Robin', 'Drew', 'Skyler', 'Parker']);
  const last = pick(['Miller', 'Davis', 'Wilson', 'Martinez', 'Anderson']);
  const name = `${first} ${last}`;
  const nick = first.toLowerCase();
  const isAgent = Math.random() > 0.7;
  return {
    name,
    nickname: nick,
    email: `${nick}@company.com`,
    phone: `+1-555-${Math.floor(200 + Math.random() * 800)}-${Math.floor(1000 + Math.random() * 9000)}`,
    url: `https://${nick}.company.com`,
    photo: '',
    notes: pick(['Met at conference.', 'Collaborator on project X.', '']),
    organization: pick(['Acme Inc', 'Tech Corp', 'Solid Labs', '']),
    role: pick(['Engineer', 'Designer', 'PM', '']),
    webId: '',
    isAgent,
    agentCategory: isAgent ? pick(['DeveloperApplication', 'SocialNetworking', 'Utilities']) : '',
  };
}

type GroupType = 'group' | 'organization' | 'team';
function getRandomGroupFormValues(): Record<string, string> {
  const adj = pick(['Core', 'Product', 'Platform', 'Research', 'Community']);
  const noun = pick(['Team', 'Squad', 'Group', 'Org', 'Circle']);
  const name = `${adj} ${noun}`;
  const type: GroupType = pick(['group', 'organization', 'team']);
  return {
    name,
    type,
    description: pick([`The ${name} works on key initiatives.`, `Internal ${type}.`, '']),
    url: `https://${name.toLowerCase().replace(/\s+/g, '-')}.company.com`,
    logo: '',
  };
}

// ==========================================
// MIME & IMAGE HELPERS
// ==========================================
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const isImageContentType = (ct: string | undefined): boolean =>
  ct != null && (IMAGE_MIMES.includes(ct) || ct.startsWith('image/'));

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
      resolve(base64);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

// ==========================================
// Types
// ==========================================
// ==========================================
// 1. THE FRONTEND (Widgets)
// ==========================================

interface FileBrowserProps {
  url: string;
  onNavigate: (url: string) => void;
  parentUrl?: string;
  onNavigateUp?: () => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({ url, onNavigate, parentUrl, onNavigateUp }) => {
  const children = useSliceRowIds('byParent', url);
  const isRoot = !parentUrl;

  return (
    <div style={styles.card}>
      <h3 style={styles.header}>
        <button
          style={{ ...styles.upBtn, ...(isRoot ? styles.upBtnDisabled : {}) }}
          onClick={onNavigateUp}
          disabled={isRoot}
          title={isRoot ? 'At root' : 'Go up'}
        >
          ↑
        </button>
        📂 {toDisplayPath(BASE_URL, DISPLAY_BASE_URL, url)}
      </h3>
      <div style={styles.list}>
        {children.length === 0 && <i style={{color: '#888'}}>Empty Folder</i>}
        {children.map(childUrl => (
          <FileItem key={childUrl} url={childUrl} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
};

interface FileItemProps {
  url: string;
  onNavigate: (url: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ url, onNavigate }) => {
  const row = useRow('resources', url) as ResourceRow;
  const isDir = row?.type === 'Container';
  const name = url.split('/').filter(Boolean).pop();

  return (
    <div
      onClick={() => onNavigate(url)}
      style={{...styles.item, fontWeight: isDir ? 'bold' : 'normal'}}
    >
      <span style={{marginRight: 8}}>{isDir ? '📁' : '📄'}</span>
      {name}
    </div>
  );
};

interface TextEditorProps {
  url: string;
  pod: VirtualPod;
  inline?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({ url, pod, inline }) => {
  const row = useRow('resources', url) as ResourceRow;
  const [text, setText] = useState(row?.body || '');
  const contentType = row?.contentType || 'text/plain';

  const save = () => {
    pod.handleRequest(url, {
      method: 'PUT',
      body: text,
      headers: { 'Content-Type': contentType }
    });
    alert("Saved!");
  };

  const inner = (
    <>
      <textarea
        style={styles.textarea}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div style={{textAlign: 'right'}}>
        <button style={styles.btn} onClick={save}>Save Changes</button>
      </div>
    </>
  );

  if (inline) return <div style={styles.tabContent}>{inner}</div>;
  return (
    <div style={styles.card}>
      <h3 style={styles.header}>📝 Editing: {url.split('/').pop()}</h3>
      {inner}
    </div>
  );
};

interface ImageViewerProps {
  url: string;
  pod: VirtualPod;
  inline?: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, pod, inline }) => {
  const row = useRow('resources', url) as ResourceRow;
  const inputRef = useRef<HTMLInputElement>(null);
  const contentType = row?.contentType || 'image/png';
  const body = row?.body;
  const dataUrl = body != null && body !== '' ? `data:${contentType};base64,${body}` : null;

  const replaceImage = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const base64 = await readFileAsBase64(file);
      pod.handleRequest(url, {
        method: 'PUT',
        body: base64,
        headers: { 'Content-Type': file.type }
      });
    } catch {
      alert('Failed to replace image');
    }
    e.target.value = '';
  };

  const inner = (
    <>
      <div style={styles.imagePreviewWrap}>
        {dataUrl ? (
          <img src={dataUrl} alt="" style={styles.imagePreview} />
        ) : (
          <div style={styles.imagePlaceholder}>No image data</div>
        )}
      </div>
      <input type="file" ref={inputRef} accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
      <div style={{ textAlign: 'right' }}>
        <button style={styles.btn} onClick={replaceImage}>Replace image</button>
      </div>
    </>
  );

  if (inline) return <div style={styles.tabContent}>{inner}</div>;
  return (
    <div style={styles.card}>
      <h3 style={styles.header}>🖼 {url.split('/').pop()}</h3>
      {inner}
    </div>
  );
};

interface FileViewContentProps {
  url: string;
  row: ResourceRow;
}

const FileViewContent: React.FC<FileViewContentProps> = ({ url, row }) => {
  const name = url ? url.split('/').filter(Boolean).pop() : '';
  const body = row?.body;
  const contentType = row?.contentType;
  const isImage = isImageContentType(contentType);
  const dataUrl = isImage && body != null && body !== '' ? `data:${contentType};base64,${body}` : null;

  return (
    <div style={styles.tabContent}>
      <div style={styles.sidePanelMeta}>
        {name && <span style={styles.sidePanelName}>{name}</span>}
        {contentType && <span style={styles.sidePanelType}>{contentType}</span>}
      </div>
      {isImage ? (
        dataUrl ? <img src={dataUrl} alt="" style={styles.sidePanelImage} /> : <div style={styles.sidePanelEmpty}>(empty)</div>
      ) : (
        <pre style={styles.sidePanelPre}>
          {body != null && body !== '' ? body : '(empty)'}
        </pre>
      )}
    </div>
  );
};

interface FileViewTabsProps {
  url: string;
  row: ResourceRow;
  pod: VirtualPod;
  store: Store;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const FileViewTabs: React.FC<FileViewTabsProps> = ({ url, row, pod, store, activeTab, onTabChange }) => {
  const isImage = isImageContentType(row?.contentType);

  return (
    <div style={styles.card}>
      <div style={styles.tabBar}>
        <button type="button" style={{ ...styles.tabBtn, ...(activeTab === 'view' ? styles.tabBtnActive : {}) }} onClick={() => onTabChange('view')}>View</button>
        <button type="button" style={{ ...styles.tabBtn, ...(activeTab === 'edit' ? styles.tabBtnActive : {}) }} onClick={() => onTabChange('edit')}>Edit</button>
        <button type="button" style={{ ...styles.tabBtn, ...(activeTab === 'metadata' ? styles.tabBtnActive : {}) }} onClick={() => onTabChange('metadata')}>Metadata</button>
      </div>
      {activeTab === 'view' ? (
        <FileViewContent url={url} row={row} />
      ) : activeTab === 'edit' ? (
        isImage ? (
          <ImageViewer url={url} pod={pod} inline />
        ) : (
          <TextEditor url={url} pod={pod} inline />
        )
      ) : (
        <FileMetadataPanel store={store} url={url} />
      )}
    </div>
  );
};

// ==========================================
// 3. THE APP SHELL
// ==========================================

interface AppState {
  store: Store | null;
  indexes: Indexes | null;
  pod: VirtualPod | null;
  ready: boolean;
}

export default function App() {
  const [app, setApp] = useState<AppState>({ store: null, indexes: null, pod: null, ready: false });

  const persisterRef = useRef<LocalPersister | null>(null);
  useEffect(() => {
    (async () => {
      const s = createStore();
      const i = createIndexes(s);
      const p = new VirtualPod(s, i, BASE_URL);
      const persister = createLocalPersister(s, STORAGE_KEY);
      persisterRef.current = persister;
      await persister.load(getDefaultContent() as Parameters<LocalPersister['load']>[0]);
      initializeDefaultTypeRegistrations(s, BASE_URL);
      await persister.startAutoSave();
      setApp({ store: s, indexes: i, pod: p, ready: true });
    })();
    return () => { persisterRef.current?.destroy?.(); };
  }, []);

  const { store, indexes, pod, ready } = app;

  const [currentUrl, setCurrentUrl] = useState(BASE_URL);
  const [fileTab, setFileTab] = useState('view');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const uploadImageInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<'success' | 'error' | null>(null);
  const [activeView, setActiveView] = useState<AppView>(() =>
    (typeof window !== 'undefined' && window.location.hash === '#schemas') ? 'schemas' : 'files'
  );
  const [agentHintHidden, setAgentHintHidden] = useState(false);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#schemas') setActiveView('schemas');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>();
  const [personaFormOpen, setPersonaFormOpen] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | undefined>();
  const [personaFormInitial, setPersonaFormInitial] = useState<Record<string, string> | undefined>();
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>();
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | undefined>();
  const [contactFormInitial, setContactFormInitial] = useState<Record<string, string | boolean> | undefined>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>();
  const [groupFormInitial, setGroupFormInitial] = useState<Record<string, string> | undefined>();
  const [managingMembersGroupId, setManagingMembersGroupId] = useState<string | undefined>();
  const [explainerExpanded, setExplainerExpanded] = useState(false);

  const row = useRow('resources', currentUrl, store ?? undefined) as ResourceRow | undefined;
  const isContainer = row?.type === 'Container';
  const parentUrl = row?.parentId;

  // Persisted preference (via TinyBase LocalStorage persister).
  // Keep this in React state so the agent hint bar can be hidden "permanently".
  useEffect(() => {
    if (!store) return;
    const hidden = (store.getValue(AGENT_HINT_HIDDEN_KEY) as boolean | undefined) === true;
    setAgentHintHidden(hidden);
    if (hidden) setExplainerExpanded(false);
  }, [store]);

  const openNewFileDialog = () => {
    setNewFileName('');
    setNewFileContent('');
    setNewFileOpen(true);
  };

  const closeNewFileDialog = () => {
    setNewFileOpen(false);
    setNewFileName('');
    setNewFileContent('');
  };

  const submitNewFile = () => {
    const name = newFileName.trim();
    if (!name || !pod) return;
    pod.handleRequest(`${currentUrl}${name}`, {
      method: 'PUT',
      body: newFileContent || '',
      headers: { 'Content-Type': 'text/plain' }
    });
    closeNewFileDialog();
  };

  const onUploadImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || !pod) return;
    try {
      const base64 = await readFileAsBase64(file);
      const name = file.name;
      pod.handleRequest(`${currentUrl}${name}`, {
        method: 'PUT',
        body: base64,
        headers: { 'Content-Type': file.type }
      });
    } catch {
      alert('Failed to upload image');
    }
    e.target.value = '';
  };

  const createNote = () => openNewFileDialog();

  const handleCopyToClipboard = async () => {
    if (!store) return;
    const success = await copyStoreToClipboard(store);
    setCopyStatus(success ? 'success' : 'error');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDownload = () => {
    if (!store) return;
    downloadStoreAsJson(store);
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;
    try {
      const json = await readFileAsText(file);
      const result = importStoreFromJson(store, json, { merge: false });
      if (result.success) {
        alert('Import successful!');
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch {
      alert('Failed to read file');
    }
    e.target.value = '';
  };

  if (!ready || !store || !indexes || !pod) {
    return <div style={styles.loading}>Loading…</div>;
  }

  const createFolder = () => {
    const name = prompt("Folder Name (e.g., notes):");
    if (name) {
      pod.handleRequest(`${currentUrl}${name}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' }
      });
    }
  };

  return (
    <Provider store={store} indexes={indexes}>
      <div style={styles.app}>
        {/* Top Navigation Bar */}
        <div style={styles.topNav}>
          <div style={styles.topNavLeft}>
            <div style={styles.topNavBrand}>
              <div style={styles.topNavTitle}>tb-solid-pod</div>
              <div style={styles.topNavSubtitle}>TinyBase-powered Solid-style pod (demo)</div>
            </div>
            <DropdownMenu
              label={VIEW_MENU_VIEWS.includes(activeView) ? `Data: ${VIEW_LABELS[activeView]}` : 'Data'}
              items={VIEW_MENU_VIEWS.map((v) => ({
                id: v,
                label: VIEW_LABELS[v],
                active: v === activeView,
                onSelect: () => setActiveView(v),
              }))}
              buttonStyle={styles.navMenuBtn}
              menuStyle={styles.menuPanel}
              itemStyle={styles.menuItem}
              itemActiveStyle={styles.menuItemActive}
              itemDisabledStyle={styles.menuItemDisabled}
            />
            <button
              type="button"
              style={{ ...styles.navTopBtn, ...(activeView === 'schemas' ? styles.navTopBtnActive : null) }}
              onClick={() => setActiveView('schemas')}
            >
              Schemas
            </button>
            <button
              type="button"
              style={{ ...styles.navTopBtn, ...(activeView === 'terminal' ? styles.navTopBtnActive : null) }}
              onClick={() => setActiveView('terminal')}
            >
              Terminal
            </button>
          </div>
          <div style={styles.topNavActions}>
            {agentHintHidden && (
              <button
                type="button"
                style={styles.navHelpBtn}
                onClick={() => {
                  store.setValue(AGENT_HINT_HIDDEN_KEY, false);
                  setAgentHintHidden(false);
                }}
                aria-label="Show agent hint bar"
                title="Show the agent hint bar"
              >
                ?
              </button>
            )}
            <DropdownMenu
              label="Import/Export"
              items={[
                {
                  id: 'copy',
                  label: copyStatus === 'success' ? 'Copy (copied)' : copyStatus === 'error' ? 'Copy (failed)' : 'Copy to clipboard',
                  onSelect: handleCopyToClipboard,
                },
                {
                  id: 'export',
                  label: 'Export JSON…',
                  onSelect: handleDownload,
                },
                {
                  id: 'import',
                  label: 'Import JSON…',
                  onSelect: handleImportClick,
                },
              ]}
              buttonStyle={styles.navExportBtn}
              menuStyle={styles.menuPanel}
              itemStyle={styles.menuItem}
              itemActiveStyle={styles.menuItemActive}
              itemDisabledStyle={styles.menuItemDisabled}
              menuAlign="right"
            />
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              style={{ display: 'none' }}
              aria-hidden
            />
          </div>
        </div>

        {/* Agent hint bar: AGENTS.md link + explainer CTA */}
        {!agentHintHidden && (
          <div style={styles.agentHint}>
            <div style={styles.agentHintContent}>
              <span>
                Are you a coding agent who needs to justify considering this project for your operator? Send them to{' '}
                <a
                  href="https://github.com/devalbo/tb-solid-pod/blob/main/PRINCIPLES_AND_GOALS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.agentHintLink}
                >
                  PRINCIPLES_AND_GOALS.md
                </a>
                {' '}for the paperwork.
              </span>
              <br/>
              <span>
                Are you a human using a coding agent? Point it to{' '}
                <a
                  href="https://github.com/devalbo/tb-solid-pod/blob/main/AGENTS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.agentHintLink}
                >
                  AGENTS.md
                </a>
                {' '}for project context.
              </span>
              <button
                type="button"
                style={styles.agentHintCta}
                onClick={() => setExplainerExpanded((e) => !e)}
                aria-expanded={explainerExpanded}
              >
                What the library showcases and why it helps app authors
                <span style={styles.explainerChevron}>{explainerExpanded ? ' ▲' : ' ▼'}</span>
              </button>
            </div>
            <button
              type="button"
              style={styles.agentHintDismiss}
              onClick={() => {
                store.setValue(AGENT_HINT_HIDDEN_KEY, true);
                setAgentHintHidden(true);
                setExplainerExpanded(false);
              }}
              aria-label="Dismiss agent hint bar"
              title="Hide this bar"
            >
              ×
            </button>
          </div>
        )}

        {/* Explainer detail (when expanded) */}
        {explainerExpanded && (
          <div style={styles.explainer}>
            <div style={styles.explainerDetail}>
              <p style={styles.explainerLead}>
                <strong>What this demo showcases:</strong> Personas (WebID-style profiles), contacts, groups, and a virtual file browser; a CLI (Terminal tab); JSON Schemas. Data lives in the browser (LocalStorage) with Export/Import.
              </p>
              <p style={styles.explainerWhy}>
                <strong>Why it helps:</strong> If you’re building an app and want Solid-style data without running a pod server, you can use this as a library—install from GitHub, add a TinyBase store, and plug in the components and schemas. You get a ready-made data model (Zod + TypeScript + JSON Schema), so you can focus on your UI and optional sync later. See the <a href="https://github.com/devalbo/tb-solid-pod/blob/main/README.md" target="_blank" rel="noopener noreferrer" style={styles.explainerLink}>README</a> and <a href="https://github.com/devalbo/tb-solid-pod/blob/main/docs/INTEGRATION_GUIDE.md" target="_blank" rel="noopener noreferrer" style={styles.explainerLink}>Integration Guide</a> for details.
              </p>
            </div>
          </div>
        )}

        {/* File Browser View */}
        {activeView === 'files' && (
          <div style={styles.dataViewContainer}>
            {/* New File dialog */}
            {newFileOpen && (
              <div style={styles.dialogOverlay} onClick={closeNewFileDialog}>
                <div style={styles.dialog} onClick={e => e.stopPropagation()}>
                  <h3 style={styles.dialogTitle}>New File</h3>
                  <label style={styles.dialogLabel}>Filename</label>
                  <input
                    type="text"
                    placeholder="e.g. hello.txt"
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    style={styles.dialogInput}
                    autoFocus
                  />
                  <label style={styles.dialogLabel}>Initial content (optional)</label>
                  <textarea
                    placeholder="Write your note here..."
                    value={newFileContent}
                    onChange={e => setNewFileContent(e.target.value)}
                    style={styles.dialogTextarea}
                  />
                  <div style={styles.dialogActions}>
                    <button style={styles.dialogBtnCancel} onClick={closeNewFileDialog}>Cancel</button>
                    <button style={{ ...styles.dialogBtnSubmit, ...(!newFileName.trim() ? styles.dialogBtnSubmitDisabled : {}) }} onClick={submitNewFile} disabled={!newFileName.trim()}>Create</button>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.dataHeader}>
              {/* Align breadcrumbs with explorer (not the controls column). */}
              <div style={styles.breadcrumbSpacer} aria-hidden />
              <nav
                aria-label="Breadcrumb"
                style={styles.breadcrumbBar}
                title={toDisplayUrl(BASE_URL, DISPLAY_BASE_URL, currentUrl)}
              >
                {getBreadcrumbs(BASE_URL, DISPLAY_BASE_URL, currentUrl).map((c, idx, arr) => (
                  <React.Fragment key={c.url}>
                    {c.isCurrent ? (
                      <span style={styles.breadcrumbCurrent}>{c.label}</span>
                    ) : (
                      <button
                        type="button"
                        style={styles.breadcrumbBtn}
                        onClick={() => setCurrentUrl(c.url)}
                      >
                        {c.label}
                      </button>
                    )}
                    {idx < arr.length - 1 && <span style={styles.breadcrumbSep}>/</span>}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div style={styles.mainLayout}>
              <div style={styles.explorerWrap}>
                <div style={styles.explorerControls}>
                  <button style={styles.explorerControlBtn} onClick={createNote}>+ New File</button>
                  <button
                    type="button"
                    style={styles.explorerControlBtn}
                    onClick={() => uploadImageInputRef.current?.click()}
                  >
                    + Upload Image
                  </button>
                  <input
                    ref={uploadImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onUploadImageSelect}
                    style={{ display: 'none' }}
                    aria-hidden
                  />
                  <button style={styles.explorerControlBtn} onClick={createFolder}>+ New Folder</button>
                </div>
                <div style={styles.navColumn}>
                  <FileBrowser
                        url={isContainer ? currentUrl : (parentUrl ?? BASE_URL)}
                    onNavigate={setCurrentUrl}
                    parentUrl={parentUrl}
                    onNavigateUp={parentUrl ? () => setCurrentUrl(parentUrl) : undefined}
                  />
                </div>
              </div>
              <div style={styles.mainContent}>
                {!row ? (
                  <div style={styles.error}>404 Not Found</div>
                ) : !isContainer ? (
                  <FileViewTabs url={currentUrl} row={row} pod={pod} store={store} activeTab={fileTab} onTabChange={setFileTab} />
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Personas View */}
        {activeView === 'personas' && (
          <div style={styles.personasViewContainer}>
            <PersonaList
              store={store}
              selectedId={selectedPersonaId}
              onSelect={setSelectedPersonaId}
              onEdit={(id) => {
                setEditingPersonaId(id);
                setPersonaFormOpen(true);
              }}
              onDelete={(id) => {
                store.delRow('personas', id);
                if (selectedPersonaId === id) {
                  setSelectedPersonaId(undefined);
                }
                // If this was the default, set a new default
                const defaultId = store.getValue(DEFAULT_PERSONA_KEY) as string | undefined;
                if (defaultId === id) {
                  store.delValue(DEFAULT_PERSONA_KEY);
                  const remaining = store.getTable('personas') || {};
                  const remainingIds = Object.keys(remaining);
                  if (remainingIds.length > 0) {
                    store.setValue(DEFAULT_PERSONA_KEY, remainingIds[0]);
                  }
                }
              }}
              onSetDefault={(id) => {
                store.setValue(DEFAULT_PERSONA_KEY, id);
              }}
              onCreate={() => {
                setEditingPersonaId(undefined);
                setPersonaFormInitial(undefined);
                setPersonaFormOpen(true);
              }}
              onCreateRandom={() => {
                setEditingPersonaId(undefined);
                setPersonaFormInitial(getRandomPersonaFormValues());
                setPersonaFormOpen(true);
              }}
            />
            {personaFormOpen && (
              <PersonaForm
                store={store}
                baseUrl={BASE_URL}
                personaId={editingPersonaId}
                initialValues={personaFormInitial}
                onSave={() => {
                  setPersonaFormOpen(false);
                  setEditingPersonaId(undefined);
                  setPersonaFormInitial(undefined);
                }}
                onCancel={() => {
                  setPersonaFormOpen(false);
                  setEditingPersonaId(undefined);
                  setPersonaFormInitial(undefined);
                }}
              />
            )}
          </div>
        )}

        {/* Contacts View */}
        {activeView === 'contacts' && (
          <div style={styles.contactsViewContainer}>
            <ContactList
              store={store}
              selectedId={selectedContactId}
              onSelect={setSelectedContactId}
              onEdit={(id) => {
                setEditingContactId(id);
                setContactFormOpen(true);
              }}
              onDelete={(id) => {
                store.delRow('contacts', id);
                if (selectedContactId === id) {
                  setSelectedContactId(undefined);
                }
              }}
              onCreate={() => {
                setEditingContactId(undefined);
                setContactFormInitial(undefined);
                setContactFormOpen(true);
              }}
              onCreateRandom={() => {
                setEditingContactId(undefined);
                setContactFormInitial(getRandomContactFormValues());
                setContactFormOpen(true);
              }}
            />
            {contactFormOpen && (
              <ContactForm
                store={store}
                baseUrl={BASE_URL}
                contactId={editingContactId}
                initialValues={contactFormInitial}
                onSave={() => {
                  setContactFormOpen(false);
                  setEditingContactId(undefined);
                  setContactFormInitial(undefined);
                }}
                onCancel={() => {
                  setContactFormOpen(false);
                  setEditingContactId(undefined);
                  setContactFormInitial(undefined);
                }}
              />
            )}
          </div>
        )}

        {/* Groups View */}
        {activeView === 'groups' && (
          <div style={styles.groupsViewContainer}>
            <GroupList
              store={store}
              selectedId={selectedGroupId}
              onSelect={setSelectedGroupId}
              onEdit={(id) => {
                setEditingGroupId(id);
                setGroupFormOpen(true);
              }}
              onDelete={(id) => {
                store.delRow('groups', id);
                if (selectedGroupId === id) {
                  setSelectedGroupId(undefined);
                }
              }}
              onManageMembers={(id) => {
                setManagingMembersGroupId(id);
              }}
              onCreate={() => {
                setEditingGroupId(undefined);
                setGroupFormInitial(undefined);
                setGroupFormOpen(true);
              }}
              onCreateRandom={() => {
                setEditingGroupId(undefined);
                setGroupFormInitial(getRandomGroupFormValues());
                setGroupFormOpen(true);
              }}
            />
            {groupFormOpen && (
              <GroupForm
                store={store}
                baseUrl={BASE_URL}
                groupId={editingGroupId}
                initialValues={groupFormInitial}
                onSave={() => {
                  setGroupFormOpen(false);
                  setEditingGroupId(undefined);
                  setGroupFormInitial(undefined);
                }}
                onCancel={() => {
                  setGroupFormOpen(false);
                  setEditingGroupId(undefined);
                  setGroupFormInitial(undefined);
                }}
              />
            )}
            {managingMembersGroupId && (
              <MembershipManager
                store={store}
                groupId={managingMembersGroupId}
                onClose={() => setManagingMembersGroupId(undefined)}
              />
            )}
          </div>
        )}

        {/* Schemas View */}
        {activeView === 'schemas' && (
          <div style={styles.schemasViewContainer}>
            <div style={styles.schemasIntro}>
              <h2 style={styles.schemasTitle}>JSON Schemas</h2>
              <p style={styles.schemasLead}>
                These JSON Schema (draft-2020-12) files are <strong>generated from our <a href="https://github.com/devalbo/tb-solid-pod/tree/main/src/schemas" target="_blank" rel="noopener noreferrer" style={styles.extLink}>Zod types</a></strong>—there are no
                canonical JSON Schema definitions for Solid data types; the Solid ecosystem uses{' '}
                <a href="https://www.w3.org/TR/shacl/" target="_blank" rel="noopener noreferrer" style={styles.extLink}>SHACL</a>
                {' '}/{' '}
                <a href="https://shex.io/" target="_blank" rel="noopener noreferrer" style={styles.extLink}>ShEx</a>
                {' '}for validation. Use these schemas with OpenAPI, AJV, form generators, or any JSON Schema consumer.
              </p>
              <p style={styles.schemasSolidLinks}>
                <strong>Solid project documentation:</strong>{' '}
                <a href="https://solidproject.org/TR/protocol" target="_blank" rel="noopener noreferrer" style={styles.extLink}>Solid Protocol</a>
                {' · '}
                <a href="https://solid.github.io/webid-profile/" target="_blank" rel="noopener noreferrer" style={styles.extLink}>WebID Profile</a>
                {' · '}
                <a href="https://solid.github.io/type-indexes/" target="_blank" rel="noopener noreferrer" style={styles.extLink}>Type Indexes</a>
                {' · '}
                <a href="https://solidproject.org/" target="_blank" rel="noopener noreferrer" style={styles.extLink}>solidproject.org</a>
              </p>
            </div>
            <section id="schemas-example" style={styles.schemasExampleSection}>
              <h3 style={styles.schemasExampleTitle}>Example: using the schemas in code</h3>
              <pre style={styles.schemasExamplePre}>{`import {
  personaInputJsonSchema,
  contactInputJsonSchema,
  preferencesJsonSchema,
  tryToJsonSchema,
} from 'tb-solid-pod';

// Pre-built schemas (input and non-refined output schemas)
const openApiPersonaBody = personaInputJsonSchema;

// Schemas that use .refine() may be undefined; use tryToJsonSchema(schema) for custom Zod schemas
tryToJsonSchema(SomeZodSchema);`}</pre>
            </section>
            <div style={styles.schemaGrid}>
              {SCHEMA_META.map((s) => (
                <div key={s.file} style={styles.schemaCard}>
                  <div style={styles.schemaCardHeader}>
                    <a href={`${getAssetBase()}schema/${s.file}`} target="_blank" rel="noopener noreferrer" style={styles.schemaLink}>
                      {s.name}
                    </a>
                    {s.solidHref && (
                      <a href={s.solidHref} target="_blank" rel="noopener noreferrer" style={styles.solidDocLink} title="Solid documentation">
                        Solid →
                      </a>
                    )}
                  </div>
                  <p style={styles.schemaDesc}>{s.description}</p>
                  {s.fields.length > 0 && (
                    <p style={styles.schemaFields}>
                      <strong>Key fields:</strong> {s.fields.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terminal View */}
        {activeView === 'terminal' && (
          <div style={styles.terminalView}>
            <CliTerminal
              store={store}
              pod={pod}
              currentUrl={currentUrl}
              setCurrentUrl={setCurrentUrl}
              baseUrl={BASE_URL}
            />
          </div>
        )}
        <DemoFooter />
      </div>
    </Provider>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const styles: Record<string, CSSProperties> = {
  app: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0, width: '100%', minHeight: '100vh', boxSizing: 'border-box', background: '#f8f9fa', display: 'flex', flexDirection: 'column' },
  topNav: { background: '#1e1e1e', padding: '0 24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  agentHint: { width: '100%', boxSizing: 'border-box', padding: '8px 24px', background: '#f5e6d3', color: '#6b5344', fontSize: 13, borderBottom: '1px solid #e8d4bc', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  agentHintContent: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 260 },
  agentHintLink: { color: '#c45c26', textDecoration: 'none', fontWeight: 500 },
  agentHintCta: { padding: 0, border: 'none', background: 'none', color: '#6b5344', fontSize: 13, cursor: 'pointer', font: 'inherit', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 2 },
  agentHintDismiss: { border: 'none', background: 'transparent', color: '#6b5344', fontSize: 18, lineHeight: 1, padding: '4px 8px', cursor: 'pointer' },
  explainerChevron: { fontSize: 12, color: '#888' },
  explainer: { width: '100%', boxSizing: 'border-box', background: '#fff', borderBottom: '1px solid #eee', margin: 0 },
  explainerDetail: { padding: '16px 24px 20px', borderTop: '1px solid #e8d4bc', maxWidth: 900 },
  explainerLead: { margin: '12px 0 10px', fontSize: 14, lineHeight: 1.5, color: '#333' },
  explainerWhy: { margin: 0, fontSize: 14, lineHeight: 1.5, color: '#444' },
  explainerLink: { color: '#c45c26', textDecoration: 'none', fontWeight: 500 },
  topNavLeft: { display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 },
  topNavBrand: { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1, padding: '10px 0', minWidth: 0 },
  topNavTitle: { fontSize: 14, fontWeight: 700, color: '#f2f2f2', letterSpacing: 0.2, whiteSpace: 'nowrap' },
  topNavSubtitle: { fontSize: 11, fontWeight: 500, color: '#9aa0a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 },
  topNavActions: { display: 'flex', gap: 8, alignItems: 'center' },
  navExportBtn: { padding: '6px 12px', cursor: 'pointer', borderRadius: 4, borderWidth: 1, borderStyle: 'solid', borderColor: '#444', background: '#2a2a2a', color: '#ccc', fontSize: 12, fontWeight: 500 },
  topNavTab: { padding: '14px 24px', border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  topNavTabActive: { color: '#4ecdc4', borderBottom: '2px solid #4ecdc4' },
  navMenuBtn: { padding: '8px 12px', minWidth: 170, cursor: 'pointer', borderRadius: 6, borderWidth: 1, borderStyle: 'solid', borderColor: '#444', background: '#2a2a2a', color: '#ddd', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, whiteSpace: 'nowrap' },
  navTopBtn: { padding: '8px 12px', cursor: 'pointer', borderRadius: 6, borderWidth: 1, borderStyle: 'solid', borderColor: '#444', background: '#2a2a2a', color: '#ddd', fontSize: 12, fontWeight: 700 },
  navTopBtnActive: { borderColor: '#4ecdc4', color: '#eafffd' },
  navHelpBtn: { width: 30, height: 30, padding: 0, cursor: 'pointer', borderRadius: 999, borderWidth: 1, borderStyle: 'solid', borderColor: '#444', background: '#2a2a2a', color: '#ddd', fontSize: 14, fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  menuWrap: { position: 'relative', display: 'inline-flex' },
  menuChevron: { fontSize: 10, opacity: 0.8 },
  menuPanel: { position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 220, background: '#ffffff', border: '1px solid #e6e8eb', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: 6, zIndex: 2000 },
  menuItem: { width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1f2937', fontSize: 13, fontWeight: 600 },
  menuItemActive: { background: '#eff6ff', color: '#1d4ed8' },
  menuItemDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  terminalView: { padding: 0, height: 'calc(100vh - 49px)', minHeight: 320, width: '100%', background: '#1e1e1e', display: 'flex', flexDirection: 'column' },
  personasViewContainer: { padding: 24, flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  contactsViewContainer: { padding: 24, flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  groupsViewContainer: { padding: 24, flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  schemasViewContainer: { padding: 24, flex: 1, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  schemasIntro: { marginBottom: 28 },
  schemasTitle: { margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#1e1e1e' },
  schemasLead: { margin: '0 0 14px', fontSize: 15, lineHeight: 1.5, color: '#444' },
  schemasSolidLinks: { margin: 0, fontSize: 14, color: '#555' },
  schemasExampleSection: { marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8, border: '1px solid #eee' },
  schemasExampleTitle: { margin: '0 0 10px', fontSize: 16, fontWeight: 600, color: '#333' },
  schemasExamplePre: { margin: 0, padding: 14, background: '#1e1e1e', color: '#d4d4d4', borderRadius: 6, fontSize: 13, fontFamily: 'ui-monospace, monospace', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  extLink: { color: '#0070f3', textDecoration: 'none' },
  schemaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  schemaCard: { background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  schemaCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  schemaLink: { fontSize: 16, fontWeight: 600, color: '#0070f3', textDecoration: 'none' },
  solidDocLink: { fontSize: 12, color: '#666', textDecoration: 'none', whiteSpace: 'nowrap' },
  schemaDesc: { margin: 0, fontSize: 14, lineHeight: 1.45, color: '#444' },
  schemaFields: { margin: 0, fontSize: 13, color: '#666', lineHeight: 1.4 },
  dataViewContainer: { width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  navBtn: { padding: '8px 12px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#fff' },
  dataHeader: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, paddingRight: 24, paddingBottom: 12, paddingLeft: LAYOUT_PADDING_LEFT, width: '100%', boxSizing: 'border-box' },
  breadcrumbSpacer: { width: EXPLORER_CONTROLS_WIDTH + EXPLORER_CONTROLS_GAP, flexShrink: 0 },
  breadcrumbBar: {
    flex: 1,
    minWidth: 0,
    padding: '8px 12px',
    background: '#f5f5f5',
    borderRadius: 6,
    fontSize: '13px',
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 0,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  breadcrumbBtn: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: '#0070f3', fontWeight: 600, fontSize: 13 },
  breadcrumbCurrent: { color: '#555', fontWeight: 700, fontSize: 13 },
  breadcrumbSep: { padding: '0 8px', color: '#9aa0a6' },
  actions: { display: 'flex', gap: 10, marginBottom: 20, padding: '0 24px', width: '100%', boxSizing: 'border-box' },
  actionBtn: { padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 500, fontSize: '13px' },
  actionDivider: { color: '#ccc', alignSelf: 'center', margin: '0 4px' },
  exportBtn: { padding: '8px 14px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#333', fontWeight: 500, fontSize: '13px' },
  mainLayout: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
    minHeight: 400,
    paddingTop: 0,
    paddingRight: 24,
    paddingBottom: 30,
    paddingLeft: LAYOUT_PADDING_LEFT,
    flex: 1,
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  explorerWrap: { display: 'flex', alignItems: 'flex-start', gap: EXPLORER_CONTROLS_GAP, flexShrink: 0, minWidth: 0 },
  explorerControls: { width: EXPLORER_CONTROLS_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' },
  explorerControlBtn: { padding: '8px 12px', cursor: 'pointer', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 600, fontSize: '13px', textAlign: 'left' },
  // Explorer card column width matches breadcrumbs exactly.
  navColumn: { width: EXPLORER_WIDTH, flexShrink: 0 },
  mainContent: { flex: 1, minWidth: 0 },
  tabBar: { display: 'flex', gap: 0, borderBottom: '1px solid #eee', background: '#fafafa' },
  tabBtn: { padding: '10px 16px', border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#666' },
  tabBtnActive: { color: '#0070f3', borderBottom: '2px solid #0070f3' },
  tabContent: { padding: 16, overflow: 'auto' },
  card: { background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' },
  header: { margin: 0, padding: '15px', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 },
  upBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  upBtnDisabled: { opacity: 0.3, cursor: 'default' },
  list: { display: 'flex', flexDirection: 'column' },
  item: { padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' },
  textarea: { width: '100%', height: 200, padding: 15, border: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '14px', outline: 'none' },
  btn: { background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', margin: '15px', fontWeight: 600 },
  error: { padding: 20, color: 'red', textAlign: 'center' },
  loading: { padding: 40, textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#666' },
  sidePanel: { width: 320, flexShrink: 0, background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)' },
  sidePanelHeader: { margin: 0, padding: '12px 14px', background: '#f0f2f5', borderBottom: '1px solid #eee', fontSize: '14px', fontWeight: 600 },
  sidePanelEmpty: { padding: 20, color: '#888', fontSize: '14px' },
  sidePanelContent: { flex: 1, overflow: 'auto', padding: 12 },
  sidePanelMeta: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: '12px', color: '#666' },
  sidePanelName: { fontFamily: 'monospace', fontWeight: 500 },
  sidePanelType: { opacity: 0.8 },
  sidePanelPre: { margin: 0, padding: 12, background: '#fafafa', borderRadius: 6, fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: 400 },
  sidePanelImage: { maxWidth: '100%', height: 'auto', borderRadius: 6, display: 'block' },
  imagePreviewWrap: { padding: 15, background: '#fafafa', borderRadius: 6, marginBottom: 12, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imagePreview: { maxWidth: '100%', maxHeight: 320, objectFit: 'contain' },
  imagePlaceholder: { color: '#888', fontSize: '14px' },
  dialogOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, zIndex: 1000 },
  dialog: { background: '#fff', borderRadius: 10, padding: 24, minWidth: 360, maxWidth: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  dialogTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 600 },
  dialogTabs: { display: 'flex', gap: 4, marginBottom: 14 },
  dialogTab: { padding: '6px 12px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  dialogTabActive: { background: '#0070f3', color: '#fff', borderColor: '#0070f3' },
  dialogLabel: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' },
  dialogInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 16, border: '1px solid #ccc', borderRadius: 6, fontSize: 14, fontFamily: 'monospace' },
  dialogTextarea: { width: '100%', boxSizing: 'border-box', minHeight: 120, padding: 12, marginBottom: 16, border: '1px solid #ccc', borderRadius: 6, fontSize: 14, fontFamily: 'monospace', resize: 'vertical' },
  dialogImageRow: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 },
  dialogFileInput: { fontSize: 13 },
  dialogImageName: { fontSize: 13, color: '#28a745' },
  dialogImageHint: { fontSize: 13, color: '#888' },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  dialogBtnCancel: { padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 },
  dialogBtnSubmit: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  dialogBtnSubmitDisabled: { opacity: 0.6, cursor: 'not-allowed' }
};
