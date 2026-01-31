import React from 'react';
import { Text } from 'ink';
import {
  commandResultSchema,
  type CliContext,
  type Command,
  type CommandError,
  type CommandOptions,
  type CommandResult,
} from './types';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function extractJsonFlag(args: string[]): { args: string[]; json: boolean } {
  let json = false;
  const cleaned: string[] = [];

  for (const a of args) {
    if (a === '--json' || a === '-j') {
      json = true;
      continue;
    }
    if (a.startsWith('--json=')) {
      const v = a.slice('--json='.length).toLowerCase();
      json = v === '' || v === '1' || v === 'true' || v === 'yes';
      continue;
    }
    cleaned.push(a);
  }

  return { args: cleaned, json };
}

function printError(context: CliContext, message: string, options?: CommandOptions) {
  if (options?.silent) return;
  context.addOutput(React.createElement(Text, { color: 'red' }, message), 'error', message);
}

function coerceCommandResult(
  raw: unknown
): { ok: true; result: CommandResult } | { ok: false; error: CommandError } {
  const parsed = commandResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'OPERATION_FAILED',
        message: 'Command returned an invalid result shape',
        details: parsed.error.flatten(),
      },
    };
  }
  return { ok: true, result: parsed.data };
}

/**
 * Execute a command line (e.g. `ls /docs --json`) and return a structured result.
 *
 * Commands may still be "output-only" (return void); those are treated as success.
 */
export async function executeCommandLine(
  input: string,
  context: CliContext,
  options?: CommandOptions
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) return { success: true, message: '' };

  const [cmdNameRaw, ...rawArgs] = trimmed.split(/\s+/);
  const cmdName = (cmdNameRaw ?? '').toLowerCase();

  const command: Command | undefined = context.commands[cmdName];
  if (!command) {
    const error: CommandError = {
      code: 'INVALID_ARGUMENT',
      message: `Unknown command: ${cmdNameRaw}`,
    };
    printError(
      context,
      `Unknown command: ${cmdNameRaw}. Type "help" for available commands.`,
      options
    );
    return { success: false, error };
  }

  // Apply --json / -j only for commands that opt-in.
  const { args, json } = command.supportsJson
    ? extractJsonFlag(rawArgs)
    : { args: rawArgs, json: false };

  const effectiveOptions: CommandOptions = {
    ...options,
    ...(command.supportsJson ? { json: options?.json ?? json } : null),
  };

  // Validation hook
  if (command.validate) {
    const err = command.validate(args, context);
    if (err) {
      printError(context, err.message, effectiveOptions);
      return { success: false, error: err };
    }
  }

  try {
    const res = await command.execute(args, context, effectiveOptions);
    if (res && typeof res === 'object' && 'success' in res) {
      const coerced = coerceCommandResult(res);
      if (!coerced.ok) {
        printError(context, coerced.error.message, effectiveOptions);
        return { success: false, error: coerced.error };
      }
      return coerced.result;
    }
    return { success: true };
  } catch (err) {
    const error: CommandError = { code: 'OPERATION_FAILED', message: toErrorMessage(err) };
    printError(context, `Error: ${error.message}`, effectiveOptions);
    return { success: false, error };
  }
}

/**
 * Execute a command by name with argument array.
 */
export async function exec(
  command: string,
  args: string[],
  context: CliContext,
  options?: CommandOptions
): Promise<CommandResult> {
  const input = [command, ...args].join(' ');
  return executeCommandLine(input, context, options);
}

