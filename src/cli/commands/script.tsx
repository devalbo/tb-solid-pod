import { Box, Text } from 'ink';
import type { Command, CommandResult } from '../types';
import { STORE_TABLES } from '../../storeLayout';
import { parseCliArgs, getOptionBoolean, hasJsonFlag } from '../parse-args';
import { executeCommandLine } from '../executor';

type ScriptRow = {
  script?: string;
  createdAt?: string;
  updatedAt?: string;
};

const usage = `script <subcommand> [options]

Subcommands:
  list                          List saved scripts
  show <name>                   Show a script
  save <name> <command...>      Save (replace) a script with a single command line
  append <name> <command...>    Append a command line to a script
  delete <name>                 Delete a script
  run <name> [--continue]       Run the script line-by-line (stop on error unless --continue)

Notes:
  - Scripts store newline-delimited command lines.
  - The CLI does not do shell-style quoting; scripts replay exactly what was saved.

Examples:
  script save bootstrap touch notes.txt
  script append bootstrap mkdir docs
  script run bootstrap
  script run bootstrap --continue
`;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeName(name: string): string {
  return name.trim();
}

function getRow(store: import('tinybase').Store, name: string): ScriptRow | undefined {
  return store.getRow(STORE_TABLES.CLI_SCRIPTS, name) as ScriptRow | undefined;
}

function setRow(store: import('tinybase').Store, name: string, row: ScriptRow) {
  // TinyBase Row cells cannot be `undefined`; omit missing fields.
  const r: Record<string, string> = {};
  if (row.script != null) r.script = row.script;
  if (row.createdAt != null) r.createdAt = row.createdAt;
  if (row.updatedAt != null) r.updatedAt = row.updatedAt;
  store.setRow(STORE_TABLES.CLI_SCRIPTS, name, r);
}

function delRow(store: import('tinybase').Store, name: string) {
  store.delRow(STORE_TABLES.CLI_SCRIPTS, name);
}

function splitScript(script: string): string[] {
  return script
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

export const scriptCommand: Command = {
  name: 'script',
  description: 'Save and run repeatable command scripts',
  usage,
  supportsJson: true,
  execute: async (args, context, options) => {
    const { store, addOutput } = context;
    const sub = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    const { options: cmdOptions } = parseCliArgs(args);
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    if (!sub || sub === 'help') {
      if (!options?.silent) addOutput(<Text>{usage}</Text>);
      return { success: true };
    }

    if (sub === 'list') {
      const table = store.getTable(STORE_TABLES.CLI_SCRIPTS) || {};
      const names = Object.keys(table).sort((a, b) => a.localeCompare(b));
      const result: CommandResult<{ count: number; names: string[] }> = {
        success: true,
        data: { count: names.length, names },
      };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        return result;
      }
      if (!options?.silent) {
        if (names.length === 0) {
          addOutput(<Text dimColor>(no scripts saved)</Text>);
        } else {
          addOutput(
            <Box flexDirection="column">
              <Text color="cyan" bold>Scripts</Text>
              {names.map((n) => (
                <Text key={n}>{n}</Text>
              ))}
            </Box>
          );
        }
      }
      return result;
    }

    if (sub === 'show') {
      const name = normalizeName(subArgs[0] ?? '');
      if (!name) {
        const msg = 'script show: missing name';
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
      }
      const row = getRow(store, name);
      if (!row) {
        const msg = `script show: not found: ${name}`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
      }
      const script = row.script ?? '';
      const lines = splitScript(script);
      const result: CommandResult<{ name: string; script: string; lines: string[] }> = {
        success: true,
        data: { name, script, lines },
      };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        return result;
      }
      if (!options?.silent) {
        addOutput(
          <Box flexDirection="column">
            <Text color="cyan" bold>{name}</Text>
            {lines.length === 0 ? <Text dimColor>(empty)</Text> : lines.map((l, i) => <Text key={i}>{l}</Text>)}
          </Box>
        );
      }
      return result;
    }

    if (sub === 'save' || sub === 'append') {
      const name = normalizeName(subArgs[0] ?? '');
      const line = subArgs.slice(1).join(' ').trim();
      if (!name) {
        const msg = `script ${sub}: missing name`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
      }
      if (!line) {
        const msg = `script ${sub}: missing command line`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
      }

      const existing = getRow(store, name);
      const now = nowIso();
      const prevScript = existing?.script ?? '';
      const nextScript =
        sub === 'save'
          ? line
          : [prevScript.trimEnd(), line].filter(Boolean).join('\n');

      setRow(store, name, {
        script: nextScript,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      const result: CommandResult<{ name: string; saved: true; lineCount: number }> = {
        success: true,
        data: { name, saved: true, lineCount: splitScript(nextScript).length },
      };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        return result;
      }
      if (!options?.silent) {
        addOutput(
          <Text color="green">
            {sub === 'save' ? 'Saved' : 'Appended'} script: {name}
          </Text>,
          'success',
          `${sub === 'save' ? 'Saved' : 'Appended'} script: ${name}`
        );
      }
      return result;
    }

    if (sub === 'delete') {
      const name = normalizeName(subArgs[0] ?? '');
      if (!name) {
        const msg = 'script delete: missing name';
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
      }
      const row = getRow(store, name);
      if (!row) {
        const msg = `script delete: not found: ${name}`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
      }
      delRow(store, name);
      const result: CommandResult<{ name: string; deleted: true }> = { success: true, data: { name, deleted: true } };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        return result;
      }
      if (!options?.silent) addOutput(<Text color="green">Deleted script: {name}</Text>, 'success', `Deleted script: ${name}`);
      return result;
    }

    if (sub === 'run') {
      const { options: runOpts } = parseCliArgs(subArgs);
      const name = normalizeName(subArgs[0] ?? '');
      const shouldContinue = getOptionBoolean(runOpts, 'continue') || getOptionBoolean(runOpts, 'c');

      if (!name) {
        const msg = 'script run: missing name';
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
      }

      const row = getRow(store, name);
      if (!row) {
        const msg = `script run: not found: ${name}`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
      }

      const lines = splitScript(row.script ?? '');
      if (lines.length === 0) {
        const result: CommandResult<{ name: string; ran: true; count: number; failures: number }> = {
          success: true,
          data: { name, ran: true, count: 0, failures: 0 },
        };
        if (jsonMode) {
          if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
          return result;
        }
        if (!options?.silent) addOutput(<Text dimColor>(script is empty)</Text>);
        return result;
      }

      let failures = 0;
      for (const line of lines) {
        const res = await executeCommandLine(line, context, { silent: options?.silent });
        if (!res.success) {
          failures++;
          if (!shouldContinue) break;
        }
      }

      const result: CommandResult<{ name: string; ran: true; count: number; failures: number }> = {
        success: failures === 0,
        ...(failures === 0
          ? { data: { name, ran: true, count: lines.length, failures } }
          : { data: { name, ran: true, count: lines.length, failures }, error: { code: 'OPERATION_FAILED', message: `${failures} command(s) failed` } }),
      };

      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
        return result;
      }

      if (!options?.silent) {
        if (failures === 0) {
          addOutput(<Text color="green">Ran script: {name} ({lines.length} commands)</Text>, 'success', `Ran script: ${name}`);
        } else {
          addOutput(<Text color="red">Script failed: {name} ({failures} failures)</Text>, 'error', `Script failed: ${name}`);
        }
      }
      return result;
    }

    const msg = `script: unknown subcommand: ${sub}`;
    if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
    return { success: false, error: { code: 'UNKNOWN_SUBCOMMAND', message: msg } };
  },
};

