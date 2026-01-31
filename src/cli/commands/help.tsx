import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../types';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands or help for a specific command',
  usage: 'help [command]',
  execute: (args, context) => {
    const { commands, addOutput } = context;
    const cmdName = args[0]?.toLowerCase();

    if (cmdName) {
      const cmd = commands[cmdName];
      if (!cmd) {
        addOutput(
          <Text color="red">Unknown command: {cmdName}</Text>,
          'error'
        );
        return;
      }

      const plainText = `${cmd.name}\n${cmd.description}\nUsage: ${cmd.usage}`;
      addOutput(
        <Box flexDirection="column">
          <Text color="cyan" bold>{cmd.name}</Text>
          <Text>{cmd.description}</Text>
          <Text dimColor>Usage: {cmd.usage}</Text>
        </Box>,
        undefined,
        plainText
      );
      return;
    }

    const cmdList = Object.values(commands).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const plainLines = ['Available Commands:', ...cmdList.map((c) => `${c.name} ${c.description}`), 'Type "help <command>" for more details on a specific command.'];
    addOutput(
      <Box flexDirection="column">
        <Text color="cyan" bold>Available Commands:</Text>
        {cmdList.map((cmd) => (
          <Box key={cmd.name}>
            <Text color="yellow">{cmd.name}</Text>
            <Text> </Text>
            <Text dimColor>{cmd.description}</Text>
          </Box>
        ))}
        <Text dimColor>Type "help {'<command>'}" for more details on a specific command.</Text>
      </Box>,
      undefined,
      plainLines.join('\n')
    );
  },
};
