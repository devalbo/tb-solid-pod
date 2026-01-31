import React from 'react';
import { Text } from 'ink';
import type { Command, CliContext } from './types';
import {
  helpCommand,
  clearCommand,
  pwdCommand,
  cdCommand,
  lsCommand,
  catCommand,
  touchCommand,
  mkdirCommand,
  rmCommand,
  exportCommand,
  importCommand,
  personaCommand,
  contactCommand,
  groupCommand,
  fileCommand,
  configCommand,
  typeindexCommand,
  exitCommand,
} from './commands';

/**
 * Command registry - all available commands
 */
export const commands: Record<string, Command> = {
  help: helpCommand,
  clear: clearCommand,
  pwd: pwdCommand,
  cd: cdCommand,
  ls: lsCommand,
  cat: catCommand,
  touch: touchCommand,
  mkdir: mkdirCommand,
  rm: rmCommand,
  export: exportCommand,
  import: importCommand,
  persona: personaCommand,
  contact: contactCommand,
  group: groupCommand,
  file: fileCommand,
  config: configCommand,
  typeindex: typeindexCommand,
  exit: exitCommand,
};

/**
 * Execute a command from input string
 */
export const executeCommand = (
  input: string,
  context: CliContext
): void | Promise<void> => {
  const trimmed = input.trim();
  if (!trimmed) return;

  const [cmdName, ...args] = trimmed.split(/\s+/);
  const command = commands[cmdName.toLowerCase()];

  if (!command) {
    context.addOutput(
      <Text color="red">
        Unknown command: {cmdName}. Type "help" for available commands.
      </Text>,
      'error'
    );
    return;
  }

  try {
    const result = command.execute(args, { ...context, commands });
    if (result instanceof Promise) {
      return result.catch((err) => {
        context.addOutput(
          <Text color="red">Error: {err.message}</Text>,
          'error'
        );
      });
    }
  } catch (err) {
    context.addOutput(
      <Text color="red">
        Error: {err instanceof Error ? err.message : String(err)}
      </Text>,
      'error'
    );
  }
};
