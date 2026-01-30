import type { ReactNode } from 'react';
import type { Store } from 'tinybase';

/**
 * VirtualPod interface - matches the class in App.jsx
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
  addOutput: (content: ReactNode, type?: OutputEntry['type']) => void;
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
