import React from 'react';
import type { Command, CliContext } from '../types';
import {
  SETTINGS_KEYS,
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
const listSubcommand = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const keys = getSettingsKeys();

  addOutput(
    <div style={{ fontFamily: 'monospace', lineHeight: 1.8 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, color: '#4ecdc4' }}>
        Settings
      </div>
      {keys.map((key) => {
        const meta = SETTINGS_META[key];
        const currentValue = store.getValue(key);
        const defaultValue = SETTINGS_DEFAULTS[key];
        const isDefault = currentValue === undefined;

        return (
          <div key={key} style={{ marginBottom: 12 }}>
            <div>
              <span style={{ color: '#f8f8f2', fontWeight: 500 }}>{key}</span>
              {meta.type === 'enum' && meta.options && (
                <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                  [{meta.options.join(' | ')}]
                </span>
              )}
            </div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
              {meta.description}
            </div>
            <div>
              <span style={{ color: '#666' }}>Value: </span>
              <span style={{ color: isDefault ? '#666' : '#2ecc71' }}>
                {formatSettingValue(currentValue ?? defaultValue)}
              </span>
              {isDefault && (
                <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                  (default)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
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
      <span style={{ color: '#ff6b6b' }}>config get: missing key argument</span>,
      'error'
    );
    return;
  }

  if (!isValidSettingsKey(key)) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        config get: unknown setting: {key}
        {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
      </span>,
      'error'
    );
    return;
  }

  const value = getSetting(store, key as SettingsKey);
  const meta = SETTINGS_META[key as SettingsKey];
  const isDefault = store.getValue(key) === undefined;

  addOutput(
    <div style={{ fontFamily: 'monospace' }}>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#f8f8f2', fontWeight: 500 }}>{key}</span>
      </div>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
        {meta.description}
      </div>
      <div>
        <span style={{ color: '#666' }}>Value: </span>
        <span style={{ color: isDefault ? '#666' : '#2ecc71' }}>
          {formatSettingValue(value)}
        </span>
        {isDefault && (
          <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
            (default)
          </span>
        )}
      </div>
      {meta.type === 'enum' && meta.options && (
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#666' }}>Options: </span>
          <span style={{ color: '#888' }}>{meta.options.join(', ')}</span>
        </div>
      )}
    </div>
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
    addOutput(
      <span style={{ color: '#ff6b6b' }}>config set: missing key argument</span>,
      'error'
    );
    return;
  }

  if (!valueStr) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>config set: missing value argument</span>,
      'error'
    );
    return;
  }

  if (!isValidSettingsKey(key)) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        config set: unknown setting: {key}
        {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
      </span>,
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
    addOutput(
      <span style={{ color: '#ff6b6b' }}>{errorMsg}</span>,
      'error'
    );
    return;
  }

  setSetting(store, key as SettingsKey, parsedValue as never);

  addOutput(
    <span style={{ color: '#2ecc71' }}>
      Set {key} = {formatSettingValue(parsedValue)}
    </span>,
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
    // Reset single setting
    if (!isValidSettingsKey(key)) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>
          config reset: unknown setting: {key}
          {'\n\n'}Valid keys: {getSettingsKeys().join(', ')}
        </span>,
        'error'
      );
      return;
    }

    resetSetting(store, key as SettingsKey);
    const defaultValue = SETTINGS_DEFAULTS[key as SettingsKey];

    addOutput(
      <span style={{ color: '#2ecc71' }}>
        Reset {key} to default ({formatSettingValue(defaultValue)})
      </span>,
      'success'
    );
  } else {
    // Reset all settings
    resetAllSettings(store);

    addOutput(
      <span style={{ color: '#2ecc71' }}>
        All settings have been reset to defaults
      </span>,
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
      context.addOutput(
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {configCommand.usage}
        </pre>
      );
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
          <span style={{ color: '#ff6b6b' }}>
            config: unknown subcommand: {subcommand}. Type "config help" for usage.
          </span>,
          'error'
        );
    }
  },
};
