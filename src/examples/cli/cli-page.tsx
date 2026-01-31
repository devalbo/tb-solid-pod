/**
 * Example CLI page: self-contained demo that creates a TinyBase store and
 * VirtualPod, then renders the library CliTerminal. Use this as a reference
 * when integrating the CLI into your own app (see docs/INTEGRATION_GUIDE.md).
 */

import React, { useState, useEffect, useRef } from 'react';
import { createStore, createIndexes } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import { CliTerminal } from '../../cli';
import { VirtualPod } from '../../virtualPod';
import { initializeDefaultTypeRegistrations } from '../../utils/typeIndex';

const STORAGE_KEY = 'tb-solid-pod-example';
const BASE_URL = 'https://myapp.com/pod/';

const getDefaultContent = (): [Record<string, Record<string, Record<string, unknown>>>, Record<string, unknown>] => [
  {
    resources: {
      [BASE_URL]: {
        type: 'Container',
        contentType: 'text/turtle',
        updated: new Date().toISOString(),
      },
    },
  },
  {},
];

export const CliPage: React.FC = () => {
  const [store, setStore] = useState<ReturnType<typeof createStore> | null>(null);
  const [indexes, setIndexes] = useState<ReturnType<typeof createIndexes> | null>(null);
  const [pod, setPod] = useState<VirtualPod | null>(null);
  const [ready, setReady] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);
  const persisterRef = useRef<ReturnType<typeof createLocalPersister> | null>(null);

  useEffect(() => {
    (async () => {
      const s = createStore();
      const i = createIndexes(s);
      const p = new VirtualPod(s, i, BASE_URL);
      const persister = createLocalPersister(s, STORAGE_KEY);
      persisterRef.current = persister;
      await persister.load(getDefaultContent() as Parameters<typeof persister.load>[0]);
      initializeDefaultTypeRegistrations(s, BASE_URL);
      await persister.startAutoSave();
      setStore(s);
      setIndexes(i);
      setPod(p);
      setReady(true);
    })();
    return () => {
      persisterRef.current?.destroy?.();
    };
  }, []);

  if (!ready || !store || !indexes || !pod) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        Loading…
      </div>
    );
  }

  return (
    <Provider store={store} indexes={indexes}>
      <div
        style={{
          width: '100%',
          height: '100vh',
          backgroundColor: '#1e1e1e',
          position: 'relative',
        }}
      >
        <CliTerminal
          store={store}
          pod={pod}
          currentUrl={currentUrl}
          setCurrentUrl={setCurrentUrl}
          baseUrl={BASE_URL}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <Inspector />
        </div>
      </div>
    </Provider>
  );
};
