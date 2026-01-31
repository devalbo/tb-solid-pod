import type { ReactNode } from 'react';
import type { Store } from 'tinybase';

/**
 * VirtualPod interface - implemented by the class in virtualPod.ts
 */
export interface VirtualPod {
  store: Store;
  baseUrl: string;
  handleRequest(
    url: string,
    options?: {
      method?: string;
      body?: string | null;
      headers?: Record<string, string>;
    }
  ): Promise<{
    status: number;
    body?: string | null;
    headers?: Record<string, string>;
  }>;
}

/**
 * Global key for E2E output mirror: CliTerminal sets a setter here so CliApp
 * (running in Ink's root) can push output lines without relying on prop passthrough.
 */
export const E2E_OUTPUT_LINES_SETTER_KEY = '__tbSolidPodSetOutputLines';

/**
 * Output entry for the terminal display
 */
export interface OutputEntry {
  id: number;
  content: ReactNode;
  type?: 'input' | 'output' | 'error' | 'success';
}

/**
 * CLI Context passed to all commands
 */
export interface CliContext {
  // Core output
  addOutput: (content: ReactNode, type?: OutputEntry['type'], plainText?: string) => void;
  clearOutput: () => void;

  // State
  setBusy: (busy: boolean) => void;

  // Navigation
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  baseUrl: string;

  // TinyBase store and pod
  store: Store;
  pod: VirtualPod;

  // Command registry (for help command)
  commands: Record<string, Command>;

  /** Optional: quit the process (Node CLI only). In browser, undefined. */
  exit?: () => void;
}

/**
 * Command definition
 */
export interface Command {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[], context: CliContext) => void | Promise<void>;
}

/**
 * Parsed CLI arguments
 */
export interface ParsedArgs {
  positional: string[];
  options: Record<string, string | boolean>;
}
