/**
 * Unit tests for CLI registry and executeCommand.
 * Assert behavior with Ink-compatible output (addOutput receives ReactNode).
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'tinybase';
import { createIndexes } from 'tinybase';
import { VirtualPod } from '../../../src/virtualPod';
import { commands } from '../../../src/cli/registry';
import { executeCommandLine } from '../../../src/cli/executor';
import type { CliContext } from '../../../src/cli/types';

const BASE_URL = 'https://myapp.com/pod/';

function createCliContext(overrides: Partial<CliContext> = {}): CliContext {
  const store = createStore();
  const indexes = createIndexes(store);
  const pod = new VirtualPod(store, indexes, BASE_URL);

  const addOutput = vi.fn() as unknown as CliContext['addOutput'];
  const clearOutput = vi.fn() as unknown as CliContext['clearOutput'];
  const setBusy = vi.fn() as unknown as CliContext['setBusy'];

  return {
    addOutput,
    clearOutput,
    setBusy,
    currentUrl: BASE_URL,
    setCurrentUrl: vi.fn() as unknown as CliContext['setCurrentUrl'],
    baseUrl: BASE_URL,
    store,
    pod,
    commands,
    ...overrides,
  };
}

describe('executeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for empty input', async () => {
    const context = createCliContext();
    await executeCommandLine('   ', context);
    await executeCommandLine('', context);
    expect(context.addOutput).not.toHaveBeenCalled();
  });

  it('calls addOutput with error for unknown command', async () => {
    const context = createCliContext();
    await executeCommandLine('nonexistentcommand', context);
    expect(context.addOutput).toHaveBeenCalledTimes(1);
    const call = (context.addOutput as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(call[1]).toBe('error');
  });

  it('calls addOutput for "help" command', async () => {
    const context = createCliContext();
    await executeCommandLine('help', context);
    expect(context.addOutput).toHaveBeenCalled();
    const [content] = (context.addOutput as ReturnType<typeof vi.fn>).mock
      .calls[0] as [ReactNode, string?];
    expect(content).toBeDefined();
    expect(typeof content === 'object' && content !== null).toBe(true);
  });

  it('calls addOutput for "contact" (subcommand help)', async () => {
    const context = createCliContext();
    await executeCommandLine('contact', context);
    expect(context.addOutput).toHaveBeenCalled();
  });

  it('calls addOutput for "contact list" with empty store', async () => {
    const context = createCliContext();
    await executeCommandLine('contact list', context);
    expect(context.addOutput).toHaveBeenCalled();
  });

  it('calls addOutput for "persona list" with empty store', async () => {
    const context = createCliContext();
    await executeCommandLine('persona list', context);
    expect(context.addOutput).toHaveBeenCalled();
  });
});

describe('commands registry', () => {
  it('exposes expected command names', () => {
    const names = Object.keys(commands);
    expect(names).toContain('help');
    expect(names).toContain('contact');
    expect(names).toContain('persona');
    expect(names).toContain('group');
    expect(names).toContain('clear');
    expect(names).toContain('pwd');
    expect(names).toContain('ls');
    expect(names).toContain('exit');
  });
});
