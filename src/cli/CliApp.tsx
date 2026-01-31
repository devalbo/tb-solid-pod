/**
 * Shared CLI UI component: output + prompt + input.
 * Used by run-node.tsx (Node, Ink render) and CliTerminal.tsx (browser, InkTerminalBox).
 * Renders Box/Text; uses useInput for keyboard. Accepts store, pod, baseUrl; optional
 * currentUrl/setCurrentUrl (controlled from parent) and exit (Node only).
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Store } from 'tinybase';
import type { VirtualPod } from './types';
import { commands } from './registry';
import { executeCommandLine } from './executor';
import type { CliContext, OutputEntry } from './types';
import { E2E_OUTPUT_LINES_SETTER_KEY } from './types';

const MAX_HISTORY = 100;
const commandNames = Object.keys(commands);

export interface CliAppProps {
  store: Store;
  pod: VirtualPod;
  baseUrl: string;
  /** When provided (browser), use these; otherwise (Node) use internal state. */
  currentUrl?: string;
  setCurrentUrl?: (url: string) => void;
  /** When provided (Node), called by exit command; otherwise no-op. */
  exit?: () => void;
  /** When provided (browser), called with each new plain-text line (or null to clear) for E2E mirror. */
  onOutputLines?: (lineOrClear: string | null) => void;
}

const outputIdRef = { current: 1 };

export function CliApp({
  store,
  pod,
  baseUrl,
  currentUrl: controlledCurrentUrl,
  setCurrentUrl: controlledSetCurrentUrl,
  exit,
  onOutputLines,
}: CliAppProps) {
  const [internalUrl, setInternalUrl] = useState(baseUrl);
  const currentUrl = controlledCurrentUrl ?? internalUrl;
  const setCurrentUrl = controlledSetCurrentUrl ?? setInternalUrl;

  const welcomeText = 'Welcome to the Solid Pod CLI. Type "help" for available commands.';
  const [output, setOutput] = useState<OutputEntry[]>([
    {
      id: 0,
      content: (
        <Text color="cyan">
          {welcomeText}
        </Text>
      ),
    },
  ]);
  const [inputLine, setInputLine] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInputRef = useRef('');

  const pushOutputLine = useCallback((lineOrClear: string | null) => {
    onOutputLines?.(lineOrClear);
    const setter = typeof globalThis !== 'undefined' && (globalThis as unknown as Record<string, (l: string | null) => void>)[E2E_OUTPUT_LINES_SETTER_KEY];
    if (setter) setter(lineOrClear);
  }, [onOutputLines]);

  const addOutput = useCallback((content: React.ReactNode, _type?: OutputEntry['type'], plainText?: string) => {
    setOutput((prev) => [
      ...prev,
      { id: outputIdRef.current++, content },
    ]);
    if (plainText != null) {
      pushOutputLine(plainText);
    }
  }, [pushOutputLine]);

  const clearOutput = useCallback(() => {
    setOutput([]);
    pushOutputLine(null);
  }, [pushOutputLine]);

  const addToHistory = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      if (prev[prev.length - 1] === trimmed) return prev;
      return [...prev, trimmed].slice(-MAX_HISTORY);
    });
    setHistoryIndex(-1);
    savedInputRef.current = '';
  }, []);

  const context: CliContext = {
    addOutput,
    clearOutput,
    setBusy: () => {},
    currentUrl,
    setCurrentUrl,
    baseUrl,
    store,
    pod,
    commands,
    ...(exit != null && { exit }),
  };

  useInput((input, key) => {
    if (key.return) {
      const line = inputLine.trim();
      if (line) {
        addOutput(<Text dimColor>$ {inputLine}</Text>, 'input');
        addToHistory(line);
        executeCommandLine(line, context).catch(() => {});
      }
      setInputLine('');
      return;
    }
    if (key.upArrow) {
      if (history.length === 0) return;
      if (historyIndex === -1) {
        savedInputRef.current = inputLine;
        const idx = history.length - 1;
        setHistoryIndex(idx);
        setInputLine(history[idx] ?? '');
      } else if (historyIndex > 0) {
        const idx = historyIndex - 1;
        setHistoryIndex(idx);
        setInputLine(history[idx] ?? '');
      }
      return;
    }
    if (key.downArrow) {
      if (historyIndex === -1) return;
      if (historyIndex < history.length - 1) {
        const idx = historyIndex + 1;
        setHistoryIndex(idx);
        setInputLine(history[idx] ?? '');
      } else {
        setHistoryIndex(-1);
        setInputLine(savedInputRef.current);
      }
      return;
    }
    if (key.tab) {
      const trimmed = inputLine.trim().toLowerCase();
      if (!trimmed || trimmed.includes(' ')) return;
      const matches = commandNames.filter((name) =>
        name.toLowerCase().startsWith(trimmed)
      );
      if (matches.length === 1) {
        setInputLine(matches[0] + ' ');
      }
      return;
    }
    if (key.backspace || key.delete) {
      setInputLine((prev) => prev.slice(0, -1));
      return;
    }
    if (key.ctrl && input === 'c') {
      setInputLine('');
      addOutput(<Text dimColor>^C</Text>);
      return;
    }
    if (key.ctrl && input === 'l') {
      clearOutput();
      return;
    }
    if (input) {
      setInputLine((prev) => prev + input);
    }
  });

  const shortPath = currentUrl.replace(baseUrl, '/').replace(/\/$/, '') || '/';

  return (
    <Box flexDirection="column" padding={1}>
      {output.map((entry) => (
        <Box key={entry.id} marginBottom={0}>
          {entry.content}
        </Box>
      ))}
      <Box>
        <Text color="cyan">{shortPath} $ </Text>
        <Text>{inputLine}</Text>
        <Text backgroundColor="white"> </Text>
      </Box>
    </Box>
  );
}
