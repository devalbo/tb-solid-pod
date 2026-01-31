/**
 * Node store initialization with file persistence.
 * Used by the Node CLI (run-node.tsx). Creates store + indexes + VirtualPod,
 * attaches TinyBase file persister, loads from disk (or default content), starts auto-save.
 */

import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createStore } from 'tinybase';
import { createIndexes } from 'tinybase';
import type { Store } from 'tinybase';
import type { Indexes } from 'tinybase';
import { createFilePersister } from 'tinybase/persisters/persister-file';
import { VirtualPod } from '../virtualPod';
import { initializeDefaultTypeRegistrations } from '../utils/typeIndex';
import { STORE_TABLES } from '../storeLayout';

const DEFAULT_BASE_URL = 'https://myapp.com/pod/';

/** Default path for store file: ~/.tb-solid-pod/data/store.json. Override with TB_SOLID_POD_DATA_PATH. */
export function getNodeStorePath(): string {
  const envPath = process.env.TB_SOLID_POD_DATA_PATH;
  if (envPath) return path.resolve(envPath);
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  return path.join(home, '.tb-solid-pod', 'data', 'store.json');
}

/** Default content when no file exists: resources table with root container. */
export function getDefaultStoreContent(baseUrl: string): [Record<string, Record<string, Record<string, unknown>>>, Record<string, unknown>] {
  return [
    {
      [STORE_TABLES.RESOURCES]: {
        [baseUrl]: {
          type: 'Container',
          contentType: 'text/turtle',
          updated: new Date().toISOString(),
        },
      },
    },
    {},
  ];
}

export interface NodeStoreWithPersister {
  store: Store;
  indexes: Indexes;
  pod: VirtualPod;
  persister: ReturnType<typeof createFilePersister>;
}

/**
 * Create store, indexes, VirtualPod, file persister; ensure data dir exists;
 * load from file (or default content); run initializeDefaultTypeRegistrations; start auto-save.
 */
export async function createNodeStoreWithPersister(options: {
  baseUrl?: string;
  storePath?: string;
} = {}): Promise<NodeStoreWithPersister> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const storePath = options.storePath ?? getNodeStorePath();

  const store = createStore();
  const indexes = createIndexes(store);
  const pod = new VirtualPod(store, indexes, baseUrl);

  const dir = path.dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const persister = createFilePersister(store, storePath, (err) => {
    console.error('[tb-solid-pod] Persister error:', err);
  });

  const defaultContent = getDefaultStoreContent(baseUrl);
  await persister.load(defaultContent);

  initializeDefaultTypeRegistrations(store, baseUrl);
  await persister.startAutoSave();

  return { store, indexes, pod, persister };
}
