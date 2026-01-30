import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Store } from 'tinybase';
import type { VirtualPod, OutputEntry, CliContext } from './types';
import { useCliInput } from './use-cli-input';
import { commands, executeCommand } from './registry';

interface CliTerminalProps {
  store: Store;
  pod: VirtualPod;
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  baseUrl: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.5,
  },
  header: {
    background: '#333',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #444',
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  headerTitle: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
  },
  output: {
    padding: 12,
    maxHeight: 300,
    overflowY: 'auto',
    color: '#f5f5f5',
    userSelect: 'text',
    cursor: 'text',
  },
  outputLine: {
    marginBottom: 4,
  },
  inputLine: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderTop: '1px solid #333',
    background: '#252525',
  },
  prompt: {
    color: '#4ecdc4',
    marginRight: 8,
    userSelect: 'none',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f5f5f5',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  },
  inputEcho: {
    color: '#888',
  },
};

export const CliTerminal: React.FC<CliTerminalProps> = ({
  store,
  pod,
  currentUrl,
  setCurrentUrl,
  baseUrl,
}) => {
  const [output, setOutput] = useState<OutputEntry[]>([
    {
      id: 0,
      content: (
        <span style={{ color: '#4ecdc4' }}>
          Welcome to the Solid Pod CLI. Type "help" for available commands.
        </span>
      ),
    },
  ]);
  const [busy, setBusy] = useState(false);
  const outputIdRef = useRef(1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandNames = Object.keys(commands);
  const {
    input,
    setInput,
    handleHistoryUp,
    handleHistoryDown,
    handleTab,
    addToHistory,
    clearInput,
  } = useCliInput({ commandNames });

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input when terminal is clicked
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const addOutput = useCallback(
    (content: React.ReactNode, type?: OutputEntry['type']) => {
      setOutput((prev) => [
        ...prev,
        { id: outputIdRef.current++, content, type },
      ]);
    },
    []
  );

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const context: CliContext = {
    addOutput,
    clearOutput,
    setBusy,
    currentUrl,
    setCurrentUrl,
    baseUrl,
    store,
    pod,
    commands,
  };

  const handleSubmit = useCallback(() => {
    if (busy || !input.trim()) return;

    // Echo the input
    addOutput(
      <span style={styles.inputEcho}>$ {input}</span>,
      'input'
    );
    addToHistory(input);

    const result = executeCommand(input, context);
    if (result instanceof Promise) {
      setBusy(true);
      result.finally(() => {
        setBusy(false);
        clearInput();
      });
    } else {
      clearInput();
    }
  }, [input, busy, context, addToHistory, clearInput, addOutput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (busy) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleSubmit();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleHistoryUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleHistoryDown();
          break;
        case 'Tab':
          e.preventDefault();
          handleTab();
          break;
        case 'c':
          if (e.ctrlKey) {
            e.preventDefault();
            clearInput();
            addOutput(<span style={{ color: '#888' }}>^C</span>);
          }
          break;
        case 'l':
          if (e.ctrlKey) {
            e.preventDefault();
            clearOutput();
          }
          break;
      }
    },
    [
      busy,
      handleSubmit,
      handleHistoryUp,
      handleHistoryDown,
      handleTab,
      clearInput,
      clearOutput,
      addOutput,
    ]
  );

  // Get short path for prompt
  const shortPath = currentUrl.replace(baseUrl, '/').replace(/\/$/, '') || '/';

  return (
    <div style={styles.container} onClick={focusInput}>
      <div style={styles.header}>
        <span style={{ ...styles.headerDot, background: '#ff5f56' }} />
        <span style={{ ...styles.headerDot, background: '#ffbd2e' }} />
        <span style={{ ...styles.headerDot, background: '#27c93f' }} />
        <span style={styles.headerTitle}>Solid Pod CLI</span>
      </div>

      <div ref={outputRef} style={styles.output} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        {output.map((entry) => (
          <div key={entry.id} style={styles.outputLine}>
            {entry.content}
          </div>
        ))}
      </div>

      <div style={styles.inputLine}>
        <span style={styles.prompt}>{shortPath} $</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          disabled={busy}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
};
