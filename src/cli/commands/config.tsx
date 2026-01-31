import { Box, Text } from 'ink';
import type { Command, CliContext } from '../types';
import {
  SETTINGS_META,
  SETTINGS_DEFAULTS,
  getSetting,
  setSetting,
  resetAllSettings,
  resetSetting,
  parseSettingValue,
  formatSettingValue,
  isValidSettingsKey,
  getSettingsKeys,
  type SettingsKey,
} from '../../utils/settings';

/**
 * config list - Show all settings
 */
const listSubcommand = (_args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const keys = getSettingsKeys();

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan" bold>Settings</Text>
      {keys.map((key) => {
        const meta = SETTINGS_META[key];
        const currentValue = store.getValue(key);
        const defaultValue = SETTINGS_DEFAULTS[key];
        const isDefault = currentValue === undefined;

        return (
          <Box key={key} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold>{key}</Text>
              {meta.type === 'enum' && meta.options && (
                <Text dimColor> [{meta.options.join(' | ')}]</Text>
              )}
            </Box>
            <Text dimColor>{meta.description}</Text>
            <Box>
              <Text dimColor>Value: </Text>
              <Text color={isDefault ? 'gray' : 'green'}>
                {formatSettingValue(currentValue ?? defaultValue)}
              </Text>
              {isDefault && (
                <Text dimColor> (default)</Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * config get - Get a setting value
 */
const getSubcommand = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const key = args[0];

  if (!key) {
    addOutput(
      <Text color="red">config get: missing key argument</Text>,
      'error'
    );
    return;
  }

  if (!isValidSettingsKey(key)) {
    addOutput(
      <Text color="red">
        config get: unknown setting: {key}
        {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
      </Text>,
      'error'
    );
    return;
  }

  const value = getSetting(store, key as SettingsKey);
  const meta = SETTINGS_META[key as SettingsKey];
  const isDefault = store.getValue(key) === undefined;

  addOutput(
    <Box flexDirection="column">
      <Text bold>{key}</Text>
      <Text dimColor>{meta.description}</Text>
      <Box>
        <Text dimColor>Value: </Text>
        <Text color={isDefault ? 'gray' : 'green'}>{formatSettingValue(value)}</Text>
        {isDefault && <Text dimColor> (default)</Text>}
      </Box>
      {meta.type === 'enum' && meta.options && (
        <Box marginTop={1}>
          <Text dimColor>Options: </Text>
          <Text dimColor>{meta.options.join(', ')}</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * config set - Set a setting value
 */
const setSubcommand = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const key = args[0];
  const valueStr = args.slice(1).join(' ');

  if (!key) {
    addOutput(<Text color="red">config set: missing key argument</Text>, 'error');
    return;
  }

  if (!valueStr) {
    addOutput(<Text color="red">config set: missing value argument</Text>, 'error');
    return;
  }

  if (!isValidSettingsKey(key)) {
    addOutput(
      <Text color="red">
        config set: unknown setting: {key}
        {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
      </Text>,
      'error'
    );
    return;
  }

  const meta = SETTINGS_META[key as SettingsKey];
  const parsedValue = parseSettingValue(key as SettingsKey, valueStr);

  if (parsedValue === null) {
    let errorMsg = `config set: invalid value for ${key}`;
    if (meta.type === 'number') {
      errorMsg += ' (expected a number)';
    } else if (meta.type === 'boolean') {
      errorMsg += ' (expected true/false)';
    } else if (meta.type === 'enum' && meta.options) {
      errorMsg += ` (expected one of: ${meta.options.join(', ')})`;
    }
    addOutput(<Text color="red">{errorMsg}</Text>, 'error');
    return;
  }

  setSetting(store, key as SettingsKey, parsedValue as never);

  addOutput(
    <Text color="green">
      Set {key} = {formatSettingValue(parsedValue)}
    </Text>,
    'success'
  );
};

/**
 * config reset - Reset settings to defaults
 */
const resetSubcommand = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const key = args[0];

  if (key) {
    if (!isValidSettingsKey(key)) {
      addOutput(
        <Text color="red">
          config reset: unknown setting: {key}
          {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
        </Text>,
        'error'
      );
      return;
    }

    resetSetting(store, key as SettingsKey);
    const defaultValue = SETTINGS_DEFAULTS[key as SettingsKey];

    addOutput(
      <Text color="green">
        Reset {key} to default ({formatSettingValue(defaultValue)})
      </Text>,
      'success'
    );
  } else {
    resetAllSettings(store);
    addOutput(
      <Text color="green">All settings have been reset to defaults</Text>,
      'success'
    );
  }
};

/**
 * config command - Settings and preferences management
 */
export const configCommand: Command = {
  name: 'config',
  description: 'Settings and preferences management',
  usage: `config <subcommand> [options]

Subcommands:
  list                     Show all settings with current values
  get <key>                Get value of a specific setting
  set <key> <value>        Set a setting value
  reset [key]              Reset setting(s) to defaults

Available Settings:
  defaultPersonaId         Default persona for authoring content
  theme                    Color theme (light | dark | system)
  cliHistorySize           Number of CLI commands to keep in history
  autoSaveInterval         Auto-save interval in ms (0 = disabled)
  showHiddenFiles          Show hidden files in browser (true | false)
  defaultContentType       Default MIME type for new files

Examples:
  config list
  config get theme
  config set theme dark
  config set cliHistorySize 50
  config reset theme
  config reset`,
  execute: (args, context) => {
    const subcommand = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    if (!subcommand || subcommand === 'help') {
      context.addOutput(<Text>{configCommand.usage}</Text>);
      return;
    }

    switch (subcommand) {
      case 'list':
        return listSubcommand(subArgs, context);
      case 'get':
        return getSubcommand(subArgs, context);
      case 'set':
        return setSubcommand(subArgs, context);
      case 'reset':
        return resetSubcommand(subArgs, context);
      default:
        context.addOutput(
          <Text color="red">
            config: unknown subcommand: {subcommand}. Type "config help" for usage.
          </Text>,
          'error'
        );
    }
  },
};
