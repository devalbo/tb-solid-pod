/**
 * Unit tests for CLI registry and executeCommand.
 * Assert behavior with Ink-compatible output (addOutput receives ReactNode).
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'tinybase';
import { createIndexes } from 'tinybase';
import { VirtualPod } from '../../../src/virtualPod';
import { executeCommand, commands } from '../../../src/cli/registry';
import type { CliContext } from '../../../src/cli/types';

const BASE_URL = 'https://myapp.com/pod/';

function createCliContext(overrides: Partial<CliContext> = {}): CliContext {
  const store = createStore();
  const indexes = createIndexes(store);
  const pod = new VirtualPod(store, indexes, BASE_URL);

  const addOutput = vi.fn<void, [ReactNode, 'input' | 'output' | 'error' | 'success' | undefined]>();
  const clearOutput = vi.fn<void, []>();
  const setBusy = vi.fn<void, [boolean]>();

  return {
    addOutput,
    clearOutput,
    setBusy,
    currentUrl: BASE_URL,
    setCurrentUrl: vi.fn(),
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

  it('does nothing for empty input', () => {
    const context = createCliContext();
    executeCommand('   ', context);
    executeCommand('', context);
    expect(context.addOutput).not.toHaveBeenCalled();
  });

  it('calls addOutput with error for unknown command', () => {
    const context = createCliContext();
    executeCommand('nonexistentcommand', context);
    expect(context.addOutput).toHaveBeenCalledTimes(1);
    expect(context.addOutput).toHaveBeenCalledWith(
      expect.anything(),
      'error'
    );
  });

  it('calls addOutput for "help" command', () => {
    const context = createCliContext();
    executeCommand('help', context);
    expect(context.addOutput).toHaveBeenCalled();
    const [content] = (context.addOutput as ReturnType<typeof vi.fn>).mock
      .calls[0] as [ReactNode, string?];
    expect(content).toBeDefined();
    expect(typeof content === 'object' && content !== null).toBe(true);
  });

  it('calls addOutput for "contact" (subcommand help)', () => {
    const context = createCliContext();
    executeCommand('contact', context);
    expect(context.addOutput).toHaveBeenCalled();
  });

  it('calls addOutput for "contact list" with empty store', () => {
    const context = createCliContext();
    executeCommand('contact list', context);
    expect(context.addOutput).toHaveBeenCalled();
  });

  it('calls addOutput for "persona list" with empty store', () => {
    const context = createCliContext();
    executeCommand('persona list', context);
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
