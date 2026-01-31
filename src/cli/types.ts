import type { ReactNode } from 'react';
import type { Store } from 'tinybase';
import { z } from 'zod';

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
 * Standardized error codes for commands.
 */
export const errorCodeSchema = z.enum([
  // Path errors
  'INVALID_PATH',
  'PATH_NOT_FOUND',
  'NOT_A_DIRECTORY',
  'NOT_A_FILE',
  'ALREADY_EXISTS',
  'PARENT_NOT_FOUND',
  'DIRECTORY_NOT_EMPTY',
  'ESCAPE_ATTEMPT',
  // Entity errors
  'ENTITY_NOT_FOUND',
  'DUPLICATE_ENTITY',
  'INVALID_ENTITY',
  // Argument errors
  'MISSING_ARGUMENT',
  'INVALID_ARGUMENT',
  'UNKNOWN_SUBCOMMAND',
  // Operation errors
  'OPERATION_FAILED',
  'NOT_SUPPORTED',
  'PERMISSION_DENIED',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const commandErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});

export type CommandError = z.infer<typeof commandErrorSchema>;

export const commandResultSchema = z
  .object({
    success: z.boolean(),
    data: z.unknown().optional(),
    message: z.string().optional(),
    error: commandErrorSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.success && !val.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CommandResult with success=false must include an error',
      });
    }
  });

export type CommandResult<T = unknown> = Omit<
  z.infer<typeof commandResultSchema>,
  'data'
> & { data?: T };

export interface CommandOptions {
  /** Suppress terminal output (useful for programmatic calls). */
  silent?: boolean;
  /** Output structured JSON to the terminal (when supported). */
  json?: boolean;
}

export type CommandExecutionResult =
  | void
  | CommandResult
  | Promise<void | CommandResult>;

export interface SubcommandDef {
  description: string;
  usage: string;
  execute: (
    args: string[],
    context: CliContext,
    options?: CommandOptions
  ) => CommandExecutionResult;
}

/**
 * Command definition (enhanced).
 */
export interface Command {
  name: string;
  description: string;
  usage: string;

  /**
   * Execute the command. For interactive CLI usage, commands typically call
   * context.addOutput(). For programmatic usage, commands can return a structured
   * CommandResult and optionally suppress output via options.silent.
   */
  execute: (
    args: string[],
    context: CliContext,
    options?: CommandOptions
  ) => CommandExecutionResult;

  /** Optional: validate arguments before execution. */
  validate?: (args: string[], context: CliContext) => CommandError | null;

  /** Optional: command supports JSON output mode (`--json` / `-j` or options.json). */
  supportsJson?: boolean;

  /** Optional: compound commands can expose subcommands for help and dispatch. */
  subcommands?: Record<string, SubcommandDef>;
}

/**
 * Parsed CLI arguments
 */
export interface ParsedArgs {
  positional: string[];
  options: Record<string, string | boolean>;
}
