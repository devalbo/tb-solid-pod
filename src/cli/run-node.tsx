/**
 * Node CLI entry point. Run with: npm run cli
 * Uses Ink for terminal UI when stdin is a TTY; batch mode (read stdin lines, print output) when not.
 * Store is persisted to ~/.tb-solid-pod/data/store.json (or TB_SOLID_POD_DATA_PATH).
 */

import React from 'react';
import { render } from 'ink';
import * as readline from 'readline';
import type { Store } from 'tinybase';
import type { VirtualPod } from '../virtualPod';
import { createNodeStoreWithPersister } from './node-store';
import { commands } from './registry';
import { executeCommandLine } from './executor';
import type { CliContext } from './types';
import { CliApp } from './CliApp';

const BASE_URL = 'https://myapp.com/pod/';

let store: Store;
let pod: VirtualPod;

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
    await executeCommandLine(trimmed, context, { silent: false });
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
  await executeCommandLine(commandLine.trim(), context, { silent: false });
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
    render(
      <CliApp
        store={store}
        pod={pod}
        baseUrl={BASE_URL}
        exit={() => process.exit(0)}
      />
    );
  } else {
    await runBatchMode();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
