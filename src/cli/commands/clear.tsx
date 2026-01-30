import type { Command } from '../types';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear the terminal output',
  usage: 'clear',
  execute: (_args, context) => {
    context.clearOutput();
  },
};
