/**
 * Node CLI entry point. Run with: npm run cli
 * Uses Ink for terminal UI when stdin is a TTY; batch mode (read stdin lines, print output) when not.
 * Store is persisted to ~/.tb-solid-pod/data/store.json (or TB_SOLID_POD_DATA_PATH).
 */

import React, { useState, useCallback, useRef } from 'react';
import { render, Box, Text, useInput } from 'ink';
import * as readline from 'readline';
import type { Store } from 'tinybase';
import type { VirtualPod } from '../virtualPod';
import { createNodeStoreWithPersister } from './node-store';
import { commands, executeCommand } from './registry';
import type { CliContext, OutputEntry } from './types';

const BASE_URL = 'https://myapp.com/pod/';
const MAX_HISTORY = 100;

let store: Store;
let pod: VirtualPod;

const commandNames = Object.keys(commands);

/** Extract plain text from Ink/React output node for batch mode. */
function extractText(node: React.ReactNode): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children ?? '');
  }
  return '';
}

const outputIdRef = { current: 1 };

function CliApp() {
  const [output, setOutput] = useState<OutputEntry[]>([
    {
      id: 0,
      content: (
        <Text color="cyan">
          Welcome to the Solid Pod CLI. Type "help" for available commands.
        </Text>
      ),
    },
  ]);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);
  const [inputLine, setInputLine] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInputRef = useRef('');

  const addOutput = useCallback((content: React.ReactNode, _type?: OutputEntry['type']) => {
    setOutput((prev) => [
      ...prev,
      { id: outputIdRef.current++, content },
    ]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

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
    baseUrl: BASE_URL,
    store,
    pod,
    commands,
    exit: () => process.exit(0),
  };

  useInput((input, key) => {
    if (key.return) {
      const line = inputLine.trim();
      if (line) {
        addOutput(<Text dimColor>$ {inputLine}</Text>, 'input');
        addToHistory(line);
        const result = executeCommand(line, context);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
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
    if (key.backspace) {
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

  const shortPath = currentUrl.replace(BASE_URL, '/').replace(/\/$/, '') || '/';

  return (
    <Box flexDirection="column">
      {output.map((entry) => (
        <Box key={entry.id}>
          {entry.content}
        </Box>
      ))}
      <Box>
        <Text color="cyan">{shortPath} $</Text>
        <Text>{inputLine}</Text>
      </Box>
    </Box>
  );
}

/** Batch mode: stdin is not a TTY; read lines, execute commands, print output. */
async function runBatchMode() {
  const outputNodes: React.ReactNode[] = [];
  const context: CliContext = {
    addOutput: (content) => outputNodes.push(content),
    clearOutput: () => outputNodes.length = 0,
    setBusy: () => {},
    currentUrl: BASE_URL,
    setCurrentUrl: () => {},
    baseUrl: BASE_URL,
    store,
    pod,
    commands,
  };

  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    outputNodes.length = 0;
    const result = executeCommand(trimmed, context);
    if (result instanceof Promise) await result;
    for (const node of outputNodes) {
      const text = extractText(node);
      if (text) process.stdout.write(text + '\n');
    }
  }
}

/** Single-command mode: argv has command args; run once and exit. */
async function runSingleCommand(commandLine: string) {
  const outputNodes: React.ReactNode[] = [];
  const context: CliContext = {
    addOutput: (content) => outputNodes.push(content),
    clearOutput: () => { outputNodes.length = 0; },
    setBusy: () => {},
    currentUrl: BASE_URL,
    setCurrentUrl: () => {},
    baseUrl: BASE_URL,
    store,
    pod,
    commands,
  };
  const result = executeCommand(commandLine.trim(), context);
  if (result instanceof Promise) await result;
  for (const node of outputNodes) {
    const text = extractText(node);
    if (text) process.stdout.write(text + '\n');
  }
  process.exit(0);
}

async function main() {
  const node = await createNodeStoreWithPersister({ baseUrl: BASE_URL });
  store = node.store;
  pod = node.pod;

  if (process.argv.length > 2) {
    const commandLine = process.argv.slice(2).join(' ');
    await runSingleCommand(commandLine);
  }

  if (process.stdin.isTTY) {
    render(<CliApp />);
  } else {
    await runBatchMode();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
