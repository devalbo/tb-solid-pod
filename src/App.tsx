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
import { CliTerminal } from './cli';

const STORAGE_KEY = 'tb-solid-pod';
const BASE_URL = 'https://myapp.com/pod/';

const getDefaultContent = (): [Record<string, Record<string, Record<string, unknown>>>, Record<string, unknown>] => [
  { resources: { [BASE_URL]: { type: 'Container', contentType: 'text/turtle', updated: new Date().toISOString() } } },
  {}
];

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
interface ResourceRow {
  type?: string;
  body?: string | null;
  contentType?: string;
  parentId?: string;
  updated?: string;
}

interface RequestOptions {
  method?: string;
  body?: string | null;
  headers?: Record<string, string>;
}

interface RequestResult {
  status: number;
  body: string | null;
  headers?: Record<string, string>;
}

// ==========================================
// 1. THE BACKEND (VirtualPod Class)
// ==========================================
export class VirtualPod {
  store: Store;
  indexes: Indexes;
  baseUrl: string;

  constructor(store: Store, indexes: Indexes) {
    this.store = store;
    this.indexes = indexes;
    this.baseUrl = BASE_URL;

    // Initialize Schema
    this.store.setTables({ resources: {} });
    // Index for fast folder lookups: "Give me files where parentId = X"
    this.indexes.setIndexDefinition('byParent', 'resources', 'parentId');

    // Create Root Folder if missing
    if (!this.store.hasRow('resources', this.baseUrl)) {
      this.store.setRow('resources', this.baseUrl, {
        type: 'Container',
        contentType: 'text/turtle',
        updated: new Date().toISOString()
      });
    }
  }

  // The "Fetch" Interceptor
  async handleRequest(url: string, options: RequestOptions = { method: 'GET' }): Promise<RequestResult> {
    const method = options.method?.toUpperCase() || 'GET';

    // Simple Router
    if (method === 'GET') return this._get(url);
    if (method === 'PUT') return this._put(url, options.body, options.headers);
    if (method === 'DELETE') return this._delete(url);
    return { status: 405, body: "Method Not Allowed" };
  }

  _get(url: string): RequestResult {
    if (!this.store.hasRow('resources', url)) return { status: 404, body: "Not Found" };
    const row = this.store.getRow('resources', url) as ResourceRow;
    return { status: 200, body: row.body ?? null, headers: { 'Content-Type': row.contentType || 'text/plain' } };
  }

  _put(url: string, body?: string | null, headers: Record<string, string> = {}): RequestResult {
    const isContainer = url.endsWith('/');
    // Logic: Find parent
    const parentUrl = isContainer
      ? new URL('..', url).href
      : new URL('.', url).href;

    if (url !== this.baseUrl && !this.store.hasRow('resources', parentUrl)) {
      return { status: 409, body: "Parent folder missing" };
    }

    this.store.setRow('resources', url, {
      type: isContainer ? 'Container' : 'Resource',
      body: body || null,
      contentType: headers['Content-Type'] || 'text/plain',
      parentId: parentUrl,
      updated: new Date().toISOString()
    });
    return { status: 201, body: "Created" };
  }

  _delete(url: string): RequestResult {
    if (url === this.baseUrl) return { status: 405, body: "Cannot delete root" };
    this.store.delRow('resources', url);
    return { status: 204, body: "Deleted" };
  }
}

// ==========================================
// 2. THE FRONTEND (Widgets)
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
        📂 {url.replace('https://myapp.com/pod/', '/')}
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
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const FileViewTabs: React.FC<FileViewTabsProps> = ({ url, row, pod, activeTab, onTabChange }) => {
  const isImage = isImageContentType(row?.contentType);

  return (
    <div style={styles.card}>
      <div style={styles.tabBar}>
        <button type="button" style={{ ...styles.tabBtn, ...(activeTab === 'view' ? styles.tabBtnActive : {}) }} onClick={() => onTabChange('view')}>View</button>
        <button type="button" style={{ ...styles.tabBtn, ...(activeTab === 'edit' ? styles.tabBtnActive : {}) }} onClick={() => onTabChange('edit')}>Edit</button>
      </div>
      {activeTab === 'view' ? (
        <FileViewContent url={url} row={row} />
      ) : isImage ? (
        <ImageViewer url={url} pod={pod} inline />
      ) : (
        <TextEditor url={url} pod={pod} inline />
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
      const p = new VirtualPod(s, i);
      const persister = createLocalPersister(s, STORAGE_KEY);
      persisterRef.current = persister;
      await persister.load(getDefaultContent());
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
  const [activeView, setActiveView] = useState<'data' | 'terminal'>('data');

  const row = useRow('resources', currentUrl, store) as ResourceRow | undefined;
  const isContainer = row?.type === 'Container';
  const parentUrl = row?.parentId;

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
          <div style={styles.topNavTabs}>
            <button
              style={{ ...styles.topNavTab, ...(activeView === 'data' ? styles.topNavTabActive : {}) }}
              onClick={() => setActiveView('data')}
            >
              Data Browser
            </button>
            <button
              style={{ ...styles.topNavTab, ...(activeView === 'terminal' ? styles.topNavTabActive : {}) }}
              onClick={() => setActiveView('terminal')}
            >
              Terminal
            </button>
          </div>
          <div style={styles.topNavActions}>
            <button
              style={styles.navExportBtn}
              onClick={handleCopyToClipboard}
              title="Copy store data to clipboard"
            >
              {copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy'}
            </button>
            <button
              style={styles.navExportBtn}
              onClick={handleDownload}
              title="Download store as JSON file"
            >
              Export
            </button>
            <button
              style={styles.navExportBtn}
              onClick={handleImportClick}
              title="Import store from JSON file"
            >
              Import
            </button>
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

        {/* Data Browser View */}
        {activeView === 'data' && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.urlBar}>{currentUrl}</div>
            </div>
            <div style={styles.actions}>
              <button style={styles.actionBtn} onClick={createNote}>+ New File</button>
              <button
                type="button"
                style={styles.actionBtn}
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
              <button style={styles.actionBtn} onClick={createFolder}>+ New Folder</button>
            </div>

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

            <div style={styles.mainLayout}>
              <div style={styles.navColumn}>
                <FileBrowser
                  url={isContainer ? currentUrl : (parentUrl ?? BASE_URL)}
                  onNavigate={setCurrentUrl}
                  parentUrl={parentUrl}
                  onNavigateUp={parentUrl ? () => setCurrentUrl(parentUrl) : undefined}
                />
              </div>
              <div style={styles.mainContent}>
                {!row ? (
                  <div style={styles.error}>404 Not Found</div>
                ) : !isContainer ? (
                  <FileViewTabs url={currentUrl} row={row} pod={pod} activeTab={fileTab} onTabChange={setFileTab} />
                ) : null}
              </div>
            </div>
          </>
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
      </div>
    </Provider>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const styles: Record<string, CSSProperties> = {
  app: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0, minHeight: '100vh', boxSizing: 'border-box', background: '#f8f9fa' },
  topNav: { background: '#1e1e1e', padding: '0 24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  topNavTabs: { display: 'flex', gap: 0 },
  topNavActions: { display: 'flex', gap: 8, alignItems: 'center' },
  navExportBtn: { padding: '6px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #444', background: '#2a2a2a', color: '#ccc', fontSize: 12, fontWeight: 500 },
  topNavTab: { padding: '14px 24px', border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  topNavTabActive: { color: '#4ecdc4', borderBottom: '2px solid #4ecdc4' },
  terminalView: { padding: 0, height: 'calc(100vh - 49px)', background: '#1e1e1e' },
  toolbar: { display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10, padding: '20px 24px 0' },
  navBtn: { padding: '8px 12px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#fff' },
  urlBar: { flex: 1, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: '14px', color: '#555', fontFamily: 'monospace' },
  actions: { display: 'flex', gap: 10, marginBottom: 20, padding: '0 24px' },
  actionBtn: { padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff', fontWeight: 500, fontSize: '13px' },
  actionDivider: { color: '#ccc', alignSelf: 'center', margin: '0 4px' },
  exportBtn: { padding: '8px 14px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#333', fontWeight: 500, fontSize: '13px' },
  mainLayout: { display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: 400, padding: '0 24px 30px' },
  navColumn: { width: 260, flexShrink: 0 },
  mainContent: { flex: 1, minWidth: 0, maxWidth: 700 },
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
