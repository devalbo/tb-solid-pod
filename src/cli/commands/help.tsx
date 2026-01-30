import type { Command } from '../types';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands or help for a specific command',
  usage: 'help [command]',
  execute: (args, context) => {
    const { commands, addOutput } = context;
    const cmdName = args[0]?.toLowerCase();

    if (cmdName) {
      // Show help for specific command
      const cmd = commands[cmdName];
      if (!cmd) {
        addOutput(
          <span style={{ color: '#ff6b6b' }}>Unknown command: {cmdName}</span>,
          'error'
        );
        return;
      }

      addOutput(
        <div>
          <div style={{ color: '#4ecdc4', fontWeight: 'bold' }}>{cmd.name}</div>
          <div style={{ marginLeft: 16 }}>{cmd.description}</div>
          <div style={{ marginLeft: 16, color: '#888' }}>Usage: {cmd.usage}</div>
        </div>
      );
      return;
    }

    // Show all commands
    const cmdList = Object.values(commands).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    addOutput(
      <div>
        <div style={{ color: '#4ecdc4', fontWeight: 'bold', marginBottom: 8 }}>
          Available Commands:
        </div>
        {cmdList.map((cmd) => (
          <div key={cmd.name} style={{ marginLeft: 16, marginBottom: 4 }}>
            <span style={{ color: '#f9ca24', minWidth: 80, display: 'inline-block' }}>
              {cmd.name}
            </span>
            <span style={{ color: '#888' }}>{cmd.description}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, color: '#666' }}>
          Type "help {'<command>'}" for more details on a specific command.
        </div>
      </div>
    );
  },
};
