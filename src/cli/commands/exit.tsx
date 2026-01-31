import React from 'react';
import { Text } from 'ink';
import type { Command } from '../types';

/**
 * exit - Quit the CLI (Node only). In browser, shows a message.
 */
export const exitCommand: Command = {
  name: 'exit',
  description: 'Exit the CLI (Node terminal only)',
  usage: 'exit',
  execute: (_args, context) => {
    const { addOutput, exit } = context;
    if (exit) {
      exit();
      return;
    }
    addOutput(
      <Text dimColor>
        Exit is only available when running the CLI in a terminal (npm run cli).
      </Text>
    );
  },
};
