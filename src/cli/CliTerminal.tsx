/**
 * Browser CLI: renders the shared CliApp inside InkTerminalBox (ink-web).
 * Ink runs the full layout pipeline and displays output in an xterm terminal.
 * We wait for yoga WASM to initialize before mounting InkTerminalBox so that
 * content appears immediately instead of a blank terminal.
 * Import ink-web CSS so .ink-terminal-reset gets position:absolute and the
 * xterm container has non-zero dimensions (otherwise InkXterm never initializes).
 */

import 'ink-web/css';
import 'xterm/css/xterm.css';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { InkTerminalBox, waitForYogaInit } from 'ink-web';
import type { Store } from 'tinybase';
import type { VirtualPod } from './types';
import { CliApp } from './CliApp';
import { E2E_OUTPUT_LINES_SETTER_KEY } from './types';

interface CliTerminalProps {
  store: Store;
  pod: VirtualPod;
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  baseUrl: string;
}

const ROWS = 24;

/** Extra xterm options: scrollback so viewport can scroll and cursor stays visible. */
const TERM_OPTIONS = { scrollback: 1000 };

const loadingStyle: React.CSSProperties = {
  height: '100%',
  minHeight: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1e1e1e',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
};

export const CliTerminal: React.FC<CliTerminalProps> = ({
  store,
  pod,
  currentUrl,
  setCurrentUrl,
  baseUrl,
}) => {
  const [yogaReady, setYogaReady] = useState(false);
  const welcomeLine = 'Welcome to the Solid Pod CLI. Type "help" for available commands.';
  // Use ref to hold full output lines for E2E mirror; append/clear without re-renders (avoids remounting CliApp via ink-web)
  const outputLinesRef = useRef<string[]>([welcomeLine]);
  const outputDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    waitForYogaInit().then(() => setYogaReady(true));
  }, []);

  // Append a line or clear to welcome; update the E2E div directly
  const updateOutputDiv = useCallback((lineOrClear: string | null) => {
    if (lineOrClear === null) {
      outputLinesRef.current = [welcomeLine];
    } else {
      outputLinesRef.current = [...outputLinesRef.current, lineOrClear];
    }
    if (outputDivRef.current) {
      outputDivRef.current.textContent = outputLinesRef.current.join('\n');
    }
  }, []);

  useEffect(() => {
    (globalThis as unknown as Record<string, (l: string | null) => void>)[E2E_OUTPUT_LINES_SETTER_KEY] = (lineOrClear) => {
      queueMicrotask(() => updateOutputDiv(lineOrClear));
    };
    return () => {
      delete (globalThis as unknown as Record<string, unknown>)[E2E_OUTPUT_LINES_SETTER_KEY];
    };
  }, [updateOutputDiv]);

  // Stable callback so useMemo deps don't change when parent re-renders; avoids remounting Ink (and losing CLI output) when CliTerminal re-renders after E2E mirror updates.
  const setCurrentUrlRef = useRef(setCurrentUrl);
  setCurrentUrlRef.current = setCurrentUrl;
  const setCurrentUrlStable = useCallback((url: string) => {
    setCurrentUrlRef.current(url);
  }, []);

  const cliAppElement = useMemo(
    () => (
      <CliApp
        store={store}
        pod={pod}
        baseUrl={baseUrl}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrlStable}
        onOutputLines={updateOutputDiv}
      />
    ),
    [store, pod, baseUrl, currentUrl, setCurrentUrlStable, updateOutputDiv]
  );

  if (!yogaReady) {
    return <div style={loadingStyle}>Loading terminal…</div>;
  }

  return (
    <>
      <InkTerminalBox rows={ROWS} focus termOptions={TERM_OPTIONS}>
        {cliAppElement}
      </InkTerminalBox>
      {/* Hidden div for Playwright: CLI output as plain text (terminal renders to canvas) */}
      <div
        ref={outputDivRef}
        data-testid="cli-output"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: 1,
          height: 1,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {welcomeLine}
      </div>
    </>
  );
};
